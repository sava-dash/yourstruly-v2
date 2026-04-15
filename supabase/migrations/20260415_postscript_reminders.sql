-- PostScript reminder send log — prevents the 14/7/0-day reminder cron from
-- double-sending the same nudge if it runs twice in a UTC day, retries after
-- failure, or catches up after a missed run.
--
-- Each (postscript_id, days_until) tuple is unique: once a 14-day reminder
-- has been recorded for postscript X, the cron will skip it on future runs.
CREATE TABLE IF NOT EXISTS postscript_reminders_sent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
  days_until    INT  NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (postscript_id, days_until)
);

CREATE INDEX IF NOT EXISTS postscript_reminders_sent_ps_days_idx
  ON postscript_reminders_sent (postscript_id, days_until);

ALTER TABLE postscript_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Sender (postscript owner) can read their own reminder history.
DROP POLICY IF EXISTS "owner reads own postscript reminders" ON postscript_reminders_sent;
CREATE POLICY "owner reads own postscript reminders" ON postscript_reminders_sent
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM postscripts p
      WHERE p.id = postscript_reminders_sent.postscript_id
        AND p.user_id = auth.uid()
    )
  );

-- Writes are done by the cron via the admin/service-role client which
-- bypasses RLS. No insert/update/delete policies for regular users.

COMMENT ON TABLE postscript_reminders_sent IS
  'Idempotency log for the postscript-reminders cron. One row per (postscript, daysUntil) nudge delivered.';
