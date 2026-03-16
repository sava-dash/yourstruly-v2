-- ============================================================================
-- Migration: Contacts Table Extensions
-- Created: 2026-02-20
-- Description: Add fields needed for engagement bubbles + sharing
-- ============================================================================

-- ============================================================================
-- ADD COLUMNS TO CONTACTS TABLE
-- ============================================================================

-- Add how_met field for relationship context
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS how_met TEXT;

-- Add sharing fields for family access
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS can_view_memories BOOLEAN DEFAULT FALSE;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS can_view_knowledge BOOLEAN DEFAULT FALSE;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS can_view_postscripts BOOLEAN DEFAULT FALSE;

-- Add deceased tracking if not exists
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT FALSE;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS death_date DATE;

-- Add last interaction tracking
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS last_mentioned_at TIMESTAMPTZ;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS mention_count INTEGER DEFAULT 0;

-- ============================================================================
-- FACE DETECTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS detected_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Source image
  media_id UUID NOT NULL REFERENCES memory_media(id) ON DELETE CASCADE,
  
  -- Face bounding box (normalized 0-1)
  bbox_x FLOAT NOT NULL,
  bbox_y FLOAT NOT NULL,
  bbox_width FLOAT NOT NULL,
  bbox_height FLOAT NOT NULL,
  
  -- Face embedding for matching
  embedding VECTOR(512), -- FaceNet or similar
  
  -- Matching
  matched_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  match_confidence FLOAT, -- 0-1
  manually_verified BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_ignored BOOLEAN DEFAULT FALSE, -- User said "this isn't a person" or "skip this"
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_faces_user ON detected_faces(user_id);
CREATE INDEX IF NOT EXISTS idx_faces_media ON detected_faces(media_id);
CREATE INDEX IF NOT EXISTS idx_faces_unmatched ON detected_faces(user_id, matched_contact_id) 
  WHERE matched_contact_id IS NULL AND is_ignored = FALSE;
CREATE INDEX IF NOT EXISTS idx_faces_contact ON detected_faces(matched_contact_id) 
  WHERE matched_contact_id IS NOT NULL;

-- RLS
ALTER TABLE detected_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own faces"
  ON detected_faces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own faces"
  ON detected_faces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert faces"
  ON detected_faces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- MEMORY_MEDIA EXTENSIONS
-- ============================================================================

-- Add face detection status
ALTER TABLE memory_media
ADD COLUMN IF NOT EXISTS faces_detected BOOLEAN DEFAULT FALSE;

ALTER TABLE memory_media
ADD COLUMN IF NOT EXISTS face_detection_at TIMESTAMPTZ;

-- Add description/backstory (from engagement bubbles)
ALTER TABLE memory_media
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE memory_media
ADD COLUMN IF NOT EXISTS backstory_audio_url TEXT;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_detected_faces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detected_faces_updated_at
  BEFORE UPDATE ON detected_faces
  FOR EACH ROW
  EXECUTE FUNCTION update_detected_faces_updated_at();

-- ============================================================================
-- FUNCTION: Update contact mention stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contact_mentions()
RETURNS TRIGGER AS $$
DECLARE
  contact_id UUID;
  contacts_array UUID[];
BEGIN
  -- Get contacts mentioned in this knowledge entry or memory
  IF TG_TABLE_NAME = 'knowledge_entries' THEN
    contacts_array := NEW.related_contacts;
  ELSIF TG_TABLE_NAME = 'memories' THEN
    -- Get from memory_contacts junction table
    SELECT ARRAY_AGG(mc.contact_id) INTO contacts_array
    FROM memory_contacts mc
    WHERE mc.memory_id = NEW.id;
  END IF;
  
  -- Update each mentioned contact
  IF contacts_array IS NOT NULL THEN
    FOREACH contact_id IN ARRAY contacts_array
    LOOP
      UPDATE contacts
      SET 
        last_mentioned_at = NOW(),
        mention_count = mention_count + 1
      WHERE id = contact_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for mention tracking
DROP TRIGGER IF EXISTS knowledge_mention_tracker ON knowledge_entries;
CREATE TRIGGER knowledge_mention_tracker
  AFTER INSERT ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_mentions();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE detected_faces IS 'Faces detected in uploaded photos for tagging';
COMMENT ON COLUMN contacts.how_met IS 'Story of how user met this contact';
COMMENT ON COLUMN contacts.shared_with_user_id IS 'If this contact has a YT account, link for sharing';
COMMENT ON COLUMN contacts.can_view_knowledge IS 'Can this contact view user knowledge entries (Digital Twin)';
COMMENT ON COLUMN detected_faces.embedding IS 'Face embedding vector for similarity matching';
