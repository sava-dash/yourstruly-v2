-- ============================================================================
-- Avatar: per-contact (loved-one) personas
--
-- 4.1 shipped one avatar per user (their own). 4.5 lets the same user
-- chat with an avatar of any of their CONTACTS who has interview
-- responses on record. The corpus for those personas is the contact's
-- video_responses (transcripts + extracted_entities), not the user's own
-- memories.
--
-- Conceptual rename happening in this migration (without changing column
-- names so existing code keeps working):
--   avatar_personas.user_id   = the OWNER (YT account holder who can
--                               chat with this persona)
--   subject_contact_id        = NULL → persona represents the owner;
--                               non-null → represents that contact
-- ============================================================================

-- 1. Surrogate primary key so multiple rows per (owner, subject) can coexist.
ALTER TABLE avatar_personas DROP CONSTRAINT IF EXISTS avatar_personas_pkey;

ALTER TABLE avatar_personas ADD COLUMN IF NOT EXISTS id UUID;
UPDATE avatar_personas SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE avatar_personas ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE avatar_personas ALTER COLUMN id SET NOT NULL;
ALTER TABLE avatar_personas ADD PRIMARY KEY (id);

-- 2. The subject — NULL means "the owner themselves".
ALTER TABLE avatar_personas
  ADD COLUMN IF NOT EXISTS subject_contact_id UUID
  REFERENCES contacts(id) ON DELETE CASCADE;

-- 3. One self-persona per owner + one per (owner, contact) pair. Partial
--    unique indexes give us the "two flavors" of uniqueness without an
--    awkward COALESCE expression in a UNIQUE constraint.
DROP INDEX IF EXISTS avatar_personas_self_uniq;
DROP INDEX IF EXISTS avatar_personas_contact_uniq;
CREATE UNIQUE INDEX avatar_personas_self_uniq
  ON avatar_personas (user_id) WHERE subject_contact_id IS NULL;
CREATE UNIQUE INDEX avatar_personas_contact_uniq
  ON avatar_personas (user_id, subject_contact_id) WHERE subject_contact_id IS NOT NULL;

-- Cheap lookup for "list all personas owned by this user".
CREATE INDEX IF NOT EXISTS avatar_personas_owner_idx
  ON avatar_personas (user_id, subject_contact_id);

-- 4. RLS already restricts SELECT to (auth.uid() = user_id); since
--    contacts are owned by the user, that policy still covers loved-one
--    personas correctly. No policy change needed.

-- 5. Mirror the subject onto chat_sessions so loved-one threads list
--    independently from self-avatar threads in history.
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS subject_contact_id UUID
  REFERENCES contacts(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS chat_sessions_user_mode_idx;
CREATE INDEX chat_sessions_user_subject_idx
  ON chat_sessions (user_id, mode, subject_contact_id, updated_at DESC);

COMMENT ON COLUMN avatar_personas.subject_contact_id IS
  'NULL = persona represents the owner themselves (self avatar). Non-null = represents that contact (loved-one avatar). user_id is always the OWNER (account holder).';

COMMENT ON COLUMN chat_sessions.subject_contact_id IS
  'When mode=avatar: NULL = self avatar thread, non-null = thread with that contact''s avatar. Always NULL for mode=concierge.';
