-- ============================================================================
-- Migration: Personal Contact Prompts
-- Created: 2026-02-23
-- Description: Add friendship-style, personal questions about contacts
--              Questions vary based on relationship type
-- ============================================================================

-- ============================================================================
-- QUICK QUESTION: Personal Connection Prompts (Contact-based)
-- These feel like questions friends would ask each other
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, subcategory, prompt_text, prompt_variations, priority_boost, is_active, target_field) VALUES

-- ============================================================================
-- GENERAL FRIENDSHIP QUESTIONS (work for any relationship)
-- ============================================================================
('contact_personal_001', 'quick_question', 'relationships', 'friendship',
 'What''s one thing about {{contact_name}} that always makes you smile?',
 ARRAY['What do you love most about {{contact_name}}?', 'What makes {{contact_name}} special to you?'],
 8, TRUE, 'contact_story'),

('contact_personal_002', 'quick_question', 'relationships', 'friendship',
 'What''s your favorite memory with {{contact_name}}?',
 ARRAY['Tell us about a great time you had with {{contact_name}}', 'What moment with {{contact_name}} stands out?'],
 10, TRUE, 'contact_story'),

('contact_personal_003', 'quick_question', 'relationships', 'friendship',
 'What does {{contact_name}} do better than anyone you know?',
 ARRAY['What''s {{contact_name}}''s superpower?', 'What are you most impressed by about {{contact_name}}?'],
 7, TRUE, 'contact_story'),

('contact_personal_004', 'quick_question', 'relationships', 'friendship',
 'When you think of {{contact_name}}, what''s the first thing that comes to mind?',
 ARRAY['What word describes {{contact_name}}?', 'If you had to describe {{contact_name}} in one sentence...'],
 6, TRUE, 'contact_story'),

('contact_personal_005', 'quick_question', 'relationships', 'friendship',
 'What''s something {{contact_name}} taught you?',
 ARRAY['What have you learned from {{contact_name}}?', 'How has {{contact_name}} influenced you?'],
 9, TRUE, 'contact_story'),

('contact_personal_006', 'quick_question', 'relationships', 'friendship',
 'What would {{contact_name}} want to be remembered for?',
 ARRAY['What does {{contact_name}} care most about?', 'What drives {{contact_name}}?'],
 8, TRUE, 'contact_story'),

('contact_personal_007', 'quick_question', 'relationships', 'friendship',
 'What''s an inside joke or funny story you share with {{contact_name}}?',
 ARRAY['What always makes you and {{contact_name}} laugh?', 'Tell us something funny about {{contact_name}}'],
 7, TRUE, 'contact_story'),

('contact_personal_008', 'quick_question', 'relationships', 'friendship',
 'When did you last talk to {{contact_name}}? What did you talk about?',
 ARRAY['How often do you catch up with {{contact_name}}?', 'When''s the last time you heard from {{contact_name}}?'],
 5, TRUE, 'contact_story'),

('contact_personal_009', 'quick_question', 'relationships', 'friendship',
 'What''s {{contact_name}}''s go-to comfort food or favorite restaurant?',
 ARRAY['Where do you usually eat together with {{contact_name}}?', 'What food reminds you of {{contact_name}}?'],
 5, TRUE, 'contact_story'),

('contact_personal_010', 'quick_question', 'relationships', 'friendship',
 'What does {{contact_name}} do when they need to unwind?',
 ARRAY['How does {{contact_name}} relax?', 'What''s {{contact_name}}''s happy place?'],
 5, TRUE, 'contact_story'),

-- ============================================================================
-- DEEPER CONNECTION QUESTIONS
-- ============================================================================
('contact_deep_001', 'quick_question', 'relationships', 'deep',
 'What''s something you wish you told {{contact_name}} more often?',
 ARRAY['If you could tell {{contact_name}} one thing right now, what would it be?'],
 10, TRUE, 'contact_story'),

('contact_deep_002', 'quick_question', 'relationships', 'deep',
 'How has your relationship with {{contact_name}} changed over the years?',
 ARRAY['Think back to when you first knew {{contact_name}} vs now...'],
 8, TRUE, 'contact_story'),

('contact_deep_003', 'quick_question', 'relationships', 'deep',
 'What''s a challenge you and {{contact_name}} went through together?',
 ARRAY['When did {{contact_name}} really have your back?', 'Tell us about a tough time {{contact_name}} helped you through'],
 9, TRUE, 'contact_story'),

('contact_deep_004', 'quick_question', 'relationships', 'deep',
 'What do you admire about how {{contact_name}} lives their life?',
 ARRAY['What values does {{contact_name}} embody?', 'What can others learn from {{contact_name}}?'],
 8, TRUE, 'contact_story'),

('contact_deep_005', 'quick_question', 'relationships', 'deep',
 'If {{contact_name}} wasn''t in your life, what would be different?',
 ARRAY['How has {{contact_name}} shaped who you are?'],
 9, TRUE, 'contact_story'),

-- ============================================================================
-- FAMILY-SPECIFIC QUESTIONS
-- ============================================================================
('contact_family_001', 'quick_question', 'family', 'traditions',
 'What family tradition did you share with {{contact_name}}?',
 ARRAY['What holiday memories do you have with {{contact_name}}?', 'What traditions connect you to {{contact_name}}?'],
 8, TRUE, 'contact_story'),

('contact_family_002', 'quick_question', 'family', 'heritage',
 'What family story has {{contact_name}} told you that you want to remember?',
 ARRAY['What history has {{contact_name}} passed down?', 'What does {{contact_name}} remember about your family?'],
 9, TRUE, 'contact_story'),

('contact_family_003', 'quick_question', 'family', 'traits',
 'What trait or habit did you pick up from {{contact_name}}?',
 ARRAY['How are you like {{contact_name}}?', 'What do people say you inherited from {{contact_name}}?'],
 7, TRUE, 'contact_story'),

('contact_family_004', 'quick_question', 'family', 'childhood',
 'What''s your earliest memory of {{contact_name}}?',
 ARRAY['What do you remember about {{contact_name}} from when you were young?'],
 8, TRUE, 'contact_story'),

-- ============================================================================
-- PRACTICAL MISSING INFO (but asked in a friendly way)
-- ============================================================================
('contact_info_friendly_001', 'missing_info', 'contact_info', NULL,
 'Do you know {{contact_name}}''s birthday? We''ll help you never forget it.',
 ARRAY['When should we remind you to wish {{contact_name}} happy birthday?'],
 10, TRUE, 'date_of_birth'),

('contact_info_friendly_002', 'missing_info', 'contact_info', NULL,
 'Got {{contact_name}}''s number? Add it so you can stay connected.',
 ARRAY['What''s the best way to reach {{contact_name}}?'],
 6, TRUE, 'phone'),

('contact_info_friendly_003', 'missing_info', 'contact_info', NULL,
 'Where does {{contact_name}} call home these days?',
 ARRAY['Where''s {{contact_name}} living now?', 'What city is {{contact_name}} in?'],
 5, TRUE, 'address'),

('contact_info_friendly_004', 'missing_info', 'contact_info', NULL,
 'How would you describe your relationship with {{contact_name}}?',
 ARRAY['Who is {{contact_name}} to you? (friend, family, colleague...)', 'How are you connected to {{contact_name}}?'],
 7, TRUE, 'relationship_type'),

('contact_info_friendly_005', 'missing_info', 'contact_info', NULL,
 'How did you and {{contact_name}} meet?',
 ARRAY['What''s the story of how you first connected with {{contact_name}}?'],
 8, TRUE, 'how_met'),

-- ============================================================================
-- FUN/LIGHT QUESTIONS
-- ============================================================================
('contact_fun_001', 'quick_question', 'relationships', 'fun',
 'What song or movie reminds you of {{contact_name}}?',
 ARRAY['What''s "your song" with {{contact_name}}?', 'What would be {{contact_name}}''s theme song?'],
 5, TRUE, 'contact_story'),

('contact_fun_002', 'quick_question', 'relationships', 'fun',
 'What''s {{contact_name}}''s signature phrase or saying?',
 ARRAY['What does {{contact_name}} always say?', 'How would you impersonate {{contact_name}}?'],
 6, TRUE, 'contact_story'),

('contact_fun_003', 'quick_question', 'relationships', 'fun',
 'What would {{contact_name}} spend a perfect day doing?',
 ARRAY['If {{contact_name}} won the lottery, what would they do first?'],
 5, TRUE, 'contact_story'),

('contact_fun_004', 'quick_question', 'relationships', 'fun',
 'What''s the weirdest thing you know about {{contact_name}}?',
 ARRAY['What''s {{contact_name}}''s guilty pleasure?', 'What would surprise people about {{contact_name}}?'],
 6, TRUE, 'contact_story'),

('contact_fun_005', 'quick_question', 'relationships', 'fun',
 'What gift would {{contact_name}} absolutely love?',
 ARRAY['What''s {{contact_name}}''s dream present?', 'What always makes {{contact_name}}''s day?'],
 6, TRUE, 'contact_story')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  subcategory = EXCLUDED.subcategory,
  priority_boost = EXCLUDED.priority_boost,
  target_field = EXCLUDED.target_field,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Update the generate function to include more contact-based prompts
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
  
  -- 1. Photo backstory prompts (15%)
  FOR v_photo IN 
    SELECT * FROM photos_needing_backstory 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.15)::INTEGER
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
  
  -- 2. Tag person prompts (10%)
  FOR v_face IN 
    SELECT * FROM untagged_faces 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.10)::INTEGER
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
  
  -- 3. Missing info prompts (15%)
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info' 
      AND target_field = v_contact.missing_field
      AND is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF FOUND THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name);
    ELSE
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
  
  -- 4. PERSONAL CONTACT QUESTIONS (25% - NEW!)
  -- Pick random contacts and ask personal questions about them
  FOR v_contact IN 
    SELECT id, full_name, relationship_type, avatar_url 
    FROM contacts 
    WHERE user_id = p_user_id 
      AND full_name IS NOT NULL
    ORDER BY RANDOM()
    LIMIT (p_count * 0.25)::INTEGER
  LOOP
    -- Pick a random personal question template
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'quick_question' 
      AND category = 'relationships'
      AND is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF FOUND THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.full_name);
      
      INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source, category, metadata)
      VALUES (
        p_user_id,
        'quick_question',
        v_contact.id,
        v_prompt_text,
        55 + v_template.priority_boost,
        'contact_based',
        v_template.subcategory,
        jsonb_build_object(
          'contact', jsonb_build_object(
            'name', v_contact.full_name,
            'photo_url', v_contact.avatar_url,
            'relationship', v_contact.relationship_type
          ),
          'template_id', v_template.id
        )
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- 5. Interest-based prompts (10%)
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND target_interest IS NOT NULL
      AND target_interest = ANY(v_profile.interests)
    ORDER BY RANDOM()
    LIMIT (p_count * 0.10)::INTEGER
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
  
  -- 6. Religion-based prompts (if set)
  IF v_profile.religion IS NOT NULL AND v_profile.religion NOT IN ('prefer_not_to_say', 'none', '') THEN
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
  
  -- 7. Seasonal prompts
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
  
  -- 8. Fill remaining with general prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND type IN ('knowledge', 'memory_prompt', 'favorites_firsts', 'recipes_wisdom')
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

COMMENT ON FUNCTION generate_engagement_prompts IS 'Now includes 25% personal contact questions for deeper relationship engagement';
