-- Auto-save + analytics columns for interview_sessions
-- Token-based access already gates these rows in app code; no RLS changes.

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ NULL;

-- Helpful for sender dashboard "stalled" queries
CREATE INDEX IF NOT EXISTS idx_interview_sessions_last_response_at
  ON interview_sessions (last_response_at);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_opened_at
  ON interview_sessions (opened_at);

COMMENT ON COLUMN interview_sessions.progress_data IS
  'In-progress conversation state for auto-save/resume (exchanges, currentQuestionIndex, mode, etc.)';
COMMENT ON COLUMN interview_sessions.opened_at IS
  'First time the recipient opened the interview link.';
COMMENT ON COLUMN interview_sessions.started_at IS
  'When the recipient clicked Begin Interview.';
COMMENT ON COLUMN interview_sessions.last_response_at IS
  'Most recent auto-save / response timestamp; used to detect stalled interviews.';
