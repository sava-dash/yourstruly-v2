-- Migration 069: Fix engagement prompts variety
-- CRITICAL: This ensures fresh, diverse prompts every time

-- ============================================
-- STEP 1: Deactivate ALL repetitive/boring templates
-- ============================================
UPDATE prompt_templates 
SET is_active = false 
WHERE prompt_text ILIKE '%recipe%'
   OR prompt_text ILIKE '%Share a family recipe%'
   OR prompt_text ILIKE '%favorite recipe%'
   OR prompt_text ILIKE '%grandmother cook%'
   OR prompt_text ILIKE '%mother cook best%';

-- ============================================
-- STEP 2: Clear ALL pending prompts for fresh start
-- (Keep answered/skipped for history)
-- ============================================
DELETE FROM engagement_prompts 
WHERE status = 'pending';

-- ============================================
-- STEP 3: Improved shuffle function with MUCH better variety
-- ============================================
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
  SELECT r.id, r.user_id, r.type, r.category, r.prompt_text, r.prompt_template_id,
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

-- ============================================
-- STEP 4: Improved prompt generation with better variety
-- ============================================
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
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- ============================================
  -- PERSONALIZED PROMPTS (60% - most engaging)
  -- ============================================
  
  -- 1. Skill-based prompts with dynamic replacement
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{skill}}%' OR target_skill IS NOT NULL)
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(
          COALESCE(v_template.prompt_text, ''),
          '{{skill}}',
          v_skill
        );
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_prompt_text, 
                70 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('skill', v_skill))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.2;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.2;
    END LOOP;
  END IF;
  
  -- 2. Interest-based prompts with dynamic replacement
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{interest}}%' OR LOWER(target_interest) = LOWER(v_interest))
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(
          COALESCE(v_template.prompt_text, ''),
          '{{interest}}',
          v_interest
        );
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_prompt_text,
                68 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('interest', v_interest))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.4;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.4;
    END LOOP;
  END IF;
  
  -- 3. Hobby-based prompts
  IF v_profile.hobbies IS NOT NULL AND array_length(v_profile.hobbies, 1) > 0 THEN
    FOREACH v_hobby IN ARRAY v_profile.hobbies
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{hobby}}%' OR LOWER(target_hobby) = LOWER(v_hobby))
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(
          COALESCE(v_template.prompt_text, ''),
          '{{hobby}}',
          v_hobby
        );
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'hobbies'), v_prompt_text,
                66 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('hobby', v_hobby))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.5;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.5;
    END LOOP;
  END IF;
  
  -- 4. Life goals prompts
  IF v_profile.life_goals IS NOT NULL AND array_length(v_profile.life_goals, 1) > 0 THEN
    FOREACH v_goal IN ARRAY v_profile.life_goals
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{life_goal}}%' OR LOWER(target_life_goal) = LOWER(v_goal))
        ORDER BY RANDOM()
        LIMIT 1
      LOOP
        v_prompt_text := REPLACE(
          COALESCE(v_template.prompt_text, ''),
          '{{life_goal}}',
          LOWER(v_goal)
        );
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'goals'), v_prompt_text,
                64 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('life_goal', v_goal))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.6;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.6;
    END LOOP;
  END IF;
  
  -- ============================================
  -- DEEP REFLECTION PROMPTS (30% - thought-provoking)
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
      AND category IN ('self', 'relationships', 'experiences', 'wisdom', 'childhood', 'legacy', 'career')
      AND target_skill IS NULL 
      AND target_interest IS NULL
      AND target_hobby IS NULL
      AND prompt_text NOT LIKE '%{{%'  -- No placeholders
    ORDER BY priority_boost DESC, RANDOM()
    LIMIT GREATEST(5, (p_count * 0.3)::INTEGER)
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text,
            60 + COALESCE(v_template.priority_boost, 0), 'system')
    ON CONFLICT DO NOTHING;
    
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- ============================================
  -- FILL REMAINING WITH VARIETY (10%)
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
      AND type IN ('knowledge', 'memory_prompt')
      AND prompt_text NOT LIKE '%{{%'
      AND prompt_text NOT ILIKE '%recipe%'
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - v_prompt_count)
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

-- ============================================
-- STEP 5: Mark prompts as shown when retrieved
-- ============================================
CREATE OR REPLACE FUNCTION mark_prompts_shown(p_prompt_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE engagement_prompts
  SET shown_at = NOW()
  WHERE id = ANY(p_prompt_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Add cooldown when prompt is skipped
-- ============================================
CREATE OR REPLACE FUNCTION skip_prompt(p_prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE engagement_prompts
  SET 
    status = 'skipped',
    skipped_at = NOW(),
    -- Similar prompts get a cooldown
    cooldown_until = NOW() + INTERVAL '7 days'
  WHERE id = p_prompt_id;
  
  -- Also cooldown the template so we don't regenerate similar ones
  UPDATE engagement_prompts
  SET cooldown_until = NOW() + INTERVAL '3 days'
  WHERE prompt_template_id = (SELECT prompt_template_id FROM engagement_prompts WHERE id = p_prompt_id)
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION shuffle_engagement_prompts IS 'Get diverse, non-repetitive prompts prioritizing personalization';
COMMENT ON FUNCTION generate_engagement_prompts IS 'Generate fresh personalized prompts from user profile data';
