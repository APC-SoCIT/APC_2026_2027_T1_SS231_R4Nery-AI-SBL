# Supabase Project Setup — AI for ALL

Follow these steps **once** before Phase 0 can be marked complete. All steps are in the [Supabase Dashboard](https://supabase.com/dashboard) unless otherwise noted.

---

## 1. Create the Project

1. Sign in to Supabase → **New project**
2. Name it `ai-for-all`, choose the closest region (Singapore for PH latency)
3. Set a strong database password and save it securely

---

## 2. Copy Environment Variables

Go to **Project Settings → API** and copy:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (keep secret!) |

Paste into `AI-For-All/.env.local` (already gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 3. Enable Anonymous Sign-ins

**Authentication → Settings → Anonymous sign-ins** → toggle **ON**

---

## 4. Configure Phone (SMS) Provider — ⚠️ Resolve Open Question #1 first

**Authentication → Providers → Phone** → toggle **ON**

Choose a provider and enter credentials:

| Provider | PH Coverage notes |
|---|---|
| Twilio | Excellent PH coverage; confirm `+63` long-code or short-code |
| Vonage (Nexmo) | Good PH coverage |
| MessageBird | Good PH coverage |
| TextLocal | Check PH availability — primarily UK/India |

Set in the Supabase phone provider form:
- **OTP expiry** — recommended: `300` seconds (5 min) — *resolve Q3 with team*
- **SMS template** — default is fine; can customise in Auth → SMS Templates

---

## 5. Configure Google OAuth Provider — ⚠️ Need Google Cloud Console credentials

**Authentication → Providers → Google** → toggle **ON**

### Steps to get credentials:
1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create **OAuth 2.0 Client ID** (Web application)
3. Add to **Authorised redirect URIs**:
   ```
   https://xxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
4. Copy **Client ID** and **Client Secret** → paste into Supabase Google provider form

---

## 6. Enable Manual Identity Linking — ⚠️ Resolve Open Question #2 first

**Authentication → Settings → User Identity** → **Enable manual linking** → toggle **ON**

Required for:
- Guest → Google upgrade (`linkIdentity`)
- Existing phone user adding Google sign-in (`linkIdentity`)

---

## 7. Run Database Migrations

Open **SQL Editor** in Supabase and run each block:

### Block 1 — profiles table

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  role          VARCHAR(20) NOT NULL DEFAULT 'guest',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

### Block 2 — handle_new_user trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'guest'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Block 3 — user_progress table

```sql
CREATE TABLE public.user_progress (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_modules TEXT[] DEFAULT '{}',
  total_points      INTEGER DEFAULT 0,
  unlocked_badges   JSONB DEFAULT '[]',
  claimed_rewards   TEXT[] DEFAULT '{}',
  selected_persona  VARCHAR(20),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR ALL USING (auth.uid() = user_id);
```

### Block 4 — account_audit_log table

```sql
CREATE TABLE public.account_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        VARCHAR(50) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;
-- Written only by server-side routes using the service role key
```

---

## 8. Configure Redirect URLs

**Authentication → URL Configuration:**

| Setting | Value |
|---|---|
| Site URL | `https://yourdomain.com` (or `http://localhost:3000` for dev) |
| Redirect URLs (whitelist) | `https://yourdomain.com/auth/callback`, `http://localhost:3000/auth/callback` |

---

## Phase 0 Checklist

- [ ] Project created, environment variables in `.env.local`
- [ ] Anonymous sign-ins enabled
- [ ] SMS provider configured with PH coverage (Q1 resolved)
- [ ] Google OAuth provider configured (Client ID + Secret)
- [ ] Manual linking enabled (Q2 resolved)
- [ ] All 4 SQL blocks executed successfully
- [ ] Redirect URLs configured
- [ ] `pnpm dev` starts without Supabase-related errors
