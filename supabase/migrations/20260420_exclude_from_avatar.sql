-- ============================================================================
-- Exclude-from-avatar flag
--
-- Lets the user mark specific memories or interview responses so they
-- never feed:
--   - the self-avatar persona synth
--   - the loved-one persona synth
--   - the loved-one chat context (transcripts)
--   - the Concierge / self-avatar RAG search
--
-- Separate from `is_private` (which gates sharing/circles) — a row may be
-- shareable in a circle but excluded from the avatar, or vice versa.
-- Default FALSE so all existing rows stay in.
-- ============================================================================

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS exclude_from_avatar BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE video_responses
  ADD COLUMN IF NOT EXISTS exclude_from_avatar BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN memories.exclude_from_avatar IS
  'When TRUE, this memory is excluded from every avatar pipeline: persona synth, RAG retrieval, contact-context for loved-one avatars. Distinct from is_private (which controls sharing).';

COMMENT ON COLUMN video_responses.exclude_from_avatar IS
  'When TRUE, this interview response is excluded from the loved-one persona synth and the loved-one chat context. The owner controls this.';

-- Replace the RAG search RPC to add the exclude_from_avatar filter on
-- memories. Same drop-every-historical-signature pattern from the
-- earlier RPC migration so we land cleanly regardless of which version
-- is currently installed.
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

  SELECT p.id, 'postscript'::TEXT, p.title, COALESCE(p.message, p.embedding_text),
    1 - (p.embedding <=> query_embedding),
    jsonb_build_object('recipient', p.recipient_name, 'deliver_on', p.deliver_on, 'status', p.status)
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
  'RAG search across memories + contacts + postscripts + pets. Memories filtered by exclude_from_avatar=false and memory_type NOT IN interview-flavored. Entity fields exposed under people_mentioned/topics/times_mentioned/locations_mentioned.';
