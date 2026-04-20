-- ============================================================================
-- Fix: search_user_content referenced postscripts.deliver_on, which doesn't
-- exist (the canonical column is `delivery_date`). The mistyped column has
-- been in every RPC revision going back to 050_exclude_interview_from_rag
-- in the archive, which means RAG has silently returned ZERO rows whenever
-- a postscript row satisfied the other filters — the postgrest error on
-- the postscripts branch poisoned the whole UNION ALL. Without RAG, chat
-- answered only from persona cards / support_knowledge and felt untethered
-- from the user's real memories.
--
-- This re-issues the RPC with `delivery_date` in place of `deliver_on`.
-- Keeps the memories.exclude_from_avatar filter added in
-- 20260420_exclude_from_avatar.sql (which must be applied first), the
-- entity-fold added in 20260418_memories_entities_and_rag.sql, and the
-- interview-type exclusion from 050.
-- ============================================================================

DROP FUNCTION IF EXISTS search_user_content(vector, UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS search_user_content(vector(768),  UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS search_user_content(vector(1536), UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS search_user_content(vector(3072), UUID, FLOAT, INT);

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
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    'memory'::TEXT,
    m.title,
    COALESCE(m.description, m.ai_summary, m.embedding_text) AS content,
    1 - (m.embedding <=> query_embedding) AS similarity,
    jsonb_build_object(
      'date', m.memory_date,
      'location', m.location_name,
      'mood', m.ai_mood,
      'category', COALESCE(m.category, m.ai_category),
      'memory_type', m.memory_type,
      'topics',              COALESCE(m.extracted_entities -> 'topics',    '[]'::jsonb),
      'people_mentioned',    COALESCE(m.extracted_entities -> 'people',    '[]'::jsonb),
      'times_mentioned',     COALESCE(m.extracted_entities -> 'times',     '[]'::jsonb),
      'locations_mentioned', COALESCE(m.extracted_entities -> 'locations', '[]'::jsonb)
    ) AS metadata
  FROM memories m
  WHERE m.user_id = search_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND COALESCE(m.memory_type, '') NOT IN ('interview', 'interview_received', 'interview_response')
    AND COALESCE(m.exclude_from_avatar, FALSE) = FALSE

  UNION ALL

  SELECT c.id, 'contact'::TEXT, c.full_name, COALESCE(c.notes, c.embedding_text),
    1 - (c.embedding <=> query_embedding),
    jsonb_build_object('relationship', c.relationship_type, 'email', c.email,
                       'phone', c.phone, 'birthday', c.date_of_birth)
  FROM contacts c
  WHERE c.user_id = search_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold

  UNION ALL

  -- postscripts.delivery_date (NOT deliver_on — this is the bug fix).
  SELECT p.id, 'postscript'::TEXT, p.title, COALESCE(p.message, p.embedding_text),
    1 - (p.embedding <=> query_embedding),
    jsonb_build_object('recipient', p.recipient_name, 'deliver_on', p.delivery_date, 'status', p.status)
  FROM postscripts p
  WHERE p.user_id = search_user_id
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold

  UNION ALL

  SELECT pet.id, 'pet'::TEXT, pet.name, COALESCE(pet.personality, pet.embedding_text),
    1 - (pet.embedding <=> query_embedding),
    jsonb_build_object('species', pet.species, 'breed', pet.breed, 'birthday', pet.date_of_birth)
  FROM pets pet
  WHERE pet.user_id = search_user_id
    AND pet.embedding IS NOT NULL
    AND 1 - (pet.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_user_content IS
  'RAG search across memories + contacts + postscripts + pets. Uses postscripts.delivery_date (fixed from historic deliver_on typo). Memories filtered by exclude_from_avatar + interview-type exclusion. Entity fields exposed under people_mentioned/topics/times_mentioned/locations_mentioned.';
