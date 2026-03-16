-- Update vector dimensions from 768 to 3072 (Gemini gemini-embedding-001)
-- Using IVFFlat index instead of HNSW (HNSW limited to 2000 dims)

-- Drop old indexes first
DROP INDEX IF EXISTS memories_embedding_idx;
DROP INDEX IF EXISTS contacts_embedding_idx;
DROP INDEX IF EXISTS profiles_embedding_idx;
DROP INDEX IF EXISTS postscripts_embedding_idx;
DROP INDEX IF EXISTS pets_embedding_idx;

-- Drop and recreate columns with correct dimensions
ALTER TABLE memories DROP COLUMN IF EXISTS embedding;
ALTER TABLE memories ADD COLUMN embedding vector(3072);

ALTER TABLE contacts DROP COLUMN IF EXISTS embedding;
ALTER TABLE contacts ADD COLUMN embedding vector(3072);

ALTER TABLE profiles DROP COLUMN IF EXISTS embedding;
ALTER TABLE profiles ADD COLUMN embedding vector(3072);

ALTER TABLE postscripts DROP COLUMN IF EXISTS embedding;
ALTER TABLE postscripts ADD COLUMN embedding vector(3072);

ALTER TABLE pets DROP COLUMN IF EXISTS embedding;
ALTER TABLE pets ADD COLUMN embedding vector(3072);

-- Create IVFFlat indexes (no dimension limit, good for < 1M rows)
-- Note: IVFFlat indexes are created AFTER data is inserted for best performance
-- For now, we skip index creation - queries will still work, just slower
-- Once data exists, run: CREATE INDEX ... USING ivfflat ... WITH (lists = 100)

-- Update the search function for 3072 dimensions
CREATE OR REPLACE FUNCTION search_user_content(
  query_embedding vector(3072),
  search_user_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    m.id,
    'memory'::TEXT as content_type,
    m.title,
    COALESCE(m.description, m.ai_summary, m.embedding_text) as content,
    1 - (m.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'date', m.memory_date,
      'location', m.location_name,
      'mood', m.ai_mood,
      'category', m.ai_category
    ) as metadata
  FROM memories m
  WHERE m.user_id = search_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  SELECT
    c.id,
    'contact'::TEXT as content_type,
    c.full_name as title,
    COALESCE(c.notes, c.embedding_text) as content,
    1 - (c.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'relationship', c.relationship_type,
      'email', c.email,
      'phone', c.phone,
      'birthday', c.date_of_birth
    ) as metadata
  FROM contacts c
  WHERE c.user_id = search_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  SELECT
    p.id,
    'postscript'::TEXT as content_type,
    p.title,
    COALESCE(p.message, p.embedding_text) as content,
    1 - (p.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'recipient', p.recipient_name,
      'deliver_on', p.deliver_on,
      'status', p.status
    ) as metadata
  FROM postscripts p
  WHERE p.user_id = search_user_id
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  SELECT
    pet.id,
    'pet'::TEXT as content_type,
    pet.name as title,
    COALESCE(pet.personality, pet.embedding_text) as content,
    1 - (pet.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'species', pet.species,
      'breed', pet.breed,
      'birthday', pet.date_of_birth
    ) as metadata
  FROM pets pet
  WHERE pet.user_id = search_user_id
    AND pet.embedding IS NOT NULL
    AND 1 - (pet.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
