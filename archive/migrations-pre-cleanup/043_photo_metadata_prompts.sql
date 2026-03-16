-- ============================================================================
-- Migration: Photo Metadata Engagement Prompts
-- Created: 2026-02-23
-- Description: Add prompts for photos missing date/location metadata
-- ============================================================================

-- Add prompts for photo metadata (using 'missing_info' type)
INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES
  ('photo_meta_date_001', 'missing_info', 'photo_date',
   'When was this photo taken?',
   ARRAY['What year is this from?', 'Do you remember when this was?'],
   15),
  
  ('photo_meta_location_001', 'missing_info', 'photo_location',
   'Where was this photo taken?',
   ARRAY['What location is this?', 'Can you tell us where this was?'],
   15),
  
  ('photo_meta_both_001', 'missing_info', 'photo_both',
   'Can you add the date and location for this photo?',
   ARRAY['Help us place this photo in time and space'],
   20)
ON CONFLICT (id) DO NOTHING;

-- Helper function to get photos missing metadata for a user
CREATE OR REPLACE FUNCTION get_photos_missing_metadata(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  media_id UUID,
  file_url TEXT,
  missing_date BOOLEAN,
  missing_location BOOLEAN,
  memory_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mm.id as media_id,
    mm.file_url,
    (mm.taken_at IS NULL) as missing_date,
    (mm.exif_lat IS NULL AND mm.exif_lng IS NULL) as missing_location,
    m.title as memory_title
  FROM memory_media mm
  JOIN memories m ON mm.memory_id = m.id
  WHERE mm.user_id = p_user_id
    AND (mm.taken_at IS NULL OR (mm.exif_lat IS NULL AND mm.exif_lng IS NULL))
  ORDER BY mm.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_photos_missing_metadata IS 'Returns photos that need date or location metadata for engagement prompts';
