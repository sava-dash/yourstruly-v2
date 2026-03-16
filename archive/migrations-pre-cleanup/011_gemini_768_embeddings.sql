-- Migration: Switch from OpenAI (1536) to Gemini (768) embeddings
-- Run this if you're using Gemini for embeddings instead of OpenAI

-- Drop existing indexes first
DROP INDEX IF EXISTS memories_embedding_idx;
DROP INDEX IF EXISTS contacts_embedding_idx;
DROP INDEX IF EXISTS profiles_embedding_idx;
DROP INDEX IF EXISTS postscripts_embedding_idx;
DROP INDEX IF EXISTS pets_embedding_idx;

-- Clear existing embeddings (they won't be compatible with new dimensions)
UPDATE memories SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE contacts SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE profiles SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE postscripts SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE pets SET embedding = NULL WHERE embedding IS NOT NULL;

-- Alter columns to 768 dimensions (Gemini/Ollama compatible)
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE contacts ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE profiles ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE postscripts ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE pets ALTER COLUMN embedding TYPE vector(768);

-- Recreate indexes with new dimensions
CREATE INDEX IF NOT EXISTS memories_embedding_idx 
ON memories USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS contacts_embedding_idx
ON contacts USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS profiles_embedding_idx
ON profiles USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS postscripts_embedding_idx
ON postscripts USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS pets_embedding_idx
ON pets USING hnsw (embedding vector_cosine_ops);

-- Update the search function to use 768 dimensions
CREATE OR REPLACE FUNCTION search_user_content(
  query_embedding vector(768),
  search_user_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Search memories
    SELECT 
      m.id,
      'memory'::TEXT as content_type,
      m.title,
      m.story as content,
      jsonb_build_object(
        'date', m.date,
        'location', m.location,
        'media_count', (SELECT COUNT(*) FROM memory_media mm WHERE mm.memory_id = m.id)
      ) as metadata,
      1 - (m.embedding <=> query_embedding) as similarity
    FROM memories m
    WHERE m.user_id = search_user_id
      AND m.embedding IS NOT NULL
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Search contacts
    SELECT 
      c.id,
      'contact'::TEXT as content_type,
      c.full_name as title,
      c.notes as content,
      jsonb_build_object(
        'relationship', c.relationship,
        'birthday', c.birth_date,
        'email', c.email
      ) as metadata,
      1 - (c.embedding <=> query_embedding) as similarity
    FROM contacts c
    WHERE c.user_id = search_user_id
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Search postscripts
    SELECT 
      p.id,
      'postscript'::TEXT as content_type,
      p.title,
      p.content,
      jsonb_build_object(
        'recipient', p.recipient_name,
        'deliver_on', p.deliver_on,
        'status', p.status
      ) as metadata,
      1 - (p.embedding <=> query_embedding) as similarity
    FROM postscripts p
    WHERE p.user_id = search_user_id
      AND p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Search pets
    SELECT 
      pet.id,
      'pet'::TEXT as content_type,
      pet.name as title,
      pet.notes as content,
      jsonb_build_object(
        'species', pet.species,
        'breed', pet.breed,
        'birth_date', pet.birth_date
      ) as metadata,
      1 - (pet.embedding <=> query_embedding) as similarity
    FROM pets pet
    WHERE pet.user_id = search_user_id
      AND pet.embedding IS NOT NULL
      AND 1 - (pet.embedding <=> query_embedding) > match_threshold
  ) results
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
