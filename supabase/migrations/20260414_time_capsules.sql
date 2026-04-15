-- Quarterly Time Capsule archive (F3).
CREATE TABLE IF NOT EXISTS time_capsules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period        TEXT NOT NULL, -- e.g. "2026-Q1"
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url       TEXT DEFAULT NULL,
  email_sent_at TIMESTAMPTZ DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS time_capsules_user_period_idx
  ON time_capsules (user_id, period);

CREATE INDEX IF NOT EXISTS time_capsules_user_generated_idx
  ON time_capsules (user_id, generated_at DESC);

ALTER TABLE time_capsules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own time capsules" ON time_capsules;
CREATE POLICY "users read own time capsules" ON time_capsules
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE time_capsules IS
  'Archive of quarterly auto-generated time capsules. summary_json holds the aggregated stats and item lists.';
