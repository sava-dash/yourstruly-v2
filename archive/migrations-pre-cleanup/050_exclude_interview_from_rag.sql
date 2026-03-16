-- Exclude interview memories from user's essence/RAG search
-- Interview responses should not affect the user's personal AI avatar

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
    -- Exclude interview-related memories from RAG
    AND COALESCE(m.memory_type, '') NOT IN ('interview', 'interview_response')
    AND COALESCE(m.source, '') != 'video_journalist'
  
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

COMMENT ON FUNCTION search_user_content IS 'Search user content for RAG, excluding interview responses to keep essence pure';
