-- ============================================================================
-- FINAL FIX V2: Fix ambiguous column reference
-- ============================================================================

DROP FUNCTION IF EXISTS shuffle_engagement_prompts(UUID, INTEGER, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type prompt_type,
  category TEXT,
  life_chapter TEXT,
  prompt_text TEXT,
  prompt_template_id UUID,
  photo_id UUID,
  contact_id UUID,
  memory_id UUID,
  compare_photo_id UUID,
  compare_contact_id UUID,
  compare_memory_id UUID,
  missing_field TEXT,
  status TEXT,
  priority INTEGER,
  created_at TIMESTAMPTZ,
  shown_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  response_type TEXT,
  response_text TEXT,
  response_audio_url TEXT,
  response_data JSONB,
  result_memory_id UUID,
  result_knowledge_id UUID,
  source TEXT,
  personalization_context JSONB,
  metadata JSONB,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
BEGIN
  -- FIXED: Use table-qualified column name ep.prompt_text
  SELECT ARRAY_AGG(ep.prompt_text) INTO v_recently_shown
  FROM engagement_prompts ep
  WHERE ep.user_id = p_user_id
    AND ep.shown_at > NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts ep
  WHERE ep.user_id = p_user_id
    AND ep.status = 'pending'
    AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown));
  
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 30);
  END IF;
  
  RETURN QUERY
  WITH 
  available AS (
    SELECT ep.*
    FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown))
  ),
  ranked AS (
    SELECT 
      a.*,
      ROW_NUMBER() OVER (PARTITION BY a.type ORDER BY RANDOM()) AS type_rank,
      ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY RANDOM()) AS category_rank
    FROM available a
  )
  SELECT 
    r.id, r.user_id, r.type, r.category, r.life_chapter,
    r.prompt_text, r.prompt_template_id,
    r.photo_id, r.contact_id, r.memory_id, r.compare_photo_id, r.compare_contact_id,
    r.compare_memory_id, r.missing_field, r.status, r.priority, r.created_at,
    r.shown_at, r.answered_at, r.skipped_at, r.expires_at, r.cooldown_until,
    r.response_type, r.response_text, r.response_audio_url, r.response_data,
    r.result_memory_id, r.result_knowledge_id, r.source, r.personalization_context,
    r.metadata, r.updated_at
  FROM ranked r
  WHERE r.type_rank <= 2
    AND r.category_rank <= 3
  ORDER BY 
    r.priority DESC,
    CASE WHEN r.source = 'profile_based' THEN 0 ELSE 1 END,
    RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Fixed ambiguous column reference!' as status;
