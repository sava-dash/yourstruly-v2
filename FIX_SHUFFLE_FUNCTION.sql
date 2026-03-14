-- ============================================================================
-- FIX: Update shuffle_engagement_prompts to include life_chapter column
-- ============================================================================

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
BEGIN
  -- Get prompts shown in last 24 hours to avoid repetition
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '24 hours';
  
  -- Check how many pending prompts exist (excluding recently shown)
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));
  
  -- Generate more if needed (always generate fresh when low)
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 30);
  END IF;
  
  -- Return shuffled prompts with type diversity AND text diversity
  RETURN QUERY
  WITH 
  -- Exclude recently shown prompts
  available AS (
    SELECT ep.*
    FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown))
  ),
  -- Rank by type and category for diversity
  ranked AS (
    SELECT 
      a.*,
      ROW_NUMBER() OVER (PARTITION BY a.type ORDER BY RANDOM()) AS type_rank,
      ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY RANDOM()) AS category_rank
    FROM available a
  )
  SELECT 
    r.id, r.user_id, r.type, r.category, r.life_chapter,  -- life_chapter added here
    r.prompt_text, r.prompt_template_id,
    r.photo_id, r.contact_id, r.memory_id, r.compare_photo_id, r.compare_contact_id,
    r.compare_memory_id, r.missing_field, r.status, r.priority, r.created_at,
    r.shown_at, r.answered_at, r.skipped_at, r.expires_at, r.cooldown_until,
    r.response_type, r.response_text, r.response_audio_url, r.response_data,
    r.result_memory_id, r.result_knowledge_id, r.source, r.personalization_context,
    r.metadata, r.updated_at
  FROM ranked r
  WHERE r.type_rank <= 2  -- Max 2 of same type
    AND r.category_rank <= 3  -- Max 3 of same category
  ORDER BY 
    r.priority DESC,
    -- Prefer personalized prompts
    CASE WHEN r.source = 'profile_based' THEN 0 ELSE 1 END,
    RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT 'Function updated successfully!' as status;
