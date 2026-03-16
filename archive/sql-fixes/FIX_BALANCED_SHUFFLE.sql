-- ============================================================================
-- Fix shuffle_engagement_prompts to return BALANCED distribution
-- Ensures each life chapter gets represented equally
-- ============================================================================

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Count pending
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW());
  
  -- Generate more if needed
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 60);
  END IF;
  
  -- Return BALANCED prompts: 4 per life chapter (round-robin)
  RETURN QUERY
  WITH ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY life_chapter ORDER BY priority DESC, RANDOM()) as rn
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND life_chapter IS NOT NULL
  )
  SELECT 
    id, user_id, type, category, prompt_text, prompt_template_id,
    photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
    compare_memory_id, missing_field, status, priority, created_at,
    shown_at, answered_at, skipped_at, expires_at, cooldown_until,
    response_type, response_text, response_audio_url, response_data,
    result_memory_id, result_knowledge_id, source, personalization_context,
    metadata, updated_at, life_chapter
  FROM ranked
  WHERE rn <= 4  -- Max 4 per chapter = 40 total (10 chapters × 4)
  ORDER BY life_chapter, rn
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'Shuffle function updated for balanced distribution!' as status;
