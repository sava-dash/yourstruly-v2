-- Photo prompts should use EXIF metadata (date, location) instead of asking
-- "where/when was this taken?" when we already know.
--
-- Updates the photos_needing_backstory view to include EXIF columns,
-- and rewrites generate_engagement_prompts to build richer photo prompts.

-- 1. Extend the view to include EXIF metadata
CREATE OR REPLACE VIEW photos_needing_backstory AS
SELECT
  mm.id AS media_id,
  mm.user_id,
  mm.file_url,
  mm.created_at,
  mm.taken_at,
  mm.exif_lat,
  mm.exif_lng,
  COALESCE(mm.location_name, '') AS location_name
FROM memory_media mm
LEFT JOIN memories m ON mm.memory_id = m.id
WHERE (m.description IS NULL OR m.description = '')
  AND mm.file_type LIKE 'image/%'
ORDER BY mm.created_at DESC;

-- 2. Replace the photo prompt generation to use metadata
-- This function is called by generate_engagement_prompts (the main generator)
CREATE OR REPLACE FUNCTION generate_photo_prompts(
  p_user_id UUID,
  p_photo_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_photo RECORD;
  v_prompt_text TEXT;
  v_date_str TEXT;
  v_location_str TEXT;
BEGIN
  FOR v_photo IN
    SELECT * FROM photos_needing_backstory
    WHERE user_id = p_user_id
      AND (p_photo_id IS NULL OR media_id = p_photo_id)
    LIMIT 20
  LOOP
    -- Build date string from EXIF
    v_date_str := NULL;
    IF v_photo.taken_at IS NOT NULL THEN
      v_date_str := to_char(v_photo.taken_at, 'Month YYYY');
    END IF;

    -- Build location string
    v_location_str := NULL;
    IF v_photo.location_name IS NOT NULL AND v_photo.location_name != '' THEN
      v_location_str := v_photo.location_name;
    END IF;

    -- Build contextual prompt text
    IF v_date_str IS NOT NULL AND v_location_str IS NOT NULL THEN
      -- We know both when and where
      v_prompt_text := 'This photo was taken in ' || v_location_str || ' around ' || trim(v_date_str) ||
        '. Think about what was going on in your life at that time. Who were you with, what brought you there, and what do you remember most about that day?';
    ELSIF v_date_str IS NOT NULL THEN
      -- We know when but not where
      v_prompt_text := 'This photo is from around ' || trim(v_date_str) ||
        '. Think about what was happening in your life during that time. Where were you, who was around, and what were you feeling? What do you remember most?';
    ELSIF v_location_str IS NOT NULL THEN
      -- We know where but not when
      v_prompt_text := 'This photo was taken in ' || v_location_str ||
        '. Think about what brought you there and what was going on at the time. Who were you with, what happened, and why does this place stick with you?';
    ELSE
      -- No metadata at all
      v_prompt_text := 'Look at this photo for a moment. Think about what was happening when it was taken. Who was there, where were you, and what was going on in your life? What do you remember most about that moment?';
    END IF;

    INSERT INTO engagement_prompts (user_id, type, photo_id, prompt_text, priority, source, tier, angle)
    VALUES (
      p_user_id,
      'photo_backstory',
      v_photo.media_id,
      v_prompt_text,
      60 + LEAST(EXTRACT(EPOCH FROM (NOW() - v_photo.created_at)) / 86400, 30)::INTEGER,
      'system',
      0,
      'event'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
