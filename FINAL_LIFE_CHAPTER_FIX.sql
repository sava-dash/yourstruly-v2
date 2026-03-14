-- ============================================================================
-- FINAL LIFE CHAPTER FIX
-- Run this in Supabase SQL Editor to fix empty categories
-- ============================================================================

-- Step 1: Helper function
CREATE OR REPLACE FUNCTION map_category_to_life_chapter(p_category TEXT, p_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN p_category IN ('childhood', 'early_life') THEN 'childhood'
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
    ELSE NULL  -- Interests/hobbies/skills don't get a life_chapter (excluded from filters)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Update generate function - NO interests/hobbies/skills in life chapters
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
  v_life_chapter TEXT;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Generate ONLY from life chapter templates (no interests/hobbies/skills)
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
          'childhood', 'early_life',
          'teenage',
          'high_school', 'school',
          'college', 'university', 'education',
          'career', 'jobs_career', 'work',
          'relationships', 'marriage', 'family', 'parenting',
          'travel', 'places_lived',
          'spirituality', 'faith', 'religion',
          'wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values',
          'life_moments', 'milestones', 'celebration', 'firsts'
        )
    )
    SELECT * FROM categorized
    WHERE computed_life_chapter IS NOT NULL  -- Exclude NULL (interests/hobbies)
      AND rn <= 3  -- Max 3 per life chapter
    ORDER BY RANDOM()
    LIMIT p_count
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

-- Step 3: Delete all existing prompts and regenerate
DELETE FROM engagement_prompts WHERE status = 'pending';

-- Step 4: Verify template distribution
SELECT 
  map_category_to_life_chapter(category, type::TEXT) as life_chapter, 
  COUNT(*) as template_count
FROM prompt_templates
WHERE is_active = TRUE
  AND category IN (
    'childhood', 'early_life', 'teenage', 'high_school', 'school',
    'college', 'university', 'education', 'career', 'jobs_career', 'work',
    'relationships', 'marriage', 'family', 'parenting',
    'travel', 'places_lived',
    'spirituality', 'faith', 'religion',
    'wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values',
    'life_moments', 'milestones', 'celebration', 'firsts'
  )
GROUP BY map_category_to_life_chapter(category, type::TEXT)
ORDER BY template_count DESC;
