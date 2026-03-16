-- Migration 066: SMS Logs for Telnyx integration
-- Track all outbound SMS for analytics and debugging

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_number TEXT NOT NULL,
  message_preview TEXT, -- First 100 chars for reference
  template_used TEXT,
  telnyx_message_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  delivery_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_telnyx_id ON sms_logs(telnyx_message_id);

-- RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own SMS logs
CREATE POLICY "Users can view own SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only system can insert (via service role)
CREATE POLICY "Service can insert SMS logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only system can update (via service role for webhooks)
CREATE POLICY "Service can update SMS logs"
  ON sms_logs FOR UPDATE
  TO authenticated
  USING (true);

COMMENT ON TABLE sms_logs IS 'Tracks all SMS sent via Telnyx for analytics and debugging';
