-- ============================================================================
-- COMPLETE FINAL FIX - Generate 60+ prompts with 6+ per life chapter
-- ============================================================================

-- Helper function (keep existing)
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
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated generate function: creates 60-80 prompts with balanced distribution
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 60  -- Changed from 20 to 60
)
RETURNS INTEGER AS $$
DECLARE
  v_prompt_count INTEGER := 0;
  v_template RECORD;
  v_life_chapter TEXT;
  v_chapter_counts JSONB := '{}';
BEGIN
  -- Generate prompts from ALL life chapter categories
  -- Ensure each chapter gets at least 6 prompts
  FOR v_template IN 
    WITH templates_by_chapter AS (
      SELECT *, 
        map_category_to_life_chapter(category, type::TEXT) as life_chapter_computed,
        ROW_NUMBER() OVER (PARTITION BY map_category_to_life_chapter(category, type::TEXT) ORDER BY priority_boost DESC NULLS LAST, RANDOM()) as rn
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
    SELECT * FROM templates_by_chapter
    WHERE life_chapter_computed IS NOT NULL
      AND rn <= 8  -- Up to 8 prompts per chapter (80 total max)
    ORDER BY RANDOM()
    LIMIT p_count
  LOOP
    v_life_chapter := map_category_to_life_chapter(v_template.category, v_template.type::TEXT);
    
    INSERT INTO engagement_prompts (
      user_id, type, category, life_chapter, 
      prompt_text, prompt_template_id, priority, source
    )
    VALUES (
      p_user_id, v_template.type, v_template.category, v_life_chapter, 
      v_template.prompt_text, v_template.id,
      50 + COALESCE(v_template.priority_boost, 0), 'system'
    )
    ON CONFLICT DO NOTHING;
    
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear all pending prompts
DELETE FROM engagement_prompts WHERE status = 'pending';

-- Verify
SELECT '✅ Functions updated! Click Shuffle in dashboard to generate 60+ prompts (6+ per chapter)' as status;
