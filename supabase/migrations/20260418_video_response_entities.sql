-- ============================================================================
-- Interview-response entity extraction
--
-- Adds a single JSONB column to video_responses that holds the structured
-- entities extracted from the transcript (topics, people, times, locations,
-- and a one-line summary). The same entities also get folded into the
-- corresponding memories.metadata so the memory becomes the "comprehensive"
-- record callers can search/browse against without joining back to the
-- video_responses table.
--
-- Schema of `extracted_entities`:
--   {
--     "topics":    ["family dinner", "Sunday tradition"],
--     "people":    ["Grandma Rose", "my brother"],
--     "times":     ["the 1980s", "every Sunday"],
--     "locations": ["Brooklyn", "the kitchen"],
--     "summary":   "A weekly family dinner at Grandma Rose's in Brooklyn",
--     "extracted_at": "2026-04-18T17:00:00Z"
--   }
--
-- A GIN index on `extracted_entities->'topics'` powers topic-based browsing in
-- the journalist UI without a full table scan.
-- ============================================================================

ALTER TABLE video_responses
  ADD COLUMN IF NOT EXISTS extracted_entities JSONB;

-- GIN index for topic search; partial because rows without entities are
-- pre-extraction noise that should never match a topic query.
CREATE INDEX IF NOT EXISTS video_responses_topics_gin
  ON video_responses USING GIN ((extracted_entities -> 'topics'))
  WHERE extracted_entities IS NOT NULL;

-- Same idea for people — lets the journalist UI ask "show me every interview
-- response that mentioned Grandma Rose" cheaply.
CREATE INDEX IF NOT EXISTS video_responses_people_gin
  ON video_responses USING GIN ((extracted_entities -> 'people'))
  WHERE extracted_entities IS NOT NULL;

COMMENT ON COLUMN video_responses.extracted_entities IS
  'AI-extracted entities from the transcript. JSON shape: {topics:[], people:[], times:[], locations:[], summary, extracted_at}. NULL until the background extractor runs after save-response.';
