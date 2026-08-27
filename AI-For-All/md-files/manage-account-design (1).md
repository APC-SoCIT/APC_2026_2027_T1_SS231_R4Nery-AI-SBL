# Manage Account Module — Technical Design Document

**Project:** AI for ALL (SM Booknook)
**Module:** Manage Account
**Stack:** Next.js (App Router) · React · TypeScript · Vanilla CSS Modules · **Supabase (Auth + Postgres, single backend)**
**Auth methods:** (1) Philippine mobile number + password, confirmed via SMS OTP, and (2) Google/Gmail sign-in
**Author:** Design Draft — Pending Review
**Status:** 🔵 AWAITING APPROVAL — Do not implement until approved.

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Entity & Data Models](#4-entity--data-models)
5. [Supabase Calls & API Endpoints](#5-supabase-calls--api-endpoints)
6. [State Management — Guest-to-User Conversion](#6-state-management--guest-to-user-conversion)
7. [Authentication Strategy](#7-authentication-strategy)
8. [Password Reset & Account Linking Flows](#8-password-reset--account-linking-flows)
9. [Notification Strategy (SMS + Google)](#9-notification-strategy-sms--google)
10. [Security Considerations](#10-security-considerations)
11. [Phased Implementation Plan](#11-phased-implementation-plan)
12. [Error Code Reference](#12-error-code-reference)
13. [User Story Traceability](#13-user-story-traceability)
14. [Open Questions](#14-open-questions)

---

## 1. Overview & Scope

This document defines the full technical plan for the **Manage Account** module in the AI for ALL tablet platform. Confirmed team decisions:

1. **Supabase only** — Auth + Postgres, no custom JWT/bcrypt stack.
2. **Two sign-up/sign-in methods, both supported:**
   - **Philippine mobile number + password**, confirmed via a 6-digit **SMS OTP** the user types in.
   - **Google/Gmail sign-in**, via Supabase Auth's Google OAuth provider — Google's own verification stands in for a confirmation step, no OTP needed for this path.
   - No other email/password registration exists — email only enters the system as a side effect of signing in with Google.

The module covers:

- **Guest access** — try a story without registering, via **Supabase anonymous sign-in**
- **Guest-to-registered conversion** — upgrade an anonymous Supabase user to a permanent account via **either** phone/password+OTP **or** Google, without losing progress or changing their user ID
- **Registration & login** — phone/password (SMS OTP) or Google OAuth
- **Confirmations** — SMS OTP for phone signup; Google's own consent/verification for Google signup
- **Profile updates** — Facilitator can edit their own account details, stored in a `profiles` table with Row Level Security (RLS)
- **Password reset** — SMS OTP-based (phone accounts); Google-only accounts can optionally add a password the same way
- **Account deactivation / deletion** — user-initiated, via a secured server route using the Supabase service role
- **Shared-tablet session isolation** — since this runs on a shared tablet device, one guest/user's session must not leak into the next person's

### Out of Scope (this module)
- Story content management (handled by separate Story module)
- Admin/super-admin user management
- Reward redemption logic

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
│                                                          │
│  /app                                                    │
│  ├── /auth              ← Register (phone/Google) / Login │
│  │   └── /auth/verify-otp   ← Enter SMS code (phone path) │
│  ├── /auth/callback     ← Google OAuth callback           │
│  ├── /persona-selection ← Guide picker (post-auth)       │
│  ├── /story/[moduleId]  ← Story playback                 │
│  ├── /account           ← [NEW] Profile management       │
│  │   ├── /account/profile    ← View & edit details       │
│  │   └── /account/security  ← Change password / link accounts │
│  └── /api               ← Next.js Route Handlers (thin)  │
│      ├── /api/account/profile          [GET, PATCH]      │
│      └── /api/account                  [DELETE]          │
│                                                          │
│  /lib                                                    │
│  ├── types.ts                ← Extended with new models  │
│  ├── sessionContext.tsx      ← Extended with auth state  │
│  ├── phoneUtils.ts            ← PH number formatting/validation (E.164, +63) │
│  ├── supabase/client.ts      ← Browser Supabase client   │
│  ├── supabase/server.ts      ← Server Supabase client    │
│  └── supabase/admin.ts       ← Service-role client (server-only, deletion) │
└──────────────────────────────────────────────────────────┘
          │
          ▼ supabase-js SDK (client & server)
┌──────────────────────────────────────────────────────────┐
│                        Supabase                          │
│  ┌────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ Auth       │  │ Postgres        │  │ SMS Provider     │ │
│  │ (GoTrue)   │  │ + Row Level     │  │ (Twilio/Vonage/  │ │
│  │ • phone+pw │  │   Security      │  │  MessageBird —   │ │
│  │ • Google   │  │ • profiles      │  │  connected to    │ │
│  │   OAuth    │  │ • user_progress │  │  Supabase Auth,  │ │
│  │ • anonymous│  │ • account_audit │  │  see §14 Q1)      │ │
│  │   sign-in  │  │   _log          │  │                  │ │
│  └────────────┘  └────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

> **Two independent identity paths, one user table.** Whichever method someone signs up with, they still land in the same `auth.users` table and get the same `profiles`/`user_progress` rows. A phone-only account has `phone` set and `email` null; a Google-only account has `email` set (from Google) and `phone` null. See §10 for what happens if the same person tries both.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | **Supabase only** — Auth + Postgres | Team decision: single service, no custom auth stack |
| Identity methods | **PH mobile number + password (SMS OTP)**, and **Google/Gmail OAuth** | Team decision: cover users who prefer a phone number (common for mall-goers without ready Gmail access) and users who prefer one-tap Google sign-in |
| Confirmation method | **SMS OTP** for phone signups; **Google's own consent screen** for Google signups | No separate email-confirmation flow — Google sign-in is pre-verified by Google |
| SMS delivery | **Third-party SMS gateway wired into Supabase** (Twilio, Vonage, MessageBird, or TextLocal) | Supabase's phone provider needs one of these configured with PH coverage |
| OAuth provider | **Google**, configured as a Supabase Auth provider | No custom OAuth exchange code — Supabase handles the redirect/callback |
| Session/token storage | **`@supabase/ssr` cookie helpers** | HttpOnly cookies managed automatically for Next.js middleware, browser, and server components |
| Guest state | **Supabase anonymous sign-in** (`auth.signInAnonymously()`) | Creates a real `auth.users` row immediately — no separate guest table or data-migration step needed (see §6) |
| Database | **Supabase Postgres**, access via `supabase-js` + RLS policies | Row Level Security replaces most manual `if (userId !== resource.userId)` checks |

---

## 3. User Roles & Permissions

| Role | Description | Capabilities |
|------|-------------|--------------|
| `guest` | Anonymous Supabase user (via `signInAnonymously()`) | Play 1 story, see signup prompt after completion |
| `user` | Registered mall-goer (phone-verified or Google-verified identity) | Save progress, earn badges/rewards, view profile |
| `facilitator` | Staff/content creator | All `user` capabilities + manage stories (future) |
| `admin` | System administrator | Full access (out of scope for this module) |

This is an app-level column (`profiles.role`), not something Supabase Auth tracks natively — RLS policies key off `auth.uid()` plus this column where needed. Role is independent of which identity method was used to sign up.

---

## 4. Entity & Data Models

### 4.1 What Supabase Manages For Us (`auth.users`)

Supabase Auth owns `auth.users` automatically. Depending on how someone signed up:

| Sign-up method | `auth.users.phone` | `auth.users.email` | `auth.users.identities` |
|-----------------|----------------------|-----------------------|----------------------------|
| Phone + password | Set (E.164, e.g. `+639171234567`) | `null` | `phone` identity |
| Google | `null` | Set (from Google profile) | `google` identity |
| Anonymous guest | `null` | `null` | none until upgraded |

### 4.2 App-Specific Tables (`public` schema, our responsibility)

#### `profiles` — one row per `auth.users` row, app-specific fields only

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  role          VARCHAR(20) NOT NULL DEFAULT 'guest', -- 'guest' | 'user' | 'facilitator' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever Supabase creates a new auth.users row
-- (covers anonymous sign-in, phone signup, AND Google signup alike)
CREATE FUNCTION public.handle_new_user()
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

> Google's raw user metadata uses `full_name`, not `name` — the trigger checks both so the display name populates regardless of sign-up method.

#### `user_progress` — keyed directly on `auth.users.id`, unchanged

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

> As before: anonymous sign-in creates a real `auth.users.id`, so guest progress writes straight into `user_progress` and never needs merging after upgrade — true whether the upgrade path is phone or Google (§6).

#### `account_audit_log` — unchanged

```sql
CREATE TABLE public.account_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        VARCHAR(50) NOT NULL, -- 'login', 'profile_update', 'password_change', 'link_identity', 'deactivate', 'delete'
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;
-- Written only by server-side routes using the service role.
```

### 4.3 Updated `UserSession` (client-side context)

```typescript
// lib/types.ts
export interface UserSession {
  sessionId: string;
  userId: string;                // always set — anonymous users have a real Supabase UID too
  isGuest: boolean;               // derived from supabase user.is_anonymous
  authMethod: 'phone' | 'google' | null;  // [NEW] derived from user.identities[0].provider
  phoneVerified: boolean;         // derived from supabase user.phone_confirmed_at
  selectedPath?: AIPath;
  selectedPersona?: Persona;
  completedModules: string[];
  currentProgress?: SessionProgress;
  totalPoints: number;
  unlockedBadges: Badge[];
  claimedRewards: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
}
```

### 4.4 Philippine Mobile Number Format

Unchanged from the phone-only revision: store/submit as E.164 (`+63XXXXXXXXXX`), validate and reformat in `lib/phoneUtils.ts` before calling Supabase, to avoid wasting an SMS send on a malformed number.

---

## 5. Supabase Calls & API Endpoints

### 5.1 Direct Supabase Auth calls (no custom endpoint needed)

| Action | Call |
|--------|------|
| Guest / anonymous access | `supabase.auth.signInAnonymously()` |
| Register (phone/password) | `supabase.auth.signUp({ phone, password, options: { data: { name } } })` — triggers an SMS OTP automatically |
| Register / login with Google | `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })` |
| Upgrade guest → permanent via phone | `supabase.auth.updateUser({ phone, password })` — triggers an SMS OTP |
| Upgrade guest → permanent via Google | `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: '/auth/callback' } })` — requires "manual linking" enabled in Supabase, see §14 Q2 |
| Verify SMS OTP (registration or guest upgrade) | `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` |
| Login (phone/password) | `supabase.auth.signInWithPassword({ phone, password })` |
| Resend OTP | `supabase.auth.resend({ type: 'sms', phone })` |
| Logout (this device) | `supabase.auth.signOut()` |
| Logout (all devices) | `supabase.auth.signOut({ scope: 'global' })` |
| Request password reset OTP (phone accounts) | `supabase.auth.signInWithOtp({ phone })` |
| Set/add a password (phone or Google-only accounts) | `supabase.auth.updateUser({ password })` |
| Get current session/user | `supabase.auth.getUser()` |

### 5.2 Remaining custom Route Handlers

| Method | Endpoint | Why it's not a direct client call |
|--------|----------|-------------------------------------|
| `GET` | `/api/account/profile` | Convenience wrapper — mostly a direct `supabase.from('profiles').select()` client-side under RLS, route optional |
| `PATCH` | `/api/account/profile` | Server-side validation before writing to `profiles` |
| `DELETE` | `/api/account` | **Requires the service role key** — `supabase.auth.admin.deleteUser(userId)` must never run in the browser |

Request/response contracts unchanged from the previous revision (§5.2 examples omitted here for brevity — same shape).

---

## 6. State Management — Guest-to-User Conversion

### 6.1 Flow — Anonymous Sign-In → Upgrade via Phone OR Google

```
1. User clicks "Play as Guest"
   └─► Client: supabase.auth.signInAnonymously()
   └─► Supabase: creates a real auth.users row (is_anonymous = true)
   └─► Trigger: auto-creates matching profiles row (role = 'guest')

2. User plays story, completes module-1
   └─► Client: writes directly to user_progress (upsert), scoped by RLS to auth.uid()

3. SignupPrompt appears after story completion — user picks ONE:

   3a. "Sign up with mobile number"
       └─► Client: supabase.auth.updateUser({ phone, password })
       └─► Supabase sends SMS OTP → user verifies via verifyOtp()
       └─► Phone linked to the SAME user id, is_anonymous → false

   3b. "Sign up with Google"
       └─► Client: supabase.auth.linkIdentity({ provider: 'google' })
       └─► Google consent screen → redirect back to /auth/callback
       └─► Google identity linked to the SAME user id, is_anonymous → false

   Either path: user_progress row is untouched — same UUID, same data, nothing to merge
   └─► Client: SessionContext.isGuest → false, authMethod set accordingly
   └─► Redirect to /persona-selection
```

### 6.2 State Merging Rules — still not needed

Unchanged: because the anonymous user's UUID becomes the permanent user's UUID regardless of which upgrade path is chosen, there's never a second `user_progress` row to reconcile.

---

## 7. Authentication Strategy

### 7.1 Session Handling

Unchanged: Supabase-managed JWTs, `@supabase/ssr` HttpOnly cookies, expiry/refresh configured in the Supabase Dashboard.

### 7.2 Next.js Middleware Guard

```
Protected routes:  /account/*, /api/account/*
Guest-allowed:     /, /story/* (anonymous session is sufficient)
Public:            /auth, /auth/verify-otp, /auth/callback
```

### 7.3 Phone Registration + OTP Verification Flow

```
1. User enters mobile number, password, name on /auth (phone signup mode)
   └─► Client: supabase.auth.signUp({ phone, password, options: { data: { name } } })
   └─► Supabase: creates auth.users row (phone_confirmed_at = null), sends SMS OTP
2. Redirect to /auth/verify-otp
3. User enters the 6-digit code → verifyOtp() → phone_confirmed_at set, session established
4. Trigger creates the matching profiles row
5. Redirect to /persona-selection
```

### 7.4 Google OAuth Flow

```
1. User taps "Continue with Google" on /auth
   └─► Client: supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })
2. Supabase redirects to Google's consent screen (scope: email, profile)
3. Google redirects back to Supabase, then to our /auth/callback?code=...
4. /auth/callback route: supabase.auth.exchangeCodeForSession(code)
5. Supabase upserts the auth.users row automatically:
   - Existing Google identity → logs in
   - Existing phone account, same person tries Google with a different underlying account →
     creates a SEPARATE user unless they deliberately link via account settings (see §10, §14 Q6)
   - New → creates user, email pre-verified via Google, no OTP needed
6. Trigger creates matching profiles row if new
7. Redirect to /persona-selection
```

Google provider (Client ID/Secret, redirect URLs) is configured once in the **Supabase Dashboard → Authentication → Providers**, not in application code.

---

## 8. Password Reset & Account Linking Flows

### 8.1 Password Reset via SMS OTP (phone accounts only)

Unchanged from the phone-only revision:

```
1. User taps "Forgot Password?", enters their mobile number
   └─► Client: supabase.auth.signInWithOtp({ phone })
2. User enters the code on /auth/verify-otp?mode=reset
   └─► Client: supabase.auth.verifyOtp({ phone, token, type: 'sms' })
   └─► This verifies the code AND establishes an authenticated session
3. User is now logged in — shown a "Set new password" form
   └─► Client: supabase.auth.updateUser({ password: newPassword })
```

Google-only accounts don't have a password to reset — they simply sign in with Google again. If they'd like a password as a backup login method, that's the "add a password" flow below, not a reset.

### 8.2 Adding a Password to a Google-Only Account

| Trigger | Action |
|---------|--------|
| Google-only user visits Account Security and wants a backup phone/password login | From the authenticated session: enters a mobile number → OTP verification → `supabase.auth.updateUser({ phone, password })` links both a phone and password to the existing Google-based account |

### 8.3 Linking Google to an Existing Phone Account (or vice versa)

| Trigger | Action |
|---------|--------|
| Phone-account user wants to also enable Google sign-in | From the authenticated session: `supabase.auth.linkIdentity({ provider: 'google' })` |

This requires the same Supabase "manual linking" setting as the guest-upgrade-via-Google path (§14 Q2) — one setting covers both cases.

---

## 9. Notification Strategy (SMS + Google)

### 9.1 Phone Signups

Unchanged: Supabase's phone provider sends the OTP SMS natively (template editable in Supabase Dashboard → Auth → SMS Templates). No separate "welcome" SMS — the OTP verification itself is the confirmation (satisfies US-7).

### 9.2 Google Signups

Google sign-in is pre-verified by Google — there's no OTP or confirmation email to send from Supabase's side. The "registration confirmation" user story (US-7) is satisfied by successfully completing the Google consent flow and landing back in the app.

### 9.3 Notifications Not Tied to Sign-Up

Same recommendation as before: "profile updated" (US-1) and similar in-app-only events should be an **in-app toast**, not a message on either channel — there's no clean equivalent of a templated "profile updated" email/SMS built into Supabase for either provider, and building custom Edge Function messaging for this isn't justified by any current user story.

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Password storage | Handled entirely by Supabase Auth — never touched by our code |
| Token storage | `@supabase/ssr` HttpOnly, Secure, SameSite cookies |
| OTP brute-forcing | Supabase enforces OTP expiry and limited verify attempts — confirm the configured expiry window (§14 Q3) |
| SMS cost / abuse (OTP bombing) | Rate-limit registration and "resend code" client-side; each triggered OTP costs money |
| Row-level access control | RLS policies on `profiles` and `user_progress` — `auth.uid() = id` |
| Service role key | Server-only (`lib/supabase/admin.ts`), never bundled to the client |
| Duplicate accounts across methods | A person could end up with **two separate accounts** — one via phone, one via Google — if they don't deliberately link them. Progress won't merge automatically between the two. Mitigate with clear UI messaging ("Already have an account? Link your Google account from Settings" rather than silently creating a second one) — flagged in §14 Q6 as a product decision, not just a technical one |
| Phone number reuse/porting risk | PH numbers can be recycled after carrier deactivation; SMS-based recovery inherits this general risk, same as any SMS-OTP system |
| Account change traceability | `account_audit_log` written by server-side routes, including `link_identity` events |

### 10.1 Shared-Tablet Considerations

Unchanged from the phone-only revision: idle-timeout triggers `signOut()` + fresh `signInAnonymously()`, "End Session" button always visible, no persistent/remembered sessions on tablet-flagged clients, minors-on-tablet question still open (§14 Q7).

---

## 11. Phased Implementation Plan

Ordered by **who each phase serves**, so the earliest phases ship something a real person on the tablet can actually use, before moving on to the next actor in the user stories.

### Phase 0 — Supabase Project Setup + Providers
**Who this is for:** no one yet — foundational plumbing, nothing user-facing ships in this phase.
- [ ] Create Supabase project, enable **anonymous sign-ins**
- [ ] Configure a third-party SMS provider with confirmed **Philippine mobile delivery** (§14 Q1)
- [ ] Enable the **phone provider**, connect it to the SMS provider, set OTP expiry/resend cooldown
- [ ] Configure the **Google provider** (Client ID/Secret from Google Cloud Console)
- [ ] Decide + enable **manual identity linking** if guest-upgrade-via-Google and cross-method linking (§8.3) are both wanted (§14 Q2)
- [ ] Create `profiles`, `user_progress`, `account_audit_log` tables + RLS policies (§4)
- [ ] Create the `handle_new_user` trigger
- [ ] Set up `lib/supabase/{client,server,admin}.ts`, `lib/phoneUtils.ts`
- [ ] Add `middleware.ts` using `@supabase/ssr`

### Phase 1 — Guest (Mall Goer, not yet registered)
**Who this is for:** a Mall Goer walking up to the tablet who wants to try a story without giving any details (US-6).
- [ ] Wire "Play as Guest" button to `signInAnonymously()`
- [ ] Update `sessionContext.tsx` to read `user.is_anonymous` for `isGuest`
- [ ] Wire story-progress writes to `user_progress` upsert
- [ ] **Deliverable at end of this phase:** a Mall Goer can play a story anonymously and their progress is saved server-side for the duration of their session.

### Phase 2 — Mall Goer → Registered User
**Who this is for:** a Mall Goer who enjoyed the guest experience and wants to save progress / come back later (US-3, US-4, US-5, US-7, US-8), plus anyone registering directly without trying a guest session first.
- [ ] Build `/auth` phone-signup form with PH-number formatting via `phoneUtils.ts`; wire to `signUp({ phone, password })`
- [ ] Build `/auth/verify-otp` → `verifyOtp()`; wire "Resend code" → `resend({ type: 'sms', phone })` with client-side cooldown
- [ ] Implement `/auth/callback` route (`exchangeCodeForSession`); wire "Continue with Google" button to `signInWithOAuth()`
- [ ] Wire `SignupPrompt.tsx` (guest upgrade) to offer BOTH phone (`updateUser`) and Google (`linkIdentity`) paths, per §6.1
- [ ] Wire login form to `signInWithPassword({ phone, password })` and Google sign-in for returning users
- [ ] Wire "Forgot Password?" to `signInWithOtp({ phone })` → `/auth/verify-otp?mode=reset` → `updateUser({ password })`
- [ ] **Deliverable at end of this phase:** a Mall Goer can register (from scratch or by upgrading a guest session) via phone or Google, log back in later, and recover their password — all core "become a user" stories are functional.

### Phase 3 — Facilitator Account Management
**Who this is for:** Facilitators specifically (US-1, US-2, US-7, US-8 as they apply to the Facilitator role) — the underlying auth calls are the same as Phase 2, this phase is about the account-management surface a Facilitator actually uses day to day.
- [ ] Resolve role assignment mechanism — self-selected at registration vs. invite-only (§14 Q — team decision, not yet in Open Questions list, add if unresolved)
- [ ] Build `/account/profile` page — RLS-scoped read, `PATCH /api/account/profile` write for name/details
- [ ] In-app confirmation toast on successful save (US-1)
- [ ] Build `/account/security` — "Add a password" (for Google-only accounts) and "Link Google" / "Link phone number" (§8.2, §8.3)
- [ ] **Deliverable at end of this phase:** a Facilitator can register, log in, update their profile with a save confirmation, and manage linked login methods.

### Phase 4 — Account Deletion & Session Control
**Who this is for:** any registered user or Facilitator who wants to leave, or who's concerned about account security (not a story explicitly requested yet — see §14 Q10 on retention — but standard account-lifecycle coverage).
- [ ] Implement `DELETE /api/account` using the service-role admin client
- [ ] Implement `signOut({ scope: 'global' })` for "log out everywhere"
- [ ] Add `account_audit_log` writes to all account-mutating routes from Phases 2–4

### Phase 5 — Shared-Tablet Session Hardening
**Who this is for:** everyone — Guests, Users, and Facilitators alike, since this tablet is shared and each role's session needs to be cleanly isolated from the next person's.
- [ ] Idle-timeout activity listener in `sessionContext.tsx`, including on `/auth/verify-otp`
- [ ] "End Session" button — always visible, triggers `signOut()` + fresh `signInAnonymously()`
- [ ] QA pass: simulate two consecutive users on one browser instance, confirm zero data leakage

---

## 12. Error Code Reference

| Supabase `error.code` | Meaning | Suggested UI message |
|------------------------|---------|------------------------|
| `invalid_credentials` | Login phone/password mismatch | "Incorrect mobile number or password." |
| `user_already_exists` | Signup phone already registered | "An account with this mobile number already exists." |
| `phone_not_confirmed` | Login blocked pending OTP verification | "Please verify your mobile number first." |
| `otp_expired` | Code entered after the expiry window | "That code has expired. Tap Resend to get a new one." |
| `invalid_otp` / `otp_disabled` | Wrong code / too many failed attempts | "Incorrect code. Please try again." |
| `identity_already_exists` | Google account already linked to a different user | "This Google account is already linked to another profile." |
| `weak_password` | Fails configured password strength policy | "Password doesn't meet the minimum requirements." |
| `over_request_rate_limit` | Too many attempts/resends | "Too many attempts. Please wait a moment before trying again." |
| `sms_send_failed` | Provider failed to deliver the SMS | "We couldn't send a code to that number. Please check it and try again." |
| `session_not_found` / `unauthorized` | Missing/invalid session on a protected route | Redirect to login/guest |

Custom routes (`PATCH /api/account/profile`, `DELETE /api/account`) keep the same shape as before.

---

## 13. User Story Traceability

| # | User Story | Covered By |
|---|-----------|-----------|
| US-1 | As a user, I want confirmation after updating my account | `PATCH /api/account/profile` success response → in-app toast (§9.3) |
| US-2 | As a Facilitator, I want to update my account details | `PATCH /api/account/profile` writing to `profiles` (§5.2) |
| US-3 | As a registered user, I want a login confirmation or error | `signInWithPassword()` or `signInWithOAuth()` resolves/rejects; error mapped via §12 |
| US-4 | As a Facilitator, I want to log in with my credentials | Either `signInWithPassword({ phone, password })` or Google sign-in (§5.1, §7.4) |
| US-5 | As a Guest, I want the option to register afterward and keep progress | Anonymous → phone OR Google upgrade, same UUID, no merge needed (§6.1) |
| US-6 | As a Mall Goer, I want to try a story as a guest without registering | `signInAnonymously()` (§5.1, §6.1 step 1) |
| US-7 | As a Facilitator, I want a registration confirmation | SMS OTP verify (phone path) or Google consent completion (Google path) — both act as the confirmation (§9.1, §9.2) |
| US-8 | As a Facilitator, I want to register an account with my details | `signUp({ phone, password, name })` or `signInWithOAuth({ provider: 'google' })` (§5.1) |

All 8 stories are satisfied by either identity method — none required a new story to be written for adding Google back.

---

## 14. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | **SMS provider selection:** which of Twilio / Vonage / MessageBird / TextLocal, with confirmed PH delivery + pricing? Blocks all phone-auth functionality. | Blocks Phase 0 setup, and therefore Phase 2 |
| 2 | **Manual identity linking:** enable it in Supabase so `linkIdentity()` works for (a) guest → Google upgrade and (b) an existing phone user adding Google, or an existing Google user adding a phone? This is a project-level Supabase Auth setting, off by default. | Affects Phase 2 and Phase 3 |
| 3 | **OTP expiry & resend cooldown:** what windows should be configured? | Affects Phase 0 Auth settings and Phase 2 UX |
| 4 | **Duplicate-account UX (§10):** if someone registers via phone and later tries Google (or vice versa) without deliberately linking, should the app detect this and prompt them to link instead of silently creating a second account? | Affects Phase 2/3 UX design, not just backend |
| 5 | **Reset-via-OTP tradeoff (§8.1):** confirm the team is fine that verifying a reset OTP logs the user in *and* immediately allows a password change | Affects Phase 2 UX and security posture |
| 6 | **Password strength policy:** default Supabase minimum, or a stricter custom rule set? | Affects Phase 0 Auth settings |
| 7 | **Minors on tablet:** does the mall-tablet audience require an age gate or parental-consent step at registration, for either sign-up method? | Affects Phase 2 registration flow and possibly legal/compliance requirements |
| 8 | **Tablet idle-timeout duration:** what's an acceptable inactivity window before auto-logout on the shared device? | Affects Phase 5 and UX |
| 9 | **Soft-delete grace period:** 30 days proposed for hard-delete after deactivation — acceptable, or shorter/longer? | Affects the scheduled cleanup Edge Function in Phase 4 |
| 10 | **Account deletion retention:** on hard delete, should `user_progress` be anonymized and kept for aggregate reporting, or cascade-deleted? | Affects `DELETE /api/account` (Phase 4) |
| 11 | **Facilitator role assignment:** self-selected at registration, or invite-only via an admin? (Noted in Phase 3 but not yet a formally tracked question) | Affects Phase 3 scope |

---

*Document version: 4.1.0 — Generated: 2026-08-07, revised 2026-08-11*
*Changelog v4.1.0: Reorganized §11 Phased Implementation Plan around **who each phase serves** rather than purely by feature — Phase 1 ships something a Guest/Mall Goer can use with no account, Phase 2 covers becoming a registered User, Phase 3 covers Facilitator-specific account management, Phase 4 covers account deletion/session-control (any registered role), Phase 5 covers shared-tablet hardening (everyone). Each phase now states its "Deliverable at end of this phase" and, where relevant, which user stories it satisfies, so progress can be demoed incrementally instead of only at the very end. Added Open Question #11 (Facilitator role assignment mechanism), surfaced while sequencing Phase 3.*
*Changelog v4.0.0: **Re-added Google/Gmail sign-in** alongside the phone/SMS-OTP method (no longer mutually exclusive with v3.0.0's phone-only design). Restored the Google OAuth flow, `/auth/callback` route, and `linkIdentity()` calls; added the "two identity paths into one user table" model (§2, §4.1); added guest-upgrade-via-Google as a second option alongside guest-upgrade-via-phone (§6.1); added account-linking flows (§8.2, §8.3) for adding a password to a Google account or adding Google to a phone account; added the duplicate-account risk to §10 and as new Open Question #4; restored `identity_already_exists` to §12; updated §11 phases and §14 open questions accordingly.*
*Previous: v3.0.0 replaced email/Google entirely with phone/SMS OTP. v2.0.0 moved the whole design onto Supabase-only with anonymous sign-in for guests. v1.2.0 corrected device assumption from kiosk to tablet. v1.1.0 added account deactivation/deletion, shared-device session isolation, audit log, error code reference.*
*Next step: Team review → resolve Open Questions #1 (SMS provider) and #2 (manual linking) first, since they block core functionality → answer remaining Open Questions → approve → begin Phase 1 setup / hand off to Claude in Antigravity for implementation.*
