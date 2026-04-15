-- Weekly Story email opt-in preference on profiles.
-- Added by stickiness sprint (F1).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_story_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN profiles.weekly_story_enabled IS
  'When true, the user receives the Sunday Weekly Story email with a curated engagement prompt.';

-- Optional gifted entitlement window (used by Gift-a-Year, F4).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gifted_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.gifted_until IS
  'If set in the future, the account has gifted access until this timestamp.';
