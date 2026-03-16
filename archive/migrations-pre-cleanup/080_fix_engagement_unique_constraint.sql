-- Migration 080: Fix engagement prompts unique constraint
-- Issue: Constraint on (user_id, prompt_text) prevents multiple photo_backstory prompts
--        since they share the same template text. Only one photo prompt could exist at a time.
-- Fix: Include photo_id and contact_id in the constraint so each photo/contact can have its own prompt.

-- Drop the old constraint
DROP INDEX IF EXISTS idx_engagement_prompts_no_dupe;

-- Create new constraint that allows same prompt_text for different photos/contacts
CREATE UNIQUE INDEX idx_engagement_prompts_no_dupe 
ON engagement_prompts (
  user_id, 
  prompt_text, 
  COALESCE(photo_id::text, ''),
  COALESCE(contact_id::text, '')
) 
WHERE (status = 'pending');

COMMENT ON INDEX idx_engagement_prompts_no_dupe IS 'Prevent duplicate pending prompts per user, but allow same text for different photos/contacts';
