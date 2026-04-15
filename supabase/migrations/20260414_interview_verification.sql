-- PR C: Optional recipient email verification for interview sessions
--
-- Senders may opt-in to require the recipient to verify their email
-- before answering — useful for sensitive topics. Off by default.
--
-- Contract for the recipient page (PR B owns interview/[token]/page.tsx):
--   GET  /api/interviews/verify?token=...&check=1
--        → { verification_required: boolean, verification_passed: boolean }
--   POST /api/interviews/verify  body: { token, email }
--        → { ok: true } and dispatches a 6-digit code via Resend
--   POST /api/interviews/verify  body: { token, code }
--        → { ok: true, verified: true } on success; sets verification_passed
--
-- VerificationGate (src/components/interview/VerificationGate.tsx) wraps
-- the interview UI: if verification_required && !verification_passed it
-- gates rendering until onVerified() fires. Otherwise it renders nothing.

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS verification_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_email TEXT,
  ADD COLUMN IF NOT EXISTS verification_passed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN interview_sessions.verification_required IS
  'If true, recipient must confirm a 6-digit code sent to verification_email before answering.';
COMMENT ON COLUMN interview_sessions.verification_email IS
  'Email address the recipient must verify against (set by sender at create time).';
COMMENT ON COLUMN interview_sessions.verification_passed IS
  'Set true once the recipient has confirmed the 6-digit code.';
COMMENT ON COLUMN interview_sessions.verification_code IS
  'Most-recent 6-digit verification code (server-issued, short-lived).';
COMMENT ON COLUMN interview_sessions.verification_code_expires_at IS
  'Expiry timestamp for verification_code (typically 10 minutes from issue).';
