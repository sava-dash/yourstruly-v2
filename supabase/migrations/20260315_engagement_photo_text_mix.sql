-- ============================================
-- ENGAGEMENT CLUSTER: Photo + Text Mix Rules
-- ============================================
-- 1. "Photos" category = exclusively photo-based
-- 2. Every other category gets photo prompt options
-- 3. Slot allocation: guaranteed mix of photo + text

-- ============================================
-- DROP existing versions to avoid conflicts
-- ============================================
DROP FUNCTION IF EXISTS shuffle_engagement_prompts(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS ensure_category_photo_prompts(UUID);
DROP FUNCTION IF EXISTS generate_engagement_prompts_with_photos(UUID, INTEGER);

-- ============================================
-- STEP 1: Add photo prompt templates for EVERY category
-- ============================================

-- Insert photo-enabled prompts for each major category
INSERT INTO engagement_prompts (user_id, type, category, life_chapter, prompt_text, status, priority, source)
SELECT DISTINCT 
  ep.user_id,
  'photo_backstory'::prompt_type,
  ep.category,
  ep.life_chapter,
  CASE ep.category
    WHEN 'early_life' THEN 'Share a photo from your early childhood. What do you remember about this time?'
    WHEN 'childhood' THEN 'Do you have a photo from your childhood? Tell us about it.'
    WHEN 'teenage' THEN 'Share a photo from your teenage years. What was life like then?'
    WHEN 'high_school' THEN 'Do you have a high school photo? Share the story behind it.'
    WHEN 'college' THEN 'Share a photo from your college days. What memories does it bring back?'
    WHEN 'career' THEN 'Share a photo from your career journey. What was this moment?'
    WHEN 'jobs_career' THEN 'Do you have a photo from work? What was happening?'
    WHEN 'relationships' THEN 'Share a photo of someone special to you. Tell us about them.'
    WHEN 'family' THEN 'Share a favorite family photo. Who is in it and when was it taken?'
    WHEN 'parenting' THEN 'Share a photo of a parenting moment. What was happening?'
    WHEN 'travel' THEN 'Share a photo from a trip. Where were you and what was special about it?'
    WHEN 'spirituality' THEN 'Share a photo from a meaningful spiritual moment or place.'
    WHEN 'hobbies' THEN 'Share a photo of you doing something you love. What is it?'
    WHEN 'interests' THEN 'Share a photo related to one of your interests.'
    WHEN 'skills' THEN 'Share a photo of something you created or accomplished.'
    WHEN 'favorites' THEN 'Share a photo of one of your favorite things or places.'
    WHEN 'celebration' THEN 'Share a photo from a celebration. What were you celebrating?'
    WHEN 'milestones' THEN 'Share a photo from a major milestone in your life.'
    WHEN 'firsts' THEN 'Share a photo of a "first" experience.'
    WHEN 'wisdom_legacy' THEN 'Share a photo that represents something important you learned.'
    WHEN 'legacy' THEN 'Share a photo you want future generations to see.'
    WHEN 'health' THEN 'Share a photo related to health or wellness in your life.'
    WHEN 'education' THEN 'Share a photo from your education journey.'
    WHEN 'friendship' THEN 'Share a photo with friends. What was the occasion?'
    WHEN 'places_lived' THEN 'Share a photo of a place you lived. What was it like there?'
    WHEN 'seasonal' THEN 'Share a photo from a holiday or season you remember fondly.'
    WHEN 'life_moments' THEN 'Share a photo from a memorable life moment.'
    WHEN 'life_lessons' THEN 'Share a photo that reminds you of an important lesson.'
    WHEN 'values' THEN 'Share a photo that represents your values.'
    ELSE 'Share a photo and tell us the story behind it.'
  END,
  'pending'::prompt_status,
  70,  -- Medium-high priority
  'category_photo'
FROM engagement_prompts ep
WHERE ep.category NOT IN ('photos', 'contact_info', 'metadata', 'verification', 'postscript')
  AND ep.category IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM engagement_prompts ep2 
    WHERE ep2.user_id = ep.user_id 
      AND ep2.category = ep.category 
      AND ep2.source = 'category_photo'
  )
GROUP BY ep.user_id, ep.category, ep.life_chapter;

-- ============================================
-- STEP 2: Update shuffle function with new slot rules
-- ============================================

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
  
  -- NEW SLOT ALLOCATION:
  -- Slot 1: Recent photo upload (< 7 days) - GUARANTEED if exists
  -- Slot 2: Text-based personalized prompt - GUARANTEED
  -- Slots 3-5: Mix with at least 1 more text, 1 more photo-enabled
  
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
  
  -- SLOT 1: Recent photo upload prompt (last 7 days)
  recent_photo AS (
    SELECT a.*, 1 AS slot_group
    FROM available a
    JOIN memory_media mm ON a.photo_id = mm.id
    WHERE a.photo_id IS NOT NULL
      AND mm.created_at > NOW() - INTERVAL '7 days'
    ORDER BY mm.created_at DESC, a.priority DESC
    LIMIT 1
  ),
  
  -- SLOT 2: Text-based personalized prompt (NO photo_id)
  text_prompt AS (
    SELECT a.*, 2 AS slot_group
    FROM available a
    WHERE a.photo_id IS NULL
      AND a.id NOT IN (SELECT id FROM recent_photo)
      AND a.category NOT IN ('photos', 'contact_info', 'metadata')
    ORDER BY 
      CASE WHEN a.source = 'profile_based' THEN 0 ELSE 1 END,
      a.priority DESC,
      RANDOM()
    LIMIT 1
  ),
  
  -- SLOT 3: Another text prompt (different category)
  text_prompt_2 AS (
    SELECT a.*, 3 AS slot_group
    FROM available a
    WHERE a.photo_id IS NULL
      AND a.id NOT IN (SELECT id FROM recent_photo)
      AND a.id NOT IN (SELECT id FROM text_prompt)
      AND a.category NOT IN (SELECT category FROM text_prompt)
      AND a.category NOT IN ('photos', 'contact_info', 'metadata')
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  
  -- SLOT 4: Photo-enabled prompt (could be category_photo or photo_backstory)
  photo_enabled AS (
    SELECT a.*, 4 AS slot_group
    FROM available a
    WHERE (a.photo_id IS NOT NULL OR a.source = 'category_photo' OR a.type = 'photo_backstory')
      AND a.id NOT IN (SELECT id FROM recent_photo)
      AND a.id NOT IN (SELECT id FROM text_prompt)
      AND a.id NOT IN (SELECT id FROM text_prompt_2)
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  
  -- SLOT 5: Any remaining (variety)
  fill_slot AS (
    SELECT a.*, 5 AS slot_group
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM recent_photo)
      AND a.id NOT IN (SELECT id FROM text_prompt)
      AND a.id NOT IN (SELECT id FROM text_prompt_2)
      AND a.id NOT IN (SELECT id FROM photo_enabled)
      AND a.category NOT IN (
        SELECT category FROM recent_photo
        UNION SELECT category FROM text_prompt
        UNION SELECT category FROM text_prompt_2
        UNION SELECT category FROM photo_enabled
      )
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  
  combined AS (
    SELECT * FROM recent_photo
    UNION ALL SELECT * FROM text_prompt
    UNION ALL SELECT * FROM text_prompt_2
    UNION ALL SELECT * FROM photo_enabled
    UNION ALL SELECT * FROM fill_slot
  )
  
  SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
         photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
         compare_memory_id, missing_field, status, priority, created_at,
         shown_at, answered_at, skipped_at, expires_at, cooldown_until,
         response_type, response_text, response_audio_url, response_data,
         result_memory_id, result_knowledge_id, source, personalization_context,
         metadata, updated_at
  FROM combined
  ORDER BY slot_group;

  -- Mark as shown
  UPDATE engagement_prompts
  SET shown_at = NOW()
  WHERE id IN (SELECT id FROM combined);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Create function to ensure every user has photo prompts per category
-- ============================================

CREATE OR REPLACE FUNCTION ensure_category_photo_prompts(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_cat TEXT;
  v_chapter TEXT;
BEGIN
  -- Get all categories this user has prompts for
  FOR v_cat, v_chapter IN 
    SELECT DISTINCT category, life_chapter 
    FROM engagement_prompts 
    WHERE user_id = p_user_id 
      AND category NOT IN ('photos', 'contact_info', 'metadata', 'verification', 'postscript')
      AND category IS NOT NULL
  LOOP
    -- Check if user already has a photo prompt for this category
    IF NOT EXISTS (
      SELECT 1 FROM engagement_prompts 
      WHERE user_id = p_user_id 
        AND category = v_cat 
        AND (photo_id IS NOT NULL OR source = 'category_photo')
        AND status = 'pending'
    ) THEN
      -- Insert photo prompt for this category
      INSERT INTO engagement_prompts (user_id, type, category, life_chapter, prompt_text, status, priority, source)
      VALUES (
        p_user_id,
        'photo_backstory'::prompt_type,
        v_cat,
        v_chapter,
        'Share a photo related to ' || REPLACE(v_cat, '_', ' ') || '. What''s the story?',
        'pending'::prompt_status,
        70,
        'category_photo'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Update generate_engagement_prompts to include photo options
-- ============================================

-- Wrap existing generate to also add photo prompts
CREATE OR REPLACE FUNCTION generate_engagement_prompts_with_photos(
  p_user_id UUID,
  p_count INTEGER DEFAULT 30
)
RETURNS VOID AS $$
BEGIN
  -- Call original generator
  PERFORM generate_engagement_prompts(p_user_id, p_count);
  
  -- Ensure photo prompts exist for all categories
  PERFORM ensure_category_photo_prompts(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION shuffle_engagement_prompts(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_category_photo_prompts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_engagement_prompts_with_photos(UUID, INTEGER) TO authenticated;

-- ============================================
-- STEP 5: Backfill photo prompts for existing users
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_total INTEGER := 0;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM engagement_prompts LOOP
    v_total := v_total + ensure_category_photo_prompts(v_user.user_id);
  END LOOP;
  RAISE NOTICE 'Created % category photo prompts for existing users', v_total;
END $$;

COMMENT ON FUNCTION shuffle_engagement_prompts IS 
'Get 5 prompts with guaranteed mix:
- Slot 1: Recent photo (< 7 days) if available
- Slot 2: Text-based personalized prompt  
- Slot 3: Another text prompt (different category)
- Slot 4: Photo-enabled prompt
- Slot 5: Variety fill';
