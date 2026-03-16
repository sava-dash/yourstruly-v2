-- Migration 067: Add relation columns to SMS logs
-- Links SMS to interviews/invites for tracking

ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS related_type TEXT,
ADD COLUMN IF NOT EXISTS related_id UUID;

-- Index for lookups by related entity
CREATE INDEX IF NOT EXISTS idx_sms_logs_related 
ON sms_logs(related_type, related_id) 
WHERE related_type IS NOT NULL;

COMMENT ON COLUMN sms_logs.related_type IS 'Type of related entity (interview_invite, group_interview_invite, etc)';
COMMENT ON COLUMN sms_logs.related_id IS 'ID of the related entity';
