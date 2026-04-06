-- Fix shuffle_engagement_prompts to actually randomize the final order
-- Previously: ORDER BY slot_group, priority DESC (deterministic — first card always the same)
-- Now: ORDER BY RANDOM() for true shuffle

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE,
  p_life_chapter TEXT DEFAULT NULL
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
BEGIN
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));

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
  photo_pick AS (
    SELECT a.*, 1 AS slot_group
    FROM available a
    WHERE a.photo_id IS NOT NULL
      AND a.type IN ('photo_backstory'::prompt_type, 'tag_person'::prompt_type)
    ORDER BY RANDOM()
    LIMIT 1
  ),
  contact_pick AS (
    SELECT a.*, 2 AS slot_group
    FROM available a
    WHERE a.contact_id IS NOT NULL
      AND a.id NOT IN (SELECT id FROM photo_pick)
    ORDER BY RANDOM()
    LIMIT 1
  ),
  remaining AS (
    SELECT a.*, 3 AS slot_group,
      ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY RANDOM()) AS cat_rank
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM photo_pick)
      AND a.id NOT IN (SELECT id FROM contact_pick)
  ),
  fill_picks AS (
    SELECT * FROM remaining
    WHERE cat_rank = 1
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - (SELECT COUNT(*) FROM photo_pick) - (SELECT COUNT(*) FROM contact_pick))
  ),
  combined AS (
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM photo_pick
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM contact_pick
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM fill_picks
  )
  SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
         photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
         compare_memory_id, missing_field, status, priority, created_at,
         shown_at, answered_at, skipped_at, expires_at, cooldown_until,
         response_type, response_text, response_audio_url, response_data,
         result_memory_id, result_knowledge_id, source, personalization_context,
         metadata, updated_at
  FROM combined
  ORDER BY RANDOM();  -- TRUE random order every shuffle

  UPDATE engagement_prompts
  SET shown_at = NOW()
  WHERE id IN (SELECT id FROM combined);
END;
$$ LANGUAGE plpgsql;
