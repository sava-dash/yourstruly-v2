-- ============================================================================
-- Migration: Missing Info Templates for Contacts
-- Created: 2026-02-20
-- Description: Add templates for contact missing info prompts
-- ============================================================================

-- ============================================================================
-- MISSING INFO TEMPLATES - Contact Information
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, target_field, priority_boost, is_active) VALUES

-- Birthday
('missing_info_birthday_001', 'missing_info', 'contact_info',
 'When is {{contact_name}}''s birthday?',
 ARRAY['Do you know {{contact_name}}''s birthday?', 'What''s {{contact_name}}''s date of birth?'],
 'birth_date', 10, TRUE),

('missing_info_birthday_002', 'missing_info', 'contact_info',
 'Add {{contact_name}}''s birthday so you don''t forget!',
 ARRAY['Help us remember {{contact_name}}''s special day'],
 'date_of_birth', 10, TRUE),

-- How Met
('missing_info_howmet_001', 'missing_info', 'contact_info',
 'How did you meet {{contact_name}}?',
 ARRAY['Tell us the story of how you and {{contact_name}} first met', 'Where did you meet {{contact_name}}?'],
 'how_met', 8, TRUE),

-- Contact Info (phone/email)
('missing_info_contact_001', 'missing_info', 'contact_info',
 'Add {{contact_name}}''s phone or email',
 ARRAY['Do you have {{contact_name}}''s contact info?', 'How do you reach {{contact_name}}?'],
 'contact_info', 5, TRUE),

('missing_info_phone_001', 'missing_info', 'contact_info',
 'What''s {{contact_name}}''s phone number?',
 ARRAY['Add {{contact_name}}''s phone number'],
 'phone', 5, TRUE),

('missing_info_email_001', 'missing_info', 'contact_info',
 'What''s {{contact_name}}''s email address?',
 ARRAY['Add {{contact_name}}''s email'],
 'email', 5, TRUE),

-- Address
('missing_info_address_001', 'missing_info', 'contact_info',
 'Where does {{contact_name}} live?',
 ARRAY['Add {{contact_name}}''s address', 'What''s {{contact_name}}''s current address?'],
 'address', 3, TRUE),

-- Relationship
('missing_info_relationship_001', 'missing_info', 'contact_info',
 'What is your relationship with {{contact_name}}?',
 ARRAY['How are you related to {{contact_name}}?', 'Who is {{contact_name}} to you?'],
 'relationship', 6, TRUE)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  target_field = EXCLUDED.target_field,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Update generate function to include contact metadata in prompts
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_prompt_count INTEGER := 0;
  v_template prompt_templates%ROWTYPE;
  v_photo RECORD;
  v_contact RECORD;
  v_face RECORD;
  v_current_month INTEGER;
  v_prompt_text TEXT;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;
  
  -- 1. Generate photo backstory prompts (20%)
  FOR v_photo IN 
    SELECT * FROM photos_needing_backstory 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.2)::INTEGER
  LOOP
    INSERT INTO engagement_prompts (user_id, type, photo_id, prompt_text, priority, source)
    VALUES (
      p_user_id, 
      'photo_backstory', 
      v_photo.media_id,
      'What''s the story behind this photo?',
      60 + LEAST(30, (EXTRACT(EPOCH FROM (NOW() - v_photo.created_at)) / 86400)::INTEGER),
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 2. Generate tag person prompts (15%)
  FOR v_face IN 
    SELECT * FROM untagged_faces 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    INSERT INTO engagement_prompts (user_id, type, photo_id, prompt_text, priority, source, metadata)
    VALUES (
      p_user_id,
      'tag_person',
      v_face.media_id,
      'Who is this person?',
      70,
      'system',
      jsonb_build_object(
        'face_id', v_face.face_id,
        'bbox', jsonb_build_object('x', v_face.bbox_x, 'y', v_face.bbox_y, 'w', v_face.bbox_width, 'h', v_face.bbox_height),
        'suggested_contact_id', v_face.suggested_contact_id,
        'suggested_contact_name', v_face.suggested_contact_name
      )
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 3. Generate missing info prompts (15%)
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    -- Try to find a template for this missing field
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info' 
      AND target_field = v_contact.missing_field
      AND is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Use template text or generate a default
    IF FOUND THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name);
    ELSE
      -- Fallback prompt text
      v_prompt_text := 'Update ' || v_contact.name || '''s information';
    END IF;
    
    INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source, missing_field, metadata)
    VALUES (
      p_user_id,
      'missing_info',
      v_contact.contact_id,
      v_prompt_text,
      v_contact.priority,
      'system',
      v_contact.missing_field,
      jsonb_build_object(
        'contact', jsonb_build_object(
          'name', v_contact.name,
          'photo_url', v_contact.photo_url,
          'relationship', v_contact.relationship_type
        )
      )
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 4. Generate interest-based prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND target_interest IS NOT NULL
      AND target_interest = ANY(v_profile.interests)
    ORDER BY RANDOM()
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
    VALUES (
      p_user_id,
      v_template.type,
      v_template.category,
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'profile_based',
      jsonb_build_object('interest', v_template.target_interest)
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 5. Generate religion-based prompts (if religion set)
  IF v_profile.religion IS NOT NULL AND v_profile.religion != 'prefer_not_to_say' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE
        AND target_religion = v_profile.religion
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (
        p_user_id,
        v_template.type,
        v_template.category,
        v_template.prompt_text,
        50 + v_template.priority_boost,
        'profile_based',
        jsonb_build_object('religion', v_template.target_religion)
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 6. Generate seasonal prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND v_current_month = ANY(seasonal_months)
    ORDER BY RANDOM()
    LIMIT 2
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (
      p_user_id,
      v_template.type,
      'seasonal',
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'scheduled'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 7. Fill remaining with general prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND type IN ('knowledge', 'memory_prompt')
      AND target_interest IS NULL
      AND target_skill IS NULL
      AND target_hobby IS NULL
      AND target_religion IS NULL
      AND seasonal_months IS NULL
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - v_prompt_count)
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (
      p_user_id,
      v_template.type,
      v_template.category,
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE prompt_templates IS 'Now includes missing_info templates for contact fields';
