-- Migration 084: Fix missing prompt_type enum values
-- =============================================================================
-- ROOT CAUSE ANALYSIS:
-- The generate_engagement_prompts function's photo loop was not executing because
-- migrations 076-083 all failed to apply. These migrations reference enum values
-- that don't exist in the prompt_type enum:
--   - 'contact_story' (used for contact-based prompts)
--   - 'memory_elaboration' (used for memory follow-ups)
--   - 'wisdom_elaboration' (used for wisdom follow-ups)
--
-- When PostgreSQL tries to CREATE OR REPLACE a function that references an invalid
-- enum value, the entire CREATE statement fails, leaving the OLD function version
-- in place. The old version (from migration 069) had NO photo loop at all.
--
-- This explains why:
--   1. The photo FOR loop never executed (the function was from 069, pre-photo support)
--   2. A debug function worked (it was created separately without the enum issue)
--   3. The same query worked standalone (no enum casting required)
--
-- FIX:
--   1. Add the missing enum values to prompt_type
--   2. Recreate generate_engagement_prompts with proper photo + contact support
-- =============================================================================

-- STEP 1: Add missing enum values
-- Note: DO block required for conditional ALTER TYPE

DO $$ 
BEGIN
  -- Add contact_story if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'contact_story' 
                 AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'contact_story';
  END IF;
END $$;

DO $$ 
BEGIN
  -- Add memory_elaboration if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'memory_elaboration' 
                 AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'memory_elaboration';
  END IF;
END $$;

DO $$ 
BEGIN
  -- Add wisdom_elaboration if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'wisdom_elaboration' 
                 AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'wisdom_elaboration';
  END IF;
END $$;

-- STEP 2: Recreate the generate_engagement_prompts function with full support
-- This version includes photo_backstory, contact_story, and all prompt types

CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_prompt_count INTEGER := 0;
  v_template RECORD;
  v_prompt_text TEXT;
  v_skill TEXT;
  v_interest TEXT;
  v_hobby TEXT;
  v_photo RECORD;
  v_contact RECORD;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- ============================================
  -- PHOTO PROMPTS (25% - high engagement)
  -- Cooldown: 10 days to allow re-prompting for same photo
  -- ============================================
  FOR v_photo IN 
    SELECT mm.id as media_id, mm.file_url
    FROM memory_media mm
    WHERE mm.user_id = p_user_id
      -- Handle both 'image' and 'image/jpeg' style file_type values
      AND (mm.file_type = 'image' OR mm.file_type LIKE 'image/%')
      -- Exclude photos that already have recent prompts
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.photo_id = mm.id 
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '10 days'
      )
    ORDER BY mm.created_at DESC
    LIMIT 5  -- Fixed limit instead of percentage for reliability
  LOOP
    -- Get a random photo_backstory template
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'photo_backstory' AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      BEGIN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, photo_id, 
          priority, source, personalization_context
        )
        VALUES (
          p_user_id, 'photo_backstory', 'photos', v_template.prompt_text, v_photo.media_id,
          80 + COALESCE(v_template.priority_boost, 0), 'photo_based',
          jsonb_build_object('photo_url', v_photo.file_url)
        );
        v_prompt_count := v_prompt_count + 1;
      EXCEPTION WHEN unique_violation THEN
        -- Skip duplicates silently
        NULL;
      END;
    END IF;
  END LOOP;
  
  -- ============================================
  -- CONTACT STORY PROMPTS (15%)
  -- Ask about relationships and memories with contacts
  -- ============================================
  FOR v_contact IN 
    SELECT c.id as contact_id, c.full_name
    FROM contacts c
    WHERE c.user_id = p_user_id
      AND c.full_name IS NOT NULL AND c.full_name != ''
      -- Exclude contacts that already have recent prompts
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.contact_id = c.id 
          AND ep.type = 'contact_story'
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '60 days'
      )
    ORDER BY RANDOM()
    LIMIT 3
  LOOP
    -- Get a random contact_story template
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'contact_story' AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.full_name);
      
      BEGIN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, contact_id,
          priority, source, personalization_context
        )
        VALUES (
          p_user_id, 'contact_story', 'relationships', v_prompt_text, v_contact.contact_id,
          75 + COALESCE(v_template.priority_boost, 0), 'contact_based',
          jsonb_build_object('contact_name', v_contact.full_name)
        );
        v_prompt_count := v_prompt_count + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END LOOP;
  
  -- ============================================
  -- SKILL-BASED PROMPTS
  -- ============================================
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{skill}}%' OR target_skill IS NOT NULL)
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{skill}}', v_skill);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_prompt_text, 
                  70 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('skill', v_skill));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 8;
      END LOOP;
      EXIT WHEN v_prompt_count >= 8;
    END LOOP;
  END IF;
  
  -- ============================================
  -- INTEREST-BASED PROMPTS
  -- ============================================
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{interest}}%' OR LOWER(target_interest) = LOWER(v_interest))
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{interest}}', v_interest);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_prompt_text,
                  68 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('interest', v_interest));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 12;
      END LOOP;
      EXIT WHEN v_prompt_count >= 12;
    END LOOP;
  END IF;
  
  -- ============================================
  -- HOBBY-BASED PROMPTS
  -- ============================================
  IF v_profile.hobbies IS NOT NULL AND array_length(v_profile.hobbies, 1) > 0 THEN
    FOREACH v_hobby IN ARRAY v_profile.hobbies
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{hobby}}%' OR LOWER(target_hobby) = LOWER(v_hobby))
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{hobby}}', v_hobby);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'hobbies'), v_prompt_text,
                  66 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('hobby', v_hobby));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 16;
      END LOOP;
      EXIT WHEN v_prompt_count >= 16;
    END LOOP;
  END IF;
  
  -- ============================================
  -- GENERIC PROMPTS (fill remainder)
  -- Ensures we always have some prompts even without profile data
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
      AND type IN ('memory_prompt', 'knowledge', 'favorites_firsts')
      AND prompt_text NOT LIKE '%{{%'  -- No placeholders
    ORDER BY RANDOM()
    LIMIT GREATEST(5, p_count - v_prompt_count)
  LOOP
    BEGIN
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text,
              60 + COALESCE(v_template.priority_boost, 0), 'template');
      v_prompt_count := v_prompt_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Ensure the photo_backstory templates exist
-- (These should already exist but let's make sure)

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('photo_story_001', 'photo_backstory', 'photos', 'What''s the story behind this photo?', 10, true),
('photo_story_002', 'photo_backstory', 'photos', 'Tell me about this moment - where were you and who were you with?', 10, true),
('photo_story_003', 'photo_backstory', 'photos', 'What makes this photo special to you?', 10, true),
('photo_story_004', 'photo_backstory', 'photos', 'I''d love to hear the story behind this picture!', 10, true),
('photo_story_005', 'photo_backstory', 'photos', 'What happy memory does this photo bring back?', 10, true),
('photo_story_006', 'photo_backstory', 'photos', 'Who took this photo? What was the occasion?', 9, true),
('photo_story_007', 'photo_backstory', 'photos', 'What were you feeling in this moment?', 9, true),
('photo_story_008', 'photo_backstory', 'photos', 'Is there a fun story behind this picture?', 9, true)
ON CONFLICT (id) DO UPDATE SET 
  type = EXCLUDED.type,
  prompt_text = EXCLUDED.prompt_text, 
  is_active = true;

-- STEP 4: Ensure the contact_story templates exist
-- (These may have failed to insert if the enum value didn't exist)

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('contact_happy_001', 'contact_story', 'relationships', 'What''s your happiest memory with {{contact_name}}?', 8, true),
('contact_happy_002', 'contact_story', 'relationships', 'What do you love most about {{contact_name}}?', 8, true),
('contact_happy_003', 'contact_story', 'relationships', 'What''s the funniest thing that happened with {{contact_name}}?', 7, true),
('contact_happy_004', 'contact_story', 'relationships', 'What adventure have you had with {{contact_name}}?', 7, true),
('contact_happy_005', 'contact_story', 'relationships', 'What makes {{contact_name}} special to you?', 8, true),
('contact_happy_006', 'contact_story', 'relationships', 'Tell me a fun story about you and {{contact_name}}', 7, true),
('contact_happy_007', 'contact_story', 'relationships', 'What''s something {{contact_name}} taught you?', 7, true),
('contact_happy_008', 'contact_story', 'relationships', 'What celebration or special occasion did you share with {{contact_name}}?', 6, true)
ON CONFLICT (id) DO UPDATE SET 
  type = EXCLUDED.type,
  prompt_text = EXCLUDED.prompt_text, 
  is_active = true;

-- STEP 5: Clear pending prompts to regenerate with the working function
DELETE FROM engagement_prompts WHERE status = 'pending';

-- STEP 6: Grant execute permission
GRANT EXECUTE ON FUNCTION generate_engagement_prompts(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION generate_engagement_prompts IS 
  'Generate personalized prompts including photo_backstory, contact_story, and profile-based questions. Fixed in migration 084 by adding missing enum values.';
