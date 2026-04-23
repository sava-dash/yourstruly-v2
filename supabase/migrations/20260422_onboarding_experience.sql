-- Onboarding experience enhancements
-- 1) Sensitive-topic opt-outs so the engagement engine can route around landmines.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sensitive_topic_optouts text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.profiles.sensitive_topic_optouts IS
  'Topics the user has opted out of during onboarding (loss, divorce, trauma, religion, politics, etc.). The prompt generator must exclude these.';

-- 2) Preferred prompt cadence (how often the user wants engagement prompts).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prompt_cadence text
  CHECK (prompt_cadence IS NULL OR prompt_cadence IN ('daily', 'few_weekly', 'weekly', 'user_paced'));

COMMENT ON COLUMN public.profiles.prompt_cadence IS
  'User-selected prompt cadence: daily, few_weekly, weekly, user_paced.';

-- 3) Onboarding phase events for drop-off analytics.
--    One row per time a user enters a globe sub-phase (basics, map, places-lived,
--    contacts, interests, photo-upload, why-here, preferences, lets-go, completed).
CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase       text NOT NULL,
  event       text NOT NULL DEFAULT 'entered',
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_events_user_idx
  ON public.onboarding_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_events_phase_idx
  ON public.onboarding_events (phase);

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_onboarding_events" ON public.onboarding_events;
CREATE POLICY "users_select_own_onboarding_events" ON public.onboarding_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_onboarding_events" ON public.onboarding_events;
CREATE POLICY "users_insert_own_onboarding_events" ON public.onboarding_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
