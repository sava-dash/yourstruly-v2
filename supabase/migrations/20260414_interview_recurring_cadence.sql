-- F4: Recurring interview cadence + lineage tracking.
-- cadence: how often to re-send this interview to the same recipient.
-- parent_session_id: when a daily cron clones a session, the new row
--   points back to its origin so the inbox can label it "Recurring monthly".

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS parent_session_id UUID NULL REFERENCES interview_sessions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interview_sessions_cadence_check'
  ) THEN
    ALTER TABLE interview_sessions
      ADD CONSTRAINT interview_sessions_cadence_check
      CHECK (cadence IN ('once', 'monthly', 'quarterly', 'annual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_cadence
  ON interview_sessions(cadence) WHERE cadence != 'once';
CREATE INDEX IF NOT EXISTS idx_interview_sessions_parent
  ON interview_sessions(parent_session_id);

COMMENT ON COLUMN interview_sessions.cadence IS
  'How often the recipient should be re-prompted: once|monthly|quarterly|annual.';
COMMENT ON COLUMN interview_sessions.parent_session_id IS
  'For cloned recurring interviews, the original session this descended from.';
