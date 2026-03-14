-- Test if generate function works
SELECT generate_engagement_prompts('2ee5416f-ba61-4313-bb43-2722858d0f05'::UUID, 60);

-- Check results
SELECT 
  life_chapter,
  COUNT(*) as count
FROM engagement_prompts
WHERE user_id = '2ee5416f-ba61-4313-bb43-2722858d0f05'
  AND status = 'pending'
GROUP BY life_chapter
ORDER BY count DESC;
