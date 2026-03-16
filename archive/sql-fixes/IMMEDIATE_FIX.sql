-- Delete existing prompts and regenerate with proper distribution
DELETE FROM engagement_prompts WHERE status = 'pending' AND user_id = '2ee5416f-ba61-4313-bb43-2722858d0f05';

-- Generate 8 prompts per category manually to ensure coverage
WITH templates_to_use AS (
  SELECT 
    id, type, category, prompt_text, priority_boost,
    map_category_to_life_chapter(category, type::TEXT) as life_chapter,
    ROW_NUMBER() OVER (PARTITION BY map_category_to_life_chapter(category, type::TEXT) ORDER BY priority_boost DESC NULLS LAST, RANDOM()) as rn
  FROM prompt_templates
  WHERE is_active = TRUE
    AND type IN ('knowledge', 'memory_prompt')
    AND prompt_text NOT LIKE '%{{%'
    AND map_category_to_life_chapter(category, type::TEXT) IS NOT NULL
)
INSERT INTO engagement_prompts (
  user_id, type, category, life_chapter, prompt_text, prompt_template_id, priority, source, status
)
SELECT
  '2ee5416f-ba61-4313-bb43-2722858d0f05'::UUID,
  type, category, life_chapter, prompt_text, id,
  50 + COALESCE(priority_boost, 0),
  'system', 'pending'
FROM templates_to_use
WHERE rn <= 8  -- Exactly 8 per life chapter
ORDER BY life_chapter, rn;

-- Verify the distribution
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
  END;
