-- ============================================================================
-- Migration: Expanded Prompt Templates
-- Created: 2026-02-22
-- Description: Add diverse engagement prompts covering religion, interests, 
--              skills, contact stories, childhood memories, and more
-- NOTE: Run 029_prompt_type_enums.sql FIRST to add the new enum values
-- ============================================================================

-- ============================================================================
-- CHILDHOOD & EARLY LIFE MEMORIES
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
-- Birthplace & Origins
('childhood_birthplace_001', 'memory_prompt', 'childhood', 'Where were you born? Tell me about the place and what it was like.', 10, TRUE),
('childhood_birthplace_002', 'memory_prompt', 'childhood', 'What do you know about the day you were born?', 5, TRUE),
('childhood_hospital_001', 'memory_prompt', 'childhood', 'Do you know which hospital you were born in?', 5, TRUE),

-- Addresses & Places Lived
('childhood_addresses_001', 'memory_prompt', 'childhood', 'What addresses do you remember living at growing up? Describe each home.', 10, TRUE),
('childhood_first_home_001', 'memory_prompt', 'childhood', 'Describe the first home you remember living in. What did it look like?', 10, TRUE),
('childhood_neighborhood_001', 'memory_prompt', 'childhood', 'What was your childhood neighborhood like? Who were your neighbors?', 5, TRUE),
('childhood_bedroom_001', 'memory_prompt', 'childhood', 'What did your bedroom look like when you were a kid?', 5, TRUE),
('childhood_moved_001', 'memory_prompt', 'childhood', 'Did your family ever move? What was that experience like?', 5, TRUE),

-- Phone Numbers & Old Tech
('childhood_phone_001', 'memory_prompt', 'childhood', 'Do you remember any phone numbers from your childhood? Your home number or a friend''s?', 5, TRUE),
('childhood_first_phone_001', 'memory_prompt', 'childhood', 'What was the first phone you ever had? Landline or cell?', 5, TRUE),
('childhood_tech_001', 'memory_prompt', 'childhood', 'What technology did you have growing up? TVs, computers, game consoles?', 5, TRUE),

-- School Memories
('childhood_school_001', 'memory_prompt', 'childhood', 'What was the name of your elementary school? Do you have any memories from there?', 5, TRUE),
('childhood_teacher_001', 'memory_prompt', 'childhood', 'Who was your favorite teacher growing up and why?', 10, TRUE),
('childhood_friends_001', 'memory_prompt', 'childhood', 'Who was your best friend as a child? Are you still in touch?', 10, TRUE),
('childhood_play_001', 'memory_prompt', 'childhood', 'What games did you play as a child? Tag, hide and seek, video games?', 5, TRUE),

-- Family Traditions
('childhood_traditions_001', 'memory_prompt', 'childhood', 'What family traditions did you have growing up?', 10, TRUE),
('childhood_dinners_001', 'memory_prompt', 'childhood', 'What were family dinners like when you were young?', 5, TRUE),
('childhood_vacation_001', 'memory_prompt', 'childhood', 'Where did your family go on vacation when you were a kid?', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- FAVORITES & FIRSTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
-- Holidays
('favorites_holiday_001', 'favorites_firsts', 'favorites', 'What''s your favorite holiday and why?', 10, TRUE),
('favorites_holiday_memory_001', 'favorites_firsts', 'favorites', 'What''s your favorite holiday memory from childhood?', 10, TRUE),
('favorites_holiday_tradition_001', 'favorites_firsts', 'favorites', 'What holiday tradition means the most to you?', 5, TRUE),

-- Food
('favorites_food_001', 'favorites_firsts', 'favorites', 'What''s your all-time favorite food? Do you have a special memory associated with it?', 10, TRUE),
('favorites_restaurant_001', 'favorites_firsts', 'favorites', 'What''s your favorite restaurant and what do you love about it?', 5, TRUE),
('favorites_meal_001', 'favorites_firsts', 'favorites', 'What''s the best meal you''ve ever had? Who made it?', 5, TRUE),
('favorites_comfort_food_001', 'favorites_firsts', 'favorites', 'What''s your go-to comfort food?', 5, TRUE),

-- Entertainment
('favorites_movie_001', 'favorites_firsts', 'favorites', 'What''s your favorite movie of all time? Why does it resonate with you?', 5, TRUE),
('favorites_book_001', 'favorites_firsts', 'favorites', 'What book has impacted your life the most?', 10, TRUE),
('favorites_song_001', 'favorites_firsts', 'favorites', 'What song brings back the strongest memories for you?', 10, TRUE),
('favorites_tv_001', 'favorites_firsts', 'favorites', 'What TV show could you watch over and over?', 5, TRUE),

-- Firsts
('firsts_job_001', 'favorites_firsts', 'firsts', 'What was your first job? What did you learn from it?', 10, TRUE),
('firsts_car_001', 'favorites_firsts', 'firsts', 'What was your first car? Do you have any stories about it?', 5, TRUE),
('firsts_kiss_001', 'favorites_firsts', 'firsts', 'Do you remember your first kiss? Want to share that memory?', 5, TRUE),
('firsts_date_001', 'favorites_firsts', 'firsts', 'Tell me about your first date. Where did you go?', 5, TRUE),
('firsts_home_001', 'favorites_firsts', 'firsts', 'What was the first home you bought or rented on your own like?', 5, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- RELIGION & SPIRITUALITY (conditional on profile.religion)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, target_religion) VALUES
-- Christian
('faith_christian_001', 'knowledge', 'faith', 'What role does faith play in your daily life?', 10, TRUE, 'christian'),
('faith_christian_002', 'knowledge', 'faith', 'What''s your favorite Bible verse or passage and why?', 5, TRUE, 'christian'),
('faith_christian_003', 'knowledge', 'faith', 'Tell me about a time when your faith got you through a difficult time.', 10, TRUE, 'christian'),
('faith_christian_004', 'knowledge', 'faith', 'What church traditions are most meaningful to your family?', 5, TRUE, 'christian'),

-- Jewish
('faith_jewish_001', 'knowledge', 'faith', 'What Jewish traditions are most important to your family?', 10, TRUE, 'jewish'),
('faith_jewish_002', 'knowledge', 'faith', 'Tell me about a meaningful Shabbat or holiday celebration.', 5, TRUE, 'jewish'),
('faith_jewish_003', 'knowledge', 'faith', 'What wisdom from Judaism would you pass on to future generations?', 10, TRUE, 'jewish'),

-- Muslim
('faith_muslim_001', 'knowledge', 'faith', 'What does your faith mean to you in your daily life?', 10, TRUE, 'muslim'),
('faith_muslim_002', 'knowledge', 'faith', 'Tell me about a meaningful Ramadan or Eid celebration.', 5, TRUE, 'muslim'),
('faith_muslim_003', 'knowledge', 'faith', 'What teachings from Islam are most important to you?', 10, TRUE, 'muslim'),

-- Hindu
('faith_hindu_001', 'knowledge', 'faith', 'What Hindu traditions are most meaningful to your family?', 10, TRUE, 'hindu'),
('faith_hindu_002', 'knowledge', 'faith', 'Tell me about your favorite festival celebration - Diwali, Holi, or another?', 5, TRUE, 'hindu'),
('faith_hindu_003', 'knowledge', 'faith', 'What spiritual teachings guide your life?', 10, TRUE, 'hindu'),

-- Buddhist
('faith_buddhist_001', 'knowledge', 'faith', 'How does Buddhist practice influence your daily life?', 10, TRUE, 'buddhist'),
('faith_buddhist_002', 'knowledge', 'faith', 'What meditation or mindfulness practices are important to you?', 5, TRUE, 'buddhist'),
('faith_buddhist_003', 'knowledge', 'faith', 'What Buddhist teaching has been most transformative for you?', 10, TRUE, 'buddhist'),

-- General Spiritual
('faith_spiritual_001', 'knowledge', 'faith', 'What spiritual beliefs or practices are important to you?', 10, TRUE, 'spiritual'),
('faith_spiritual_002', 'knowledge', 'faith', 'Have you had any spiritual experiences that shaped your worldview?', 10, TRUE, 'spiritual')

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  target_religion = EXCLUDED.target_religion,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- INTERESTS & HOBBIES (match profile.interests array)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, target_interest) VALUES
-- Cooking
('interest_cooking_001', 'knowledge', 'interests', 'What''s your signature dish? Share the story behind it.', 10, TRUE, 'cooking'),
('interest_cooking_002', 'recipes_wisdom', 'interests', 'Share a family recipe that''s been passed down. What makes it special?', 15, TRUE, 'cooking'),
('interest_cooking_003', 'knowledge', 'interests', 'Who taught you to cook? What''s a lesson they passed on?', 10, TRUE, 'cooking'),

-- Gardening
('interest_gardening_001', 'knowledge', 'interests', 'What do you love most about gardening?', 10, TRUE, 'gardening'),
('interest_gardening_002', 'knowledge', 'interests', 'What gardening wisdom would you pass on to a beginner?', 10, TRUE, 'gardening'),

-- Sports
('interest_sports_001', 'memory_prompt', 'interests', 'What sports have been important in your life?', 5, TRUE, 'sports'),
('interest_sports_002', 'memory_prompt', 'interests', 'Tell me about your most memorable sports moment - playing or watching.', 10, TRUE, 'sports'),

-- Music
('interest_music_001', 'knowledge', 'interests', 'How has music shaped your life?', 10, TRUE, 'music'),
('interest_music_002', 'memory_prompt', 'interests', 'What''s your most memorable concert or live music experience?', 5, TRUE, 'music'),
('interest_music_003', 'knowledge', 'interests', 'If you play an instrument, who taught you? What was learning like?', 10, TRUE, 'music'),

-- Reading
('interest_reading_001', 'knowledge', 'interests', 'What authors or books have shaped your thinking?', 10, TRUE, 'reading'),
('interest_reading_002', 'knowledge', 'interests', 'What book would you recommend everyone read? Why?', 10, TRUE, 'reading'),

-- Travel
('interest_travel_001', 'memory_prompt', 'interests', 'What''s the most amazing place you''ve ever traveled to?', 10, TRUE, 'travel'),
('interest_travel_002', 'memory_prompt', 'interests', 'Where would you go if you could travel anywhere right now?', 5, TRUE, 'travel'),
('interest_travel_003', 'knowledge', 'interests', 'What travel advice would you give to someone?', 10, TRUE, 'travel'),

-- Art
('interest_art_001', 'knowledge', 'interests', 'How did you get into making art?', 10, TRUE, 'art'),
('interest_art_002', 'memory_prompt', 'interests', 'What piece of art (yours or someone else''s) has moved you the most?', 10, TRUE, 'art'),

-- Photography
('interest_photography_001', 'knowledge', 'interests', 'What draws you to photography?', 10, TRUE, 'photography'),
('interest_photography_002', 'knowledge', 'interests', 'What''s your favorite photo you''ve ever taken and why?', 10, TRUE, 'photography')

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  target_interest = EXCLUDED.target_interest,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- SKILLS & TALENTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
-- Professional Skills
('skills_professional_001', 'knowledge', 'skills', 'What professional skill are you most proud of? How did you develop it?', 10, TRUE),
('skills_professional_002', 'knowledge', 'skills', 'What career advice would you give to someone starting out in your field?', 15, TRUE),
('skills_professional_003', 'knowledge', 'skills', 'What''s the most valuable lesson you''ve learned in your career?', 10, TRUE),

-- Life Skills
('skills_life_001', 'knowledge', 'skills', 'What''s a practical skill you think everyone should learn?', 10, TRUE),
('skills_life_002', 'knowledge', 'skills', 'What skill do you wish you had learned earlier in life?', 5, TRUE),
('skills_life_003', 'knowledge', 'skills', 'Who taught you the most useful practical skill you have?', 10, TRUE),

-- Teaching
('skills_teaching_001', 'knowledge', 'skills', 'Have you ever taught someone something? What was that like?', 5, TRUE),
('skills_teaching_002', 'knowledge', 'skills', 'What would you love to teach someone someday?', 10, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- CONTACT-SPECIFIC STORIES (uses contact names dynamically)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, target_field) VALUES
-- General contact prompts (contact name injected by code)
('contact_story_last_seen', 'quick_question', 'relationships', 'When was the last time you saw {{contact_name}}? What did you do together?', 5, TRUE, 'contact_story'),
('contact_story_funny', 'memory_prompt', 'relationships', 'Share a funny story about {{contact_name}}.', 10, TRUE, 'contact_story'),
('contact_story_how_met', 'memory_prompt', 'relationships', 'How did you first meet {{contact_name}}?', 10, TRUE, 'how_met'),
('contact_story_grateful', 'knowledge', 'relationships', 'What are you most grateful for about {{contact_name}}?', 10, TRUE, 'contact_story'),
('contact_story_favorite_memory', 'memory_prompt', 'relationships', 'What''s your favorite memory with {{contact_name}}?', 15, TRUE, 'contact_story'),
('contact_story_learned', 'knowledge', 'relationships', 'What have you learned from {{contact_name}}?', 10, TRUE, 'contact_story'),
('contact_story_admire', 'knowledge', 'relationships', 'What do you admire most about {{contact_name}}?', 10, TRUE, 'contact_story'),

-- Missing info
('contact_missing_birthday', 'missing_info', 'contact', 'When is {{contact_name}}''s birthday?', 0, TRUE, 'date_of_birth'),
('contact_missing_email', 'missing_info', 'contact', 'What''s {{contact_name}}''s email address?', 0, TRUE, 'email'),
('contact_missing_phone', 'missing_info', 'contact', 'What''s {{contact_name}}''s phone number?', 0, TRUE, 'phone'),
('contact_missing_address', 'missing_info', 'contact', 'What''s {{contact_name}}''s address? (for sending cards or gifts)', 0, TRUE, 'address')

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  target_field = EXCLUDED.target_field,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- LIFE LESSONS & WISDOM
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
-- General Wisdom
('wisdom_advice_001', 'knowledge', 'life_lessons', 'What''s the best advice you''ve ever received? Who gave it to you?', 15, TRUE),
('wisdom_advice_002', 'knowledge', 'life_lessons', 'What advice would you give to your younger self?', 15, TRUE),
('wisdom_advice_003', 'knowledge', 'life_lessons', 'What life lesson took you the longest to learn?', 10, TRUE),
('wisdom_mistake_001', 'knowledge', 'life_lessons', 'What''s a mistake you made that taught you something valuable?', 10, TRUE),
('wisdom_proud_001', 'knowledge', 'legacy', 'What accomplishment are you most proud of?', 15, TRUE),
('wisdom_change_001', 'knowledge', 'values', 'How have your values changed as you''ve gotten older?', 10, TRUE),
('wisdom_regret_001', 'knowledge', 'life_lessons', 'If you could do one thing differently in your life, what would it be?', 10, TRUE),
('wisdom_happiness_001', 'knowledge', 'values', 'What brings you the most happiness in life?', 10, TRUE),
('wisdom_success_001', 'knowledge', 'values', 'How do you define success?', 10, TRUE),
('wisdom_love_001', 'knowledge', 'relationships', 'What has love taught you?', 15, TRUE),

-- For Future Generations
('wisdom_future_001', 'knowledge', 'legacy', 'What do you want your grandchildren to know about you?', 15, TRUE),
('wisdom_future_002', 'knowledge', 'legacy', 'What values do you hope to pass on to future generations?', 15, TRUE),
('wisdom_future_003', 'knowledge', 'legacy', 'What do you hope people remember about you?', 10, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- UPDATE generate_engagement_prompts to include contact stories
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
  v_has_children BOOLEAN := FALSE;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;
  
  -- Check if user has children (from contacts)
  SELECT EXISTS(
    SELECT 1 FROM contacts 
    WHERE user_id = p_user_id 
    AND relationship_type IN ('son', 'daughter', 'child')
  ) INTO v_has_children;
  
  -- 1. Generate photo backstory prompts (15%)
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
      60 + LEAST(20, (EXTRACT(EPOCH FROM (NOW() - v_photo.created_at)) / 86400)::INTEGER),
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 2. Generate contact story prompts (15%) - NEW!
  FOR v_contact IN 
    SELECT c.id, c.full_name 
    FROM contacts c
    WHERE c.user_id = p_user_id 
    AND NOT EXISTS (
      SELECT 1 FROM engagement_prompts ep 
      WHERE ep.user_id = p_user_id 
      AND ep.contact_id = c.id 
      AND ep.status = 'pending'
    )
    ORDER BY RANDOM()
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    -- Pick a random contact story template
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type IN ('memory_prompt', 'quick_question', 'knowledge') 
      AND target_field = 'contact_story'
      AND is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF FOUND THEN
      INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source)
      VALUES (
        p_user_id,
        v_template.type,
        v_contact.id,
        REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.full_name),
        50 + v_template.priority_boost,
        'system'
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- 3. Generate missing info prompts (10%)
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.1)::INTEGER
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info' 
      AND target_field = v_contact.missing_field
      AND is_active = TRUE
    LIMIT 1;
    
    IF FOUND THEN
      INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source, missing_field)
      VALUES (
        p_user_id,
        'missing_info',
        v_contact.contact_id,
        REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name),
        v_contact.priority,
        'system',
        v_contact.missing_field
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- 4. Generate interest-based prompts (15%)
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
        55 + v_template.priority_boost,
        'profile_based',
        jsonb_build_object('religion', v_template.target_religion)
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 6. Generate parenting prompts ONLY if has children
  IF v_has_children THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE
        AND category = 'parenting'
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
      VALUES (
        p_user_id,
        v_template.type,
        v_template.category,
        v_template.prompt_text,
        55 + v_template.priority_boost,
        'system'
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 7. Fill remaining with general prompts (ensure variety)
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND target_interest IS NULL
      AND target_skill IS NULL
      AND target_hobby IS NULL
      AND target_religion IS NULL
      AND seasonal_months IS NULL
      AND target_field IS NULL
      AND category NOT IN ('parenting') -- Skip parenting if not applicable
    ORDER BY RANDOM()
    LIMIT p_count - v_prompt_count
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

-- ============================================================================
-- PARENTING PROMPTS (only shown if user has children)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('parenting_advice_001', 'knowledge', 'parenting', 'What''s the most important parenting lesson you''ve learned?', 15, TRUE),
('parenting_advice_002', 'knowledge', 'parenting', 'What do you wish someone had told you before you became a parent?', 10, TRUE),
('parenting_memory_001', 'memory_prompt', 'parenting', 'What''s your favorite memory with your children?', 15, TRUE),
('parenting_proud_001', 'knowledge', 'parenting', 'What are you most proud of about your children?', 10, TRUE),
('parenting_challenge_001', 'knowledge', 'parenting', 'What was the hardest part of being a parent?', 10, TRUE)
ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  is_active = EXCLUDED.is_active;

COMMENT ON TABLE prompt_templates IS 'Expanded template library with religion, interests, skills, contact stories, and childhood memories';
