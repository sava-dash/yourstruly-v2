-- Migration 077: Fix photo prompt generation to include memory-attached photos
-- Issue: Migration 076 filtered WHERE memory_id IS NULL, excluding most user photos
-- Fix: Remove that filter so ALL photos can generate backstory prompts

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
  -- Fixed: Removed memory_id IS NULL filter
  -- Now includes ALL photos (standalone AND memory-attached)
  -- ============================================
  FOR v_photo IN 
    SELECT mm.id as media_id, mm.file_url
    FROM memory_media mm
    WHERE mm.user_id = p_user_id
      AND mm.file_type LIKE 'image/%'
      -- Exclude photos that already have recent prompts
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.photo_id = mm.id 
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '30 days'
      )
    ORDER BY mm.created_at DESC
    LIMIT (p_count * 0.25)::INTEGER
  LOOP
    -- Get a random photo template
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'photo_backstory' AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      INSERT INTO engagement_prompts (
        user_id, type, category, prompt_text, photo_id, 
        priority, source, personalization_context
      )
      VALUES (
        p_user_id, 'photo_backstory', 'photos', v_template.prompt_text, v_photo.media_id,
        80 + COALESCE(v_template.priority_boost, 0), 'photo_based',
        jsonb_build_object('photo_url', v_photo.file_url)
      )
      ON CONFLICT DO NOTHING;
      
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- ============================================
  -- CONTACT STORY PROMPTS (15%)
  -- ============================================
  FOR v_contact IN 
    SELECT c.id as contact_id, c.full_name, c.avatar_url
    FROM contacts c
    WHERE c.user_id = p_user_id
      AND c.full_name IS NOT NULL AND c.full_name != ''
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.contact_id = c.id 
          AND ep.type = 'contact_story' 
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '60 days'
      )
    ORDER BY RANDOM()
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'contact_story' AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.full_name);
      
      INSERT INTO engagement_prompts (
        user_id, type, category, prompt_text, contact_id,
        priority, source, personalization_context
      )
      VALUES (
        p_user_id, 'contact_story', 'relationships', v_prompt_text, v_contact.contact_id,
        75 + COALESCE(v_template.priority_boost, 0), 'contact_based',
        jsonb_build_object('contact_name', v_contact.full_name)
      )
      ON CONFLICT DO NOTHING;
      
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- ============================================
  -- PERSONALIZED PROMPTS (60%)
  -- ============================================
  
  -- Skill-based prompts
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{skill}}%' OR target_skill IS NOT NULL)
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{skill}}', v_skill);
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_prompt_text, 
                70 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('skill', v_skill))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.4;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.4;
    END LOOP;
  END IF;
  
  -- Interest-based prompts
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{interest}}%' OR LOWER(target_interest) = LOWER(v_interest))
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{interest}}', v_interest);
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_prompt_text,
                68 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('interest', v_interest))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.6;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.6;
    END LOOP;
  END IF;
  
  -- Hobby-based prompts
  IF v_profile.hobbies IS NOT NULL AND array_length(v_profile.hobbies, 1) > 0 THEN
    FOREACH v_hobby IN ARRAY v_profile.hobbies
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND (prompt_text LIKE '%{{hobby}}%' OR LOWER(target_hobby) = LOWER(v_hobby))
        ORDER BY RANDOM()
        LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{hobby}}', v_hobby);
        
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'hobbies'), v_prompt_text,
                66 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('hobby', v_hobby))
        ON CONFLICT DO NOTHING;
        
        v_prompt_count := v_prompt_count + 1;
        EXIT WHEN v_prompt_count >= p_count * 0.8;
      END LOOP;
      EXIT WHEN v_prompt_count >= p_count * 0.8;
    END LOOP;
  END IF;
  
  -- ============================================
  -- GENERIC PROMPTS (fill remainder)
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
      AND type IN ('memory_prompt', 'knowledge', 'favorites_firsts')
      AND prompt_text NOT LIKE '%{{%'
    ORDER BY RANDOM()
    LIMIT (p_count - v_prompt_count)
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text,
            60 + COALESCE(v_template.priority_boost, 0), 'template')
    ON CONFLICT DO NOTHING;
    
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regenerate prompts for all users to include photo prompts
DELETE FROM engagement_prompts WHERE status = 'pending';

COMMENT ON FUNCTION generate_engagement_prompts IS 'Generate personalized prompts including photo backstory (ALL photos), contact stories, and profile-based questions. Fixed in 077 to include memory-attached photos.';
