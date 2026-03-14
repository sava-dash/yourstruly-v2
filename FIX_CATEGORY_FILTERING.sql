-- ============================================================================
-- Fix Category Filtering - Fetch Prompts By Selected Category Only
-- ============================================================================

-- Update shuffle to accept life_chapter filter
CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE,
  p_life_chapter TEXT DEFAULT NULL  -- NEW: Filter by specific life chapter
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Count pending prompts (filtered by life_chapter if provided)
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (p_life_chapter IS NULL OR life_chapter = p_life_chapter OR (p_life_chapter = 'all' AND life_chapter IS NULL));
  
  -- Generate more if needed
  IF v_pending_count < p_count OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 80);
  END IF;
  
  -- Return prompts for selected category (or all if NULL)
  RETURN QUERY
  SELECT 
    id, user_id, type, category, prompt_text, prompt_template_id,
    photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
    compare_memory_id, missing_field, status, priority, created_at,
    shown_at, answered_at, skipped_at, expires_at, cooldown_until,
    response_type, response_text, response_audio_url, response_data,
    result_memory_id, result_knowledge_id, source, personalization_context,
    metadata, updated_at, life_chapter
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (
      p_life_chapter IS NULL OR  -- All chapters
      life_chapter = p_life_chapter OR  -- Specific chapter
      (p_life_chapter = 'all' AND life_chapter IS NULL)  -- "All Chapters" category (NULL life_chapter)
    )
  ORDER BY priority DESC, RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Category filtering fixed - prompts fetched per selected category!' as status;
