-- ============================================================================
-- COMPLETE LIFE CHAPTER FIX - Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Helper function to map category → life_chapter
CREATE OR REPLACE FUNCTION map_category_to_life_chapter(p_category TEXT, p_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN p_category IN ('childhood', 'early_life') THEN 'childhood'
    WHEN p_category LIKE '%child%' THEN 'childhood'
    WHEN p_category IN ('teenage') THEN 'teenage'
    WHEN p_category IN ('high_school', 'school') THEN 'high_school'
    WHEN p_category IN ('college', 'university', 'education') THEN 'college'
    WHEN p_category IN ('career', 'jobs_career', 'work') THEN 'jobs_career'
    WHEN p_category IN ('relationships', 'marriage', 'family', 'parenting') THEN 'relationships'
    WHEN p_category IN ('travel', 'places_lived') THEN 'travel'
    WHEN p_category IN ('spirituality', 'faith', 'religion') THEN 'spirituality'
    WHEN p_category IN ('wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values') THEN 'wisdom_legacy'
    WHEN p_type = 'knowledge' AND p_category NOT IN ('interests', 'hobbies', 'skills') THEN 'wisdom_legacy'
    WHEN p_category IN ('life_moments', 'milestones', 'celebration', 'firsts') THEN 'life_moments'
    ELSE 'life_moments'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Fix existing prompts that are NULL or incorrectly assigned
UPDATE engagement_prompts
SET life_chapter = map_category_to_life_chapter(category, type::TEXT)
WHERE life_chapter IS NULL;

-- Step 3: Update generate function to assign life_chapter
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
  v_life_chapter TEXT;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Skills (10%)
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates WHERE is_active = TRUE AND (prompt_text LIKE '%{{skill}}%' OR target_skill IS NOT NULL)
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{skill}}', v_skill);
        v_life_chapter := map_category_to_life_chapter(v_template.category, v_template.type::TEXT);
        
        INSERT INTO engagement_prompts (user_id, type, category, life_chapter, prompt_text, prompt_template_id, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_life_chapter, v_prompt_text, v_template.id,
                70 + COALESCE(v_template.priority_boost, 0), 'profile_based', jsonb_build_object('skill', v_skill))
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.1;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.1;
    END LOOP;
  END IF;
  
  -- Interests (10%)
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates WHERE is_active = TRUE AND (prompt_text LIKE '%{{interest}}%' OR LOWER(target_interest) = LOWER(v_interest))
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{interest}}', v_interest);
        v_life_chapter := map_category_to_life_chapter(v_template.category, v_template.type::TEXT);
        
        INSERT INTO engagement_prompts (user_id, type, category, life_chapter, prompt_text, prompt_template_id, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_life_chapter, v_prompt_text, v_template.id,
                68 + COALESCE(v_template.priority_boost, 0), 'profile_based', jsonb_build_object('interest', v_interest))
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.2;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.2;
    END LOOP;
  END IF;
  
  -- Fill with DIVERSE life chapter prompts (80%) - equal distribution
  FOR v_template IN 
    WITH categorized AS (
      SELECT *, 
        map_category_to_life_chapter(category, type::TEXT) as computed_life_chapter,
        ROW_NUMBER() OVER (PARTITION BY map_category_to_life_chapter(category, type::TEXT) ORDER BY RANDOM()) as rn
      FROM prompt_templates 
      WHERE is_active = TRUE 
        AND type IN ('knowledge', 'memory_prompt') 
        AND prompt_text NOT LIKE '%{{%'
        AND category IN (
          'childhood', 'teenage', 'high_school', 'college', 
          'jobs_career', 'career', 'relationships', 'travel', 
          'spirituality', 'faith', 'wisdom_legacy', 'wisdom',
          'life_moments', 'milestones', 'celebration'
        )
    )
    SELECT * FROM categorized
    WHERE rn <= 3  -- Max 3 per life chapter per generation
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - v_prompt_count)
  LOOP
    v_life_chapter := map_category_to_life_chapter(v_template.category, v_template.type::TEXT);
    
    INSERT INTO engagement_prompts (user_id, type, category, life_chapter, prompt_text, prompt_template_id, priority, source)
    VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'general'), v_life_chapter, v_template.prompt_text, v_template.id,
            50 + COALESCE(v_template.priority_boost, 0), 'system')
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Delete all pending prompts and regenerate fresh
DELETE FROM engagement_prompts WHERE status = 'pending';

-- Verify distribution (computed from category)
SELECT 
  map_category_to_life_chapter(category, type::TEXT) as life_chapter, 
  COUNT(*) as template_count
FROM prompt_templates
WHERE is_active = TRUE
  AND category IN ('childhood', 'teenage', 'high_school', 'college', 'jobs_career', 'career', 'relationships', 'travel', 'spirituality', 'faith', 'wisdom_legacy', 'wisdom', 'life_moments', 'milestones')
GROUP BY map_category_to_life_chapter(category, type::TEXT)
ORDER BY template_count DESC;

SELECT '✅ Ready! Click "Generate More" in dashboard to create prompts across all life chapters' as status;
