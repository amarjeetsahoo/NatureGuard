-- ============================================================
-- NatureGuard — Supabase Database Schema
-- Run this entire file in: Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. PROFILES TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  country         TEXT    DEFAULT 'global',
  units           TEXT    DEFAULT 'metric',
  diet_type       TEXT    DEFAULT 'omnivore',
  vehicle_type    TEXT    DEFAULT 'petrol_avg',
  commute_km      FLOAT   DEFAULT 0,
  gemini_api_key  TEXT,
  onboarded       BOOLEAN DEFAULT FALSE,
  current_streak  INT     DEFAULT 0,
  longest_streak  INT     DEFAULT 0,
  last_logged_date DATE,
  badges          JSONB   DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ACTIVITIES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL,
  activity    TEXT        NOT NULL,
  quantity    FLOAT       NOT NULL,
  unit        TEXT        NOT NULL,
  co2_kg      FLOAT       NOT NULL,
  source      TEXT        DEFAULT 'manual' CHECK (source IN ('manual','ai_parsed')),
  notes       TEXT,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. USER ACTIONS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_actions (
  id                  UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_key          TEXT  NOT NULL,
  title               TEXT  NOT NULL,
  status              TEXT  DEFAULT 'suggested' CHECK (status IN ('suggested','adopted','dismissed')),
  ai_generated        BOOLEAN DEFAULT FALSE,
  co2_saved_estimate  FLOAT,
  adopted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. WEEKLY DIGESTS TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id              UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start      DATE  NOT NULL,
  content         TEXT  NOT NULL,
  stats_snapshot  JSONB,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

-- ── 5. INDEXES ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_user_logged   ON public.activities (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_category ON public.activities (user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_actions_user        ON public.user_actions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_user      ON public.weekly_digests (user_id, week_start DESC);

-- ── 6. ROW LEVEL SECURITY ──────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

-- Profiles: users own their row
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Activities: users own their rows
CREATE POLICY "activities_own" ON public.activities
  FOR ALL USING (auth.uid() = user_id);

-- User Actions: users own their rows
CREATE POLICY "actions_own" ON public.user_actions
  FOR ALL USING (auth.uid() = user_id);

-- Weekly Digests: users own their rows
CREATE POLICY "digests_own" ON public.weekly_digests
  FOR ALL USING (auth.uid() = user_id);

-- ── 7. AUTO-CREATE PROFILE ON SIGNUP ──────────────────────
-- Trigger fires after a new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 8. UPDATED_AT TRIGGER FOR PROFILES ─────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
