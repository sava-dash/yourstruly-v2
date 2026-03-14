-- ============================================================================
-- WORKING PROMPT GENERATION - Simplified, guaranteed to work
-- ============================================================================

-- Step 1: Ensure helper function exists
CREATE OR REPLACE FUNCTION map_category_to_life_chapter(p_category TEXT, p_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN p_category IN ('childhood', 'early_life') THEN 'childhood'
    WHEN p_category = 'teenage' THEN 'teenage'
    WHEN p_category IN ('high_school', 'school') THEN 'high_school'
    WHEN p_category IN ('college', 'university', 'education') THEN 'college'
    WHEN p_category IN ('career', 'jobs_career', 'work') THEN 'jobs_career'
    WHEN p_category IN ('relationships', 'marriage', 'family', 'parenting') THEN 'relationships'
    WHEN p_category IN ('travel', 'places_lived') THEN 'travel'
    WHEN p_category IN ('spirituality', 'faith', 'religion') THEN 'spirituality'
    WHEN p_category IN ('wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values') THEN 'wisdom_legacy'
    WHEN p_type = 'knowledge' THEN 'wisdom_legacy'
    WHEN p_category IN ('life_moments', 'milestones', 'celebration', 'firsts') THEN 'life_moments'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Simple, working generate function
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  -- Delete existing pending prompts for this user
  DELETE FROM engagement_prompts 
  WHERE user_id = p_user_id AND status = 'pending';
  
  -- Insert prompts from templates (simple version)
  WITH ranked_templates AS (
    SELECT 
      id,
      type,
      category,
      prompt_text,
      priority_boost,
      map_category_to_life_chapter(category, type::TEXT) as life_chapter,
      ROW_NUMBER() OVER (
        PARTITION BY map_category_to_life_chapter(category, type::TEXT) 
        ORDER BY priority_boost DESC NULLS LAST, RANDOM()
      ) as rn
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
  INSERT INTO engagement_prompts (
    user_id,
    type,
    category,
    life_chapter,
    prompt_text,
    prompt_template_id,
    priority,
    source,
    status
  )
  SELECT
    p_user_id,
    type,
    category,
    life_chapter,
    prompt_text,
    id,
    50 + COALESCE(priority_boost, 0),
    'system',
    'pending'
  FROM ranked_templates
  WHERE life_chapter IS NOT NULL
    AND rn <= 8  -- Max 8 per life chapter
  LIMIT p_count;
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Generate prompts NOW for the test user
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT generate_engagement_prompts('2ee5416f-ba61-4313-bb43-2722858d0f05'::UUID, 60) INTO v_count;
  RAISE NOTICE 'Generated % prompts', v_count;
END $$;

-- Step 4: Verify distribution
SELECT 
  life_chapter,
  COUNT(*) as count
FROM engagement_prompts
WHERE user_id = '2ee5416f-ba61-4313-bb43-2722858d0f05'
  AND status = 'pending'
GROUP BY life_chapter
ORDER BY 
  CASE life_chapter
    WHEN 'childhood' THEN 1
    WHEN 'teenage' THEN 2
    WHEN 'high_school' THEN 3
    WHEN 'college' THEN 4
    WHEN 'jobs_career' THEN 5
    WHEN 'relationships' THEN 6
    WHEN 'travel' THEN 7
    WHEN 'spirituality' THEN 8
    WHEN 'wisdom_legacy' THEN 9
    WHEN 'life_moments' THEN 10
    ELSE 99
  END;
