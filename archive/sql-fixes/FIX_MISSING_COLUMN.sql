-- ============================================================================
-- FIX: Add missing life_chapter column to engagement_prompts
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- 1. Add the column
ALTER TABLE engagement_prompts 
  ADD COLUMN IF NOT EXISTS life_chapter TEXT;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_engagement_prompts_life_chapter 
  ON engagement_prompts(life_chapter);

-- 3. Update existing prompts with life chapters
UPDATE engagement_prompts SET life_chapter = 
  CASE 
    WHEN type = 'photo_backstory' THEN 'childhood'
    WHEN type = 'memory_prompt' AND category LIKE '%childhood%' THEN 'childhood'
    WHEN type = 'memory_prompt' AND category LIKE '%teenage%' THEN 'teenage'
    WHEN type = 'memory_prompt' AND category LIKE '%school%' THEN 'high_school'
    WHEN type = 'memory_prompt' AND category LIKE '%career%' THEN 'jobs_career'
    WHEN type = 'memory_prompt' AND category LIKE '%relationship%' THEN 'relationships'
    WHEN type = 'memory_prompt' AND category LIKE '%travel%' THEN 'travel'
    WHEN type = 'memory_prompt' AND category LIKE '%spiritual%' THEN 'spirituality'
    WHEN type = 'knowledge' THEN 'wisdom_legacy'
    WHEN type = 'favorites_firsts' THEN 'life_moments'
    WHEN type = 'recipes_wisdom' THEN 'wisdom_legacy'
    WHEN type IN ('missing_info', 'quick_question', 'contact_info') THEN 'relationships'
    WHEN type = 'postscript' THEN 'future_messages'
    ELSE 'life_moments'
  END
WHERE life_chapter IS NULL;

-- 4. Verify
SELECT COUNT(*) as total, 
       COUNT(life_chapter) as with_chapter,
       COUNT(*) - COUNT(life_chapter) as missing_chapter
FROM engagement_prompts;

-- Done! You should see all prompts now have a life_chapter assigned.
