-- Reset all prompts to pending status (for testing)
UPDATE engagement_prompts 
SET status = 'pending', 
    updated_at = NOW()
WHERE status IN ('answered', 'skipped', 'dismissed');

-- Re-activate prompt templates
UPDATE prompt_templates
SET is_active = TRUE,
    updated_at = NOW()
WHERE is_active = FALSE;

-- Show counts
SELECT 'Prompts reset to pending:' as action, COUNT(*) as count 
FROM engagement_prompts WHERE status = 'pending';

SELECT 'Templates activated:' as action, COUNT(*) as count
FROM prompt_templates WHERE is_active = TRUE;
