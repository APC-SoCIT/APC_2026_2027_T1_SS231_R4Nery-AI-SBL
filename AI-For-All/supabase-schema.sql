-- SQL Schema for AI for ALL
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- Execute sections in order: stories → profiles → user_progress → account_audit_log

-- ─── Stories ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Starter',
  type TEXT NOT NULL DEFAULT 'choices_only', -- 'choices_only' | 'with_activity'
  status TEXT NOT NULL DEFAULT 'Published',  -- 'Draft' | 'Published'
  description TEXT,
  color TEXT DEFAULT '#79a8ff',
  image TEXT,
  skills_build_url TEXT,
  skills_build_button_text TEXT,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access on stories" ON stories
  FOR ALL USING (true);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- One row per auth.users row. Stores app-specific fields (name, role).
-- Created automatically by the handle_new_user trigger below.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       VARCHAR(255),
  role       VARCHAR(20) NOT NULL DEFAULT 'guest', -- 'guest' | 'user' | 'facilitator' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create a profile row whenever Supabase creates a new auth.users row.
-- Covers anonymous sign-in, email signup, AND Google signup alike.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'guest'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── User Progress ────────────────────────────────────────────────────────────
-- Keyed directly on auth.users.id so guest progress is preserved on upgrade.

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_modules TEXT[]  DEFAULT '{}',
  total_points      INTEGER DEFAULT 0,
  unlocked_badges   JSONB   DEFAULT '[]',
  claimed_rewards   TEXT[]  DEFAULT '{}',
  selected_persona  VARCHAR(20),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress"
  ON public.user_progress FOR ALL USING (auth.uid() = user_id);

-- ─── Account Audit Log ────────────────────────────────────────────────────────
-- Written only by server-side routes using the service role.

CREATE TABLE IF NOT EXISTS public.account_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     VARCHAR(50) NOT NULL, -- 'login' | 'profile_update' | 'password_change' | 'link_identity' | 'deactivate' | 'delete'
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;
-- No user-facing SELECT policy — written exclusively by service-role routes.
