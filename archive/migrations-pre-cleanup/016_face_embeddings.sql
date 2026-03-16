-- Add face embeddings for open-source face recognition
-- Using face-api.js which produces 128-dimensional descriptors

-- Drop the constraint that requires contact_id or profile_id
-- (we want to store detected but untagged faces)
ALTER TABLE memory_face_tags 
  DROP CONSTRAINT IF EXISTS check_tagged_person;

-- Add face embedding column (128-dim vector)
ALTER TABLE memory_face_tags 
  ADD COLUMN IF NOT EXISTS face_embedding vector(128);

-- Add indexes for similarity search
CREATE INDEX IF NOT EXISTS idx_face_tags_embedding 
  ON memory_face_tags 
  USING ivfflat (face_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Add column to track if tag was confirmed by user
ALTER TABLE memory_face_tags 
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Rename aws_face_id to be more generic
ALTER TABLE memory_face_tags 
  RENAME COLUMN aws_face_id TO external_face_id;

-- Add expression/emotion data
ALTER TABLE memory_face_tags 
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS expression TEXT;

-- Update face_index to support local embeddings
ALTER TABLE face_index 
  ADD COLUMN IF NOT EXISTS face_embedding vector(128);

ALTER TABLE face_index 
  RENAME COLUMN aws_face_id TO external_face_id;

ALTER TABLE face_index 
  RENAME COLUMN aws_collection_id TO collection_id;

-- Create function to find similar faces
CREATE OR REPLACE FUNCTION find_similar_faces(
  p_user_id UUID,
  p_embedding vector(128),
  p_threshold FLOAT DEFAULT 0.4,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  contact_id UUID,
  profile_id UUID,
  similarity FLOAT,
  media_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mft.contact_id,
    mft.profile_id,
    1 - (mft.face_embedding <=> p_embedding) as similarity,
    mft.media_id
  FROM memory_face_tags mft
  WHERE mft.user_id = p_user_id
    AND mft.is_confirmed = true
    AND mft.face_embedding IS NOT NULL
    AND (mft.contact_id IS NOT NULL OR mft.profile_id IS NOT NULL)
    AND 1 - (mft.face_embedding <=> p_embedding) > p_threshold
  ORDER BY mft.face_embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION find_similar_faces TO authenticated;
