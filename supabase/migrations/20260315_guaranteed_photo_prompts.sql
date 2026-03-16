-- Guaranteed Photo Prompts
-- Every uploaded photo should generate engagement prompts asking:
-- 1. Where was this taken? (location)
-- 2. Who is in this photo? (tag_person) 
-- 3. What's the backstory? (photo_backstory)

-- ===========================================
-- FUNCTION: Generate prompts for a single photo
-- ===========================================
CREATE OR REPLACE FUNCTION generate_photo_prompts(
  p_media_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_template RECORD;
  v_prompt_text TEXT;
BEGIN
  -- Check if photo prompts already exist for this media
  IF EXISTS (
    SELECT 1 FROM engagement_prompts 
    WHERE photo_id = p_media_id AND user_id = p_user_id
  ) THEN
    RETURN; -- Already has prompts
  END IF;

  -- 1. Create "Where was this?" prompt (location)
  SELECT * INTO v_template
  FROM prompt_templates
  WHERE type = 'photo_backstory' AND is_active = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_template.id IS NOT NULL THEN
    INSERT INTO engagement_prompts (
      user_id, type, category, prompt_text, prompt_template_id,
      photo_id, status, priority, source
    ) VALUES (
      p_user_id, 'photo_backstory'::prompt_type, 'photos',
      COALESCE(v_template.prompt_text, 'Where was this photo taken and what was happening?'),
      v_template.id, p_media_id, 'pending'::prompt_status, 85, 'photo_upload'
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Fallback if no template exists
    INSERT INTO engagement_prompts (
      user_id, type, category, prompt_text,
      photo_id, status, priority, source
    ) VALUES (
      p_user_id, 'photo_backstory'::prompt_type, 'photos',
      'Where was this photo taken and what was happening?',
      p_media_id, 'pending'::prompt_status, 85, 'photo_upload'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- 2. Create "Who is in this photo?" prompt
  INSERT INTO engagement_prompts (
    user_id, type, category, prompt_text,
    photo_id, status, priority, source
  ) VALUES (
    p_user_id, 'tag_person'::prompt_type, 'photos',
    'Who is in this photo? Tag the people you recognize.',
    p_media_id, 'pending'::prompt_status, 80, 'photo_upload'
  ) ON CONFLICT DO NOTHING;

  -- 3. Create backstory/memory prompt
  INSERT INTO engagement_prompts (
    user_id, type, category, prompt_text,
    photo_id, status, priority, source
  ) VALUES (
    p_user_id, 'photo_backstory'::prompt_type, 'photos',
    'What''s the story behind this moment? What were you feeling?',
    p_media_id, 'pending'::prompt_status, 75, 'photo_upload'
  ) ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGER: Auto-generate prompts on photo upload
-- ===========================================
CREATE OR REPLACE FUNCTION trigger_photo_prompts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for images, not videos
  IF NEW.file_type = 'image' THEN
    PERFORM generate_photo_prompts(NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_photo_upload ON memory_media;

-- Create trigger
CREATE TRIGGER on_photo_upload
  AFTER INSERT ON memory_media
  FOR EACH ROW
  EXECUTE FUNCTION trigger_photo_prompts();

-- ===========================================
-- BACKFILL: Generate prompts for existing photos without prompts
-- ===========================================
DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT mm.id, mm.user_id
    FROM memory_media mm
    WHERE mm.file_type = 'image'
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.photo_id = mm.id
      )
    LIMIT 1000  -- Process in batches
  LOOP
    PERFORM generate_photo_prompts(r.id, r.user_id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Generated prompts for % photos', v_count;
END $$;

-- ===========================================
-- UPDATE shuffle_engagement_prompts to PRIORITIZE recent photo uploads
-- ===========================================
CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
BEGIN
  -- Get prompts shown in last 24 hours to avoid repetition
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '24 hours';
  
  -- Check how many pending prompts exist
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));
  
  -- Generate more if needed
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 30);
  END IF;
  
  -- Return prompts with GUARANTEED photo slots for recent uploads
  RETURN QUERY
  WITH 
  available AS (
    SELECT ep.*
    FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown))
  ),
  -- 1. PRIORITY: Recent photo uploads (last 7 days) - GUARANTEED 2 slots
  recent_photos AS (
    SELECT a.*, 1 AS slot_group
    FROM available a
    JOIN memory_media mm ON a.photo_id = mm.id
    WHERE a.photo_id IS NOT NULL
      AND mm.created_at > NOW() - INTERVAL '7 days'
    ORDER BY mm.created_at DESC, a.priority DESC
    LIMIT 2
  ),
  -- 2. Pick a contact prompt
  contact_pick AS (
    SELECT a.*, 2 AS slot_group
    FROM available a
    WHERE a.contact_id IS NOT NULL
      AND a.id NOT IN (SELECT id FROM recent_photos)
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  -- 3. Fill remaining with diverse prompts
  remaining AS (
    SELECT a.*, 3 AS slot_group,
      ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY a.priority DESC, RANDOM()) AS cat_rank
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM recent_photos)
      AND a.id NOT IN (SELECT id FROM contact_pick)
  ),
  fill_picks AS (
    SELECT * FROM remaining
    WHERE cat_rank = 1
    ORDER BY priority DESC, RANDOM()
    LIMIT GREATEST(0, p_count - (SELECT COUNT(*) FROM recent_photos) - (SELECT COUNT(*) FROM contact_pick))
  ),
  combined AS (
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM recent_photos
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM contact_pick
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM fill_picks
  )
  SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
         photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
         compare_memory_id, missing_field, status, priority, created_at,
         shown_at, answered_at, skipped_at, expires_at, cooldown_until,
         response_type, response_text, response_audio_url, response_data,
         result_memory_id, result_knowledge_id, source, personalization_context,
         metadata, updated_at
  FROM combined
  ORDER BY slot_group, priority DESC;

  -- Mark as shown
  UPDATE engagement_prompts
  SET shown_at = NOW()
  WHERE id IN (SELECT id FROM combined);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_photo_prompts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION shuffle_engagement_prompts(UUID, INTEGER, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION generate_photo_prompts IS 'Generate engagement prompts for a photo: location, people, and backstory';
COMMENT ON FUNCTION shuffle_engagement_prompts IS 'Get prompts with priority for recent photo uploads (2 guaranteed slots)';
