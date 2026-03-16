-- Unified Interviews: Support for single, multiple, or circle-based interviews
-- All linked by interview_group_id

-- Add group linking to existing interview_sessions table
ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS interview_group_id UUID,
ADD COLUMN IF NOT EXISTS group_question TEXT; -- The shared question for grouped interviews

-- Index for efficient group lookups
CREATE INDEX IF NOT EXISTS idx_interview_sessions_group_id ON interview_sessions(interview_group_id) WHERE interview_group_id IS NOT NULL;

-- Create a view for grouped interview stats
CREATE OR REPLACE VIEW interview_group_stats AS
SELECT 
  interview_group_id,
  user_id,
  group_question,
  COUNT(*) as participant_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  MIN(created_at) as created_at,
  MAX(created_at) as last_activity_at
FROM interview_sessions
WHERE interview_group_id IS NOT NULL
GROUP BY interview_group_id, user_id, group_question;
