-- Remove legacy "Where was this photo taken?" engagement prompts.
-- Photos now carry EXIF location most of the time, so these questions
-- are redundant — the prompt generation pipeline (see
-- 20260417_photo_prompts_use_exif.sql + the Gemini generator at
-- /api/engagement/generate-photo-prompt) now asks content-focused
-- questions instead.
--
-- Only touches prompts that haven't been surfaced to the user yet.

DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND photo_id IS NOT NULL
  AND (
    prompt_text ILIKE 'Where was this photo taken%'
    OR prompt_text ILIKE 'Where was this taken%'
    OR prompt_text ILIKE 'Where was this?%'
  );

-- Also clear any prompt_templates rows with the same deprecated text so
-- the generate_photo_prompts() function can't pick them at random.
UPDATE prompt_templates
SET is_active = FALSE
WHERE is_active = TRUE
  AND type = 'photo_backstory'
  AND (
    prompt_text ILIKE 'Where was this photo taken%'
    OR prompt_text ILIKE 'Where was this taken%'
    OR prompt_text ILIKE 'Where was this?%'
  );

NOTIFY pgrst, 'reload schema';
