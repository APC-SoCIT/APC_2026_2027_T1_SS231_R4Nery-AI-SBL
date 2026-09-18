-- ============================================================================
-- SQL Schema for AI for ALL
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- Execute sections in order as listed below.
-- ============================================================================

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
  theme VARCHAR(45),
  story_for TEXT DEFAULT 'all',             -- 'all' | 'guests' | 'registered'
  skills_build_url TEXT,
  skills_build_button_text TEXT,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity JSONB,
  agent_id UUID,                             -- FK added after ai_agents created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on stories" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access on stories" ON stories
  FOR ALL USING (true);

-- ─── Users ───────────────────────────────────────────────────────────────────
-- One row per auth.users row. Stores app-specific fields (name, role).
-- Created automatically by the handle_new_user trigger below.

CREATE TABLE IF NOT EXISTS public.users (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username     VARCHAR(100),
  user_sname   VARCHAR(100),
  email        VARCHAR(100),
  role         TEXT NOT NULL DEFAULT 'guest', -- 'guest' | 'user' | 'facilitator' | 'admin'
  phone_num    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user row"
  ON public.users FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own user row"
  ON public.users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on users"
  ON public.users FOR ALL USING (true);

-- ─── Profiles (legacy, kept for backward compatibility) ─────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       VARCHAR(255),
  role       VARCHAR(20) NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── Facilitators ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facilitators (
  facilitator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  expertise_area VARCHAR(100),
  bio            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.facilitators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilitators can view own row"
  ON public.facilitators FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on facilitators"
  ON public.facilitators FOR ALL USING (true);

-- ─── Mall Goers ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mall_goers (
  mall_goer_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  users_user_id   UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  points          INT DEFAULT 0,
  badges          INT DEFAULT 0,
  certificates    INT DEFAULT 0,
  selected_path   TEXT,
  selected_persona TEXT,
  is_guest        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mall_goers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mall goers can view own row"
  ON public.mall_goers FOR SELECT USING (auth.uid() = users_user_id);

CREATE POLICY "Mall goers can update own row"
  ON public.mall_goers FOR UPDATE USING (auth.uid() = users_user_id);

CREATE POLICY "Service role full access on mall_goers"
  ON public.mall_goers FOR ALL USING (true);

-- ─── AI Agents ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_agents (
  agent_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100),
  model_version     VARCHAR(45),
  description       VARCHAR(45),
  story_id          TEXT REFERENCES public.stories(id) ON DELETE SET NULL,
  story_description TEXT,
  facilitator_id    UUID REFERENCES public.facilitators(facilitator_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on ai_agents"
  ON public.ai_agents FOR SELECT USING (true);

CREATE POLICY "Service role full access on ai_agents"
  ON public.ai_agents FOR ALL USING (true);

-- Add FK from stories to ai_agents
ALTER TABLE public.stories
  ADD CONSTRAINT fk_stories_agent FOREIGN KEY (agent_id)
  REFERENCES public.ai_agents(agent_id) ON DELETE SET NULL;

-- ─── Progress ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.progress (
  progress_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status         TEXT DEFAULT 'not_started',
  score          INT DEFAULT 0,
  time_spent     INT DEFAULT 0,
  date_updated   TIMESTAMPTZ DEFAULT NOW(),
  story_id       TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.mall_goers(mall_goer_id) ON DELETE CASCADE
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.progress FOR SELECT USING (
    participant_id IN (
      SELECT mall_goer_id FROM public.mall_goers WHERE users_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own progress"
  ON public.progress FOR ALL USING (
    participant_id IN (
      SELECT mall_goer_id FROM public.mall_goers WHERE users_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on progress"
  ON public.progress FOR ALL USING (true);

-- ─── Mall Goer Engage in Story (junction) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mall_goer_engage_in_story (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mall_goer_id               UUID REFERENCES public.mall_goers(mall_goer_id) ON DELETE CASCADE,
  story_story_id             TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
  story_agent_id             UUID REFERENCES public.ai_agents(agent_id) ON DELETE SET NULL,
  story_quest_description    TEXT,
  story_progress_progress_id UUID REFERENCES public.progress(progress_id) ON DELETE SET NULL,
  engaged_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mall_goer_engage_in_story ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagements"
  ON public.mall_goer_engage_in_story FOR SELECT USING (
    mall_goer_id IN (
      SELECT mall_goer_id FROM public.mall_goers WHERE users_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on engagements"
  ON public.mall_goer_engage_in_story FOR ALL USING (true);

-- ─── Facilitator Updates Story (junction) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facilitator_updates_story (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_facilitator_id UUID REFERENCES public.facilitators(facilitator_id) ON DELETE CASCADE,
  facilitator_user_id        UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  story_story_id             TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
  story_agent_id             UUID REFERENCES public.ai_agents(agent_id) ON DELETE SET NULL,
  story_progress_progress_id UUID REFERENCES public.progress(progress_id) ON DELETE SET NULL,
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.facilitator_updates_story ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilitators can view own updates"
  ON public.facilitator_updates_story FOR SELECT USING (
    facilitator_user_id = auth.uid()
  );

CREATE POLICY "Service role full access on facilitator_updates_story"
  ON public.facilitator_updates_story FOR ALL USING (true);

-- ─── User Progress (legacy, kept for backward compatibility) ─────────────────

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

CREATE POLICY "Users can view own progress (legacy)"
  ON public.user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress (legacy)"
  ON public.user_progress FOR ALL USING (auth.uid() = user_id);

-- ─── Account Audit Log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

-- ─── Trigger: auto-create user rows on auth signup ──────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, auth_user_id, username, email, role)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    'guest'
  )
  ON CONFLICT (user_id) DO NOTHING;

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
