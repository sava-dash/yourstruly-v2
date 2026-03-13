-- Add life_chapter field to engagement_prompts table
ALTER TABLE engagement_prompts 
  ADD COLUMN IF NOT EXISTS life_chapter TEXT;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_engagement_prompts_life_chapter 
  ON engagement_prompts(life_chapter);

-- Update existing prompts with life chapters based on their type/category
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

COMMENT ON COLUMN engagement_prompts.life_chapter IS 
  'Life chapter category: childhood, teenage, high_school, college, jobs_career, relationships, travel, spirituality, wisdom_legacy, life_moments, future_messages';
