-- Add an optional personal note from the sender that the recipient sees in the
-- interview cold open. Length is enforced app-side (≤280 chars) to keep DB
-- changes minimal and reversible.
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS sender_note TEXT NULL;

COMMENT ON COLUMN interview_sessions.sender_note IS
  'Optional handwritten-style note from the sender shown to the recipient on the interview welcome screen. App enforces ≤280 chars.';
