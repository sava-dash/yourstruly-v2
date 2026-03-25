-- Rekognition Face Recognition Pipeline
-- Adds columns to support auto-identification via AWS Rekognition Collections

-- Add rekognition_face_id to track which Rekognition face ID was indexed
ALTER TABLE memory_face_tags
    ADD COLUMN IF NOT EXISTS rekognition_face_id TEXT;

-- Add confirmation tracking for auto-tagged faces
ALTER TABLE memory_face_tags
    ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE memory_face_tags
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Index for finding faces by rekognition ID (for cleanup/sync)
CREATE INDEX IF NOT EXISTS idx_face_tags_rekognition_id 
    ON memory_face_tags(rekognition_face_id) 
    WHERE rekognition_face_id IS NOT NULL;

-- Index for finding unconfirmed auto-tags
CREATE INDEX IF NOT EXISTS idx_face_tags_unconfirmed 
    ON memory_face_tags(user_id, is_confirmed) 
    WHERE contact_id IS NOT NULL AND is_confirmed = FALSE;
