-- Soft deletes pattern for critical data
-- Adds deleted_at column to tables containing irreplaceable user data

-- Memories table (most critical - user stories)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at) WHERE deleted_at IS NULL;

-- Memory media (photos attached to memories)
ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_memory_media_deleted_at ON memory_media(deleted_at) WHERE deleted_at IS NULL;

-- Contacts (family members, friends)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;

-- Postscripts (future messages - extremely precious)
ALTER TABLE postscripts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_postscripts_deleted_at ON postscripts(deleted_at) WHERE deleted_at IS NULL;

-- Knowledge entries (wisdom, recipes, lessons)
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_deleted_at ON knowledge_entries(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
-- These need to be run after the columns exist

-- Helper function to soft delete instead of hard delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Instead of deleting, set deleted_at
  UPDATE memories SET deleted_at = NOW() WHERE id = OLD.id;
  -- Return NULL to prevent the actual delete
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To enable soft delete triggers, uncomment below:
-- DROP TRIGGER IF EXISTS soft_delete_memories ON memories;
-- CREATE TRIGGER soft_delete_memories
--   BEFORE DELETE ON memories
--   FOR EACH ROW EXECUTE FUNCTION soft_delete();

-- View for active (non-deleted) records - use these in queries
CREATE OR REPLACE VIEW active_memories AS
SELECT * FROM memories WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_memory_media AS
SELECT * FROM memory_media WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_contacts AS
SELECT * FROM contacts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_postscripts AS
SELECT * FROM postscripts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_knowledge_entries AS
SELECT * FROM knowledge_entries WHERE deleted_at IS NULL;

-- Recovery function (admin use)
CREATE OR REPLACE FUNCTION recover_deleted_record(
  table_name TEXT,
  record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1', table_name)
  USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users for views
GRANT SELECT ON active_memories TO authenticated;
GRANT SELECT ON active_memory_media TO authenticated;
GRANT SELECT ON active_contacts TO authenticated;
GRANT SELECT ON active_postscripts TO authenticated;
GRANT SELECT ON active_knowledge_entries TO authenticated;

COMMENT ON COLUMN memories.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
COMMENT ON COLUMN memory_media.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
COMMENT ON COLUMN contacts.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
COMMENT ON COLUMN postscripts.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
COMMENT ON COLUMN knowledge_entries.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
