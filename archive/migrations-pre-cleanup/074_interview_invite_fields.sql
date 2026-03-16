-- Migration 068: Add invite tracking fields to interview_sessions

ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS invitee_name TEXT,
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_method TEXT, -- sms, email, both, link
ADD COLUMN IF NOT EXISTS custom_questions JSONB;

-- Make contact_id optional (invites may not have a contact yet)
ALTER TABLE interview_sessions 
ALTER COLUMN contact_id DROP NOT NULL;

COMMENT ON COLUMN interview_sessions.invitee_name IS 'Name of person being interviewed (may not have contact record)';
COMMENT ON COLUMN interview_sessions.invite_sent_at IS 'When the invite was sent';
COMMENT ON COLUMN interview_sessions.invite_method IS 'How the invite was delivered: sms, email, both, link';
COMMENT ON COLUMN interview_sessions.custom_questions IS 'Optional custom questions for this session';
