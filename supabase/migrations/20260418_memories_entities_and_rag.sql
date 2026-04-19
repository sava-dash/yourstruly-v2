-- ============================================================================
-- Memory entity extraction + RAG metadata refresh
--
-- Three things going wrong before this migration:
--
--   1. The synth corpus for self avatars (and other code paths) was reading
--      `memories.content` and `memories.metadata` — neither column exists.
--      The canonical body lives in `description` / `ai_summary` /
--      `embedding_text` and the JSONB metadata column is `ai_labels`.
--      Result: empty corpus → fallback persona → generic-sounding avatar.
--
--   2. Entity extraction (lib/interviews/extract-entities.ts) was writing
--      to `memories.metadata` — also a non-existent column. So the
--      extracted topics / people / times / locations on memory rows were
--      silently dropped on the floor.
--
--   3. The `search_user_content` RPC didn't expose entity fields, so even
--      when extraction was working (on video_responses) the formatRagContext
--      reader never saw `topics` / `people_mentioned` etc. through the RPC.
--
-- This migration:
--   - Adds `extracted_entities JSONB` to memories (mirroring video_responses)
--   - Adds GIN partial indexes on the topics + people facets
--   - Replaces search_user_content to fold extracted_entities into the
--     returned metadata under the keys formatRagContext already reads
--     (`people_mentioned`, `topics`, `times_mentioned`, `locations_mentioned`)
--   - Preserves the migration-050 behavior of excluding interview-typed
--     memories from RAG so they don't pollute the owner's self-avatar voice
-- ============================================================================

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS extracted_entities JSONB;

CREATE INDEX IF NOT EXISTS memories_topics_gin
  ON memories USING GIN ((extracted_entities -> 'topics'))
  WHERE extracted_entities IS NOT NULL;

CREATE INDEX IF NOT EXISTS memories_people_gin
  ON memories USING GIN ((extracted_entities -> 'people'))
  WHERE extracted_entities IS NOT NULL;

COMMENT ON COLUMN memories.extracted_entities IS
  'AI-extracted entities from the memory description / transcript. JSON shape: {topics:[], people:[], times:[], locations:[], summary, extracted_at}. Mirror of video_responses.extracted_entities. NULL until the background extractor runs.';

-- Drop every signature variant we have ever shipped before re-creating —
-- DROP FUNCTION requires the EXACT argument list, so each historical
-- vector size needs its own line. None of these errors hard.
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
  -- Memories: engagement card answers, written memories, wisdom entries.
  -- Interview-typed memories are excluded so they don't leak into the
  -- owner's self-avatar voice (they're handled by the contact-context
  -- builder for loved-one avatars).
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

  UNION ALL

  SELECT
    c.id,
    'contact'::TEXT,
    c.full_name,
    COALESCE(c.notes, c.embedding_text),
    1 - (c.embedding <=> query_embedding),
    jsonb_build_object(
      'relationship', c.relationship_type,
      'email',        c.email,
      'phone',        c.phone,
      'birthday',     c.date_of_birth
    )
  FROM contacts c
  WHERE c.user_id = search_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold

  UNION ALL

  SELECT
    p.id,
    'postscript'::TEXT,
    p.title,
    COALESCE(p.message, p.embedding_text),
    1 - (p.embedding <=> query_embedding),
    jsonb_build_object(
      'recipient',  p.recipient_name,
      'deliver_on', p.deliver_on,
      'status',     p.status
    )
  FROM postscripts p
  WHERE p.user_id = search_user_id
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold

  UNION ALL

  SELECT
    pet.id,
    'pet'::TEXT,
    pet.name,
    COALESCE(pet.personality, pet.embedding_text),
    1 - (pet.embedding <=> query_embedding),
    jsonb_build_object(
      'species',  pet.species,
      'breed',    pet.breed,
      'birthday', pet.date_of_birth
    )
  FROM pets pet
  WHERE pet.user_id = search_user_id
    AND pet.embedding IS NOT NULL
    AND 1 - (pet.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_user_content IS
  'RAG search over memories + contacts + postscripts + pets. Memories metadata exposes extracted_entities under people_mentioned/topics/times_mentioned/locations_mentioned so the chat formatter can surface them. Interview-typed memories are excluded — those are handled by the contact-context builder for loved-one avatars.';
