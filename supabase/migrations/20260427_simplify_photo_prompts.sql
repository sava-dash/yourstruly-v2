-- Engagement cards already display location + date above the question when
-- EXIF metadata is present (and "Location not found" / "Date not saved"
-- when it isn't), so the prompt itself shouldn't ask where/when.
--
-- Replaces both signatures of generate_photo_prompts() with a simpler
-- variant that asks one of:
--   * "What's happening in this photo?"
--   * "What's the story behind this photo?"
--
-- Also rewrites pending engagement_prompts with the verbose EXIF-embedded
-- text (from 20260417_photo_prompts_use_exif.sql) and any remaining
-- "Where was this..." rows the 20260423 purge missed because they didn't
-- start with that exact prefix.

-- ---------------------------------------------------------------------------
-- Drop the existing generate_photo_prompts(uuid, uuid) so we can rename the
-- parameters. Postgres rejects CREATE OR REPLACE when input parameter names
-- change (error 42P13), and only one (uuid, uuid) overload can exist.
--
-- We keep a SINGLE function with the legacy signature
--   generate_photo_prompts(p_media_id UUID, p_user_id UUID)
-- because that's what the on_photo_upload trigger calls. The dashboard's
-- batch path (generate_engagement_prompts → photos_needing_backstory) was
-- already passing photo_id as the first argument, so this single signature
-- covers every caller in the codebase.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS generate_photo_prompts(UUID, UUID);

CREATE FUNCTION generate_photo_prompts(
  p_media_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_prompt_text TEXT;
BEGIN
  -- Skip if this photo already has prompts queued
  IF EXISTS (
    SELECT 1 FROM engagement_prompts
    WHERE photo_id = p_media_id AND user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  -- Alternate between the two short prompts so the user sees variety.
  -- The card itself surfaces location + date when the EXIF is present.
  IF random() < 0.5 THEN
    v_prompt_text := 'What''s happening in this photo?';
  ELSE
    v_prompt_text := 'What''s the story behind this photo?';
  END IF;

  INSERT INTO engagement_prompts (
    user_id, type, category, prompt_text,
    photo_id, status, priority, source
  ) VALUES (
    p_user_id, 'photo_backstory'::prompt_type, 'photos',
    v_prompt_text,
    p_media_id, 'pending'::prompt_status, 85, 'photo_upload'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO engagement_prompts (
    user_id, type, category, prompt_text,
    photo_id, status, priority, source
  ) VALUES (
    p_user_id, 'tag_person'::prompt_type, 'photos',
    'Who is in this photo? Tag the people you recognize.',
    p_media_id, 'pending'::prompt_status, 80, 'photo_upload'
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. Rewrite still-pending rows that use the verbose EXIF-embedded prompt
--    text or any "where/when was this taken" wording the 20260423 purge
--    missed (e.g. mid-sentence rather than as a prefix).
-- ---------------------------------------------------------------------------
UPDATE engagement_prompts
SET prompt_text = CASE
  WHEN random() < 0.5 THEN 'What''s happening in this photo?'
  ELSE 'What''s the story behind this photo?'
END
WHERE status = 'pending'
  AND type = 'photo_backstory'
  AND photo_id IS NOT NULL
  AND (
    -- 20260417_photo_prompts_use_exif.sql verbose forms
    prompt_text ILIKE 'This photo was taken in%'
    OR prompt_text ILIKE 'This photo is from around%'
    OR prompt_text ILIKE 'Look at this photo for a moment%'
    -- Anything still asking where/when
    OR prompt_text ILIKE '%where was this%'
    OR prompt_text ILIKE '%when was this taken%'
  );

-- ---------------------------------------------------------------------------
-- 4. Deactivate any prompt_templates that still use where/when wording so
--    generate_engagement_prompts can't pick them at random.
-- ---------------------------------------------------------------------------
UPDATE prompt_templates
SET is_active = FALSE
WHERE is_active = TRUE
  AND type = 'photo_backstory'
  AND (
    prompt_text ILIKE '%where was this%'
    OR prompt_text ILIKE '%when was this taken%'
  );

NOTIFY pgrst, 'reload schema';
