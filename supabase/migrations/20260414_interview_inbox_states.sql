-- F1 + F3: Inbox triage states + transcript edit timestamp on video_responses.
-- seen_at: when sender opened/marked the response as read in the inbox.
-- flagged_at: when sender starred/flagged the response for follow-up.
-- transcript_edited_at: when sender last edited the transcript text.

ALTER TABLE video_responses
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS transcript_edited_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_video_responses_user_seen
  ON video_responses(user_id, seen_at);
CREATE INDEX IF NOT EXISTS idx_video_responses_user_flagged
  ON video_responses(user_id, flagged_at);

COMMENT ON COLUMN video_responses.seen_at IS
  'Set when the sender (interview owner) marks this response as read in the inbox.';
COMMENT ON COLUMN video_responses.flagged_at IS
  'Set when the sender flags this response for follow-up; cleared by toggling off.';
COMMENT ON COLUMN video_responses.transcript_edited_at IS
  'Set whenever the sender edits the transcript before/after memory finalization.';
