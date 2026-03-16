-- ============================================================================
-- COMPLETE FIX: Restore both shuffle and generate functions
-- This is the FINAL fix - no more iterations
-- ============================================================================

-- Step 1: Recreate generate_engagement_prompts (we deleted it with CASCADE)
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_prompt_count INTEGER := 0;
  v_template RECORD;
  v_prompt_text TEXT;
  v_skill TEXT;
  v_interest TEXT;
  v_hobby TEXT;
  v_goal TEXT;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Skills
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates WHERE is_active = TRUE AND (prompt_text LIKE '%{{skill}}%' OR target_skill IS NOT NULL)
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{skill}}', v_skill);
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_prompt_text, 
                70 + COALESCE(v_template.priority_boost, 0), 'profile_based', jsonb_build_object('skill', v_skill))
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.2;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.2;
    END LOOP;
  END IF;
  
  -- Interests
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates WHERE is_active = TRUE AND (prompt_text LIKE '%{{interest}}%' OR LOWER(target_interest) = LOWER(v_interest))
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{interest}}', v_interest);
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_prompt_text,
                68 + COALESCE(v_template.priority_boost, 0), 'profile_based', jsonb_build_object('interest', v_interest))
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.4;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.4;
    END LOOP;
  END IF;
  
  -- Fill remaining
  FOR v_template IN 
    SELECT * FROM prompt_templates WHERE is_active = TRUE AND type IN ('knowledge', 'memory_prompt') AND prompt_text NOT LIKE '%{{%'
    ORDER BY RANDOM() LIMIT GREATEST(0, p_count - v_prompt_count)
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'general'), v_template.prompt_text,
            50 + COALESCE(v_template.priority_boost, 0), 'system')
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Recreate shuffle function (simple version - just return rows)
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
    PERFORM generate_engagement_prompts(p_user_id, 30);
  END IF;
  
  -- Return prompts (simple, no CTEs)
  RETURN QUERY
  SELECT * FROM engagement_prompts ep
  WHERE ep.user_id = p_user_id
    AND ep.status = 'pending'
    AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
  ORDER BY ep.priority DESC, RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Both functions restored!' as status;
