-- ============================================
-- PostScripts: 5-feature sprint
-- F2: cancel-after-send window
-- F3: legacy-executor trigger
-- F5: group send
-- ============================================

-- F2: cancel window
ALTER TABLE postscripts
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL;

-- F3: trigger_type + executor fields
-- (status column is plain TEXT, no enum; delivery_type is TEXT too — extend allowed values via app code)
ALTER TABLE postscripts
  ADD COLUMN IF NOT EXISTS trigger_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS executor_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS executor_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS executor_verified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS legacy_release_required BOOLEAN DEFAULT FALSE;

-- Optional sanity check for trigger_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'postscripts_trigger_type_check'
  ) THEN
    ALTER TABLE postscripts
      ADD CONSTRAINT postscripts_trigger_type_check
      CHECK (trigger_type IS NULL OR trigger_type IN ('date', 'event', 'legacy_executor'));
  END IF;
END$$;

-- F5: group send
ALTER TABLE postscripts
  ADD COLUMN IF NOT EXISTS group_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_postscripts_group ON postscripts(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postscripts_trigger_type ON postscripts(trigger_type) WHERE trigger_type IS NOT NULL;

-- ============================================
-- F3: legacy_executor_tokens
-- ============================================
CREATE TABLE IF NOT EXISTS legacy_executor_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  executor_email TEXT NOT NULL,
  executor_name TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_tokens_postscript ON legacy_executor_tokens(postscript_id);
CREATE INDEX IF NOT EXISTS idx_legacy_tokens_token ON legacy_executor_tokens(token);

ALTER TABLE legacy_executor_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own legacy tokens" ON legacy_executor_tokens;
CREATE POLICY "Owners read own legacy tokens" ON legacy_executor_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS for cron + executor confirm flow.
