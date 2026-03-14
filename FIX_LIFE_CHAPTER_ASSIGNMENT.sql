-- Fix life_chapter assignment - better matching logic
UPDATE engagement_prompts SET life_chapter = 
  CASE 
    -- Childhood (early_life, childhood, birth, parents, siblings, grandparents)
    WHEN category IN ('childhood', 'early_life') THEN 'childhood'
    WHEN category LIKE '%child%' THEN 'childhood'
    WHEN category LIKE '%birth%' THEN 'childhood'
    WHEN category LIKE '%parent%' THEN 'childhood'
    WHEN category LIKE '%sibling%' THEN 'childhood'
    WHEN category LIKE '%grandparent%' THEN 'childhood'
    WHEN prompt_text LIKE '%earliest memory%' THEN 'childhood'
    WHEN prompt_text LIKE '%where were you born%' THEN 'childhood'
    WHEN prompt_text LIKE '%parents%' THEN 'childhood'
    
    -- Teenage
    WHEN category LIKE '%teenage%' THEN 'teenage'
    WHEN category LIKE '%teen%' THEN 'teenage'
    
    -- High School
    WHEN category LIKE '%high_school%' THEN 'high_school'
    WHEN category LIKE '%school%' AND category NOT LIKE '%college%' THEN 'high_school'
    
    -- College
    WHEN category LIKE '%college%' THEN 'college'
    WHEN category LIKE '%university%' THEN 'college'
    
    -- Career / Jobs
    WHEN category IN ('career', 'jobs_career', 'work') THEN 'jobs_career'
    WHEN category LIKE '%job%' THEN 'jobs_career'
    WHEN category LIKE '%career%' THEN 'jobs_career'
    WHEN prompt_text LIKE '%first job%' THEN 'jobs_career'
    
    -- Relationships (spouse, partner, marriage, kids, family - but not childhood family)
    WHEN category IN ('relationships', 'marriage', 'family') THEN 'relationships'
    WHEN category LIKE '%spouse%' THEN 'relationships'
    WHEN category LIKE '%partner%' THEN 'relationships'
    WHEN category LIKE '%marriage%' THEN 'relationships'
    WHEN category LIKE '%wedding%' THEN 'relationships'
    WHEN prompt_text LIKE '%spouse%' THEN 'relationships'
    WHEN prompt_text LIKE '%partner%' THEN 'relationships'
    
    -- Travel
    WHEN category LIKE '%travel%' THEN 'travel'
    WHEN category LIKE '%trip%' THEN 'travel'
    WHEN prompt_text LIKE '%place%changed your perspective%' THEN 'travel'
    
    -- Spirituality
    WHEN category IN ('faith', 'religion', 'spirituality') THEN 'spirituality'
    WHEN category LIKE '%faith%' THEN 'spirituality'
    WHEN category LIKE '%spiritual%' THEN 'spirituality'
    WHEN category LIKE '%religion%' THEN 'spirituality'
    
    -- Wisdom (knowledge type prompts)
    WHEN type = 'knowledge' THEN 'wisdom_legacy'
    WHEN type = 'recipes_wisdom' THEN 'wisdom_legacy'
    WHEN category LIKE '%wisdom%' THEN 'wisdom_legacy'
    WHEN category LIKE '%lesson%' THEN 'wisdom_legacy'
    
    -- Life Moments (general memories, interests, hobbies)
    WHEN category LIKE '%interest%' THEN 'life_moments'
    WHEN category LIKE '%hobby%' THEN 'life_moments'
    WHEN category IN ('self', 'experiences', 'general') THEN 'life_moments'
    
    -- Default fallback
    ELSE 'life_moments'
  END;

-- Verify distribution
SELECT life_chapter, COUNT(*) as count
FROM engagement_prompts
WHERE status = 'pending'
GROUP BY life_chapter
ORDER BY count DESC;
