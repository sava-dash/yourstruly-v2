-- ============================================================================
-- Interview claimable-on-signup support
--
-- Adds two columns to interview_sessions so a fresh signup can discover and
-- claim interviews they previously answered:
--
--   interviewee_email   — set when the recipient uses "email me a copy" at
--                         the end of the interview, or when they start
--                         ClaimAccountFlow. Indexed for signup-time lookup.
--
--   claimed_by_user_id  — set by /api/interviews/claim-account after the
--                         responses have been copied into a user's memories.
--                         Used to exclude already-claimed sessions from the
--                         /api/interviews/claimable results.
-- ============================================================================

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS interviewee_email TEXT,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Case-insensitive lookup — we always normalize to lower() on insert.
CREATE INDEX IF NOT EXISTS interview_sessions_interviewee_email_idx
  ON interview_sessions (LOWER(interviewee_email))
  WHERE interviewee_email IS NOT NULL
    AND claimed_by_user_id IS NULL;

COMMENT ON COLUMN interview_sessions.interviewee_email IS
  'Email the interviewee entered (for a transcript copy or to claim). Used to match claimable sessions on signup.';
COMMENT ON COLUMN interview_sessions.claimed_by_user_id IS
  'Set when /api/interviews/claim-account has copied the session responses into a user. Prevents double-claim.';
