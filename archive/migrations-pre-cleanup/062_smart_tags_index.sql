-- Smart Tags Index for faster searching
-- Adds GIN index on ai_labels JSONB column for efficient tag searches

-- Index for JSONB contains operations on ai_labels
CREATE INDEX IF NOT EXISTS idx_memory_media_ai_labels_gin 
  ON memory_media USING gin (ai_labels jsonb_path_ops);

-- Index for specific tag array searches
CREATE INDEX IF NOT EXISTS idx_memory_media_ai_labels_alltags 
  ON memory_media USING gin ((ai_labels->'allTags'));

-- Index for category searches
CREATE INDEX IF NOT EXISTS idx_memory_media_ai_category 
  ON memory_media ((ai_labels->>'category'));

-- Index for processed status (for finding unprocessed images)
CREATE INDEX IF NOT EXISTS idx_memory_media_ai_processed 
  ON memory_media (ai_processed) 
  WHERE ai_processed = false OR ai_processed IS NULL;

-- Helper function to search memories by tag
CREATE OR REPLACE FUNCTION search_memories_by_tag(
  p_user_id UUID,
  p_tag TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  memory_id UUID,
  relevance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    mm.memory_id,
    CASE 
      WHEN mm.ai_labels->'allTags' ? p_tag THEN 10  -- exact match
      ELSE 5  -- partial match via ILIKE below
    END as relevance
  FROM memory_media mm
  WHERE mm.user_id = p_user_id
    AND mm.ai_labels IS NOT NULL
    AND (
      mm.ai_labels->'allTags' ? p_tag
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(mm.ai_labels->'allTags') t
        WHERE t ILIKE '%' || p_tag || '%'
      )
    )
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to get all unique tags for a user (for autocomplete)
CREATE OR REPLACE FUNCTION get_user_tags(p_user_id UUID)
RETURNS TABLE (
  tag TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tag,
    COUNT(*)::BIGINT as count
  FROM memory_media mm
  CROSS JOIN LATERAL jsonb_array_elements_text(mm.ai_labels->'allTags') t(tag)
  WHERE mm.user_id = p_user_id
    AND mm.ai_labels IS NOT NULL
  GROUP BY t.tag
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_memories_by_tag TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tags TO authenticated;
