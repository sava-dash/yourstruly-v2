-- F5: Notification log for SMS/email delivery attempts (with retry + fallback).
-- One row per attempt. status: 'sent' | 'failed' | 'fallback'.
-- channel: 'sms' | 'email'. type: 'interview_invite' | 'recurring_invite' | etc.

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  target_id UUID NULL,
  target_address TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'fallback')),
  error_message TEXT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user
  ON notification_log(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_target
  ON notification_log(target_id, attempted_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own logs" ON notification_log;
CREATE POLICY "owners read own logs" ON notification_log
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE notification_log IS
  'Per-attempt log of outbound notifications (SMS/email). Includes retries and fallbacks.';
