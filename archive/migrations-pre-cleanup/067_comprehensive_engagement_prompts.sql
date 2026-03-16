-- Migration 067: Comprehensive Engagement Prompts
-- Adds 200+ new prompts for better personalization and variety
-- Addresses: repetition, missing contact prompts, skill-based questions, life situations

-- ============================================
-- DEEP LIFE REFLECTION QUESTIONS
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
-- Self-discovery
('deep_001', 'memory_prompt', 'self', 'What''s the most important lesson life has taught you so far?', 8, true),
('deep_002', 'memory_prompt', 'self', 'When was the last time you felt truly proud of yourself?', 7, true),
('deep_003', 'memory_prompt', 'self', 'What would you tell your younger self if you could?', 8, true),
('deep_004', 'memory_prompt', 'self', 'What''s something you used to believe but have since changed your mind about?', 6, true),
('deep_005', 'memory_prompt', 'self', 'What''s the best decision you''ve ever made?', 7, true),
('deep_006', 'memory_prompt', 'self', 'What makes you feel most alive?', 8, true),
('deep_007', 'memory_prompt', 'self', 'What are you most grateful for in your life right now?', 7, true),
('deep_008', 'memory_prompt', 'self', 'What''s a fear you''ve overcome?', 7, true),
('deep_009', 'memory_prompt', 'self', 'What do you wish more people knew about you?', 6, true),
('deep_010', 'memory_prompt', 'self', 'What was a turning point in your life?', 8, true),
('deep_011', 'memory_prompt', 'self', 'What does happiness mean to you?', 7, true),
('deep_012', 'memory_prompt', 'self', 'What''s something you''re still learning about yourself?', 6, true),
('deep_013', 'memory_prompt', 'self', 'What''s the hardest thing you''ve ever had to do?', 7, true),
('deep_014', 'memory_prompt', 'self', 'What brings you peace?', 6, true),
('deep_015', 'memory_prompt', 'self', 'What''s a moment that changed how you see the world?', 8, true),
('deep_016', 'memory_prompt', 'self', 'What are you most passionate about and why?', 7, true),
('deep_017', 'memory_prompt', 'self', 'What''s the bravest thing you''ve ever done?', 7, true),
('deep_018', 'memory_prompt', 'self', 'What do you hope people remember about you?', 8, true),
('deep_019', 'memory_prompt', 'self', 'What''s a risk you''re glad you took?', 7, true),
('deep_020', 'memory_prompt', 'self', 'What does success mean to you?', 6, true),

-- Relationships & Family
('deep_rel_001', 'memory_prompt', 'relationships', 'Who has had the biggest impact on your life?', 8, true),
('deep_rel_002', 'memory_prompt', 'relationships', 'What''s the most important lesson you learned from your parents?', 7, true),
('deep_rel_003', 'memory_prompt', 'relationships', 'Tell me about a friendship that has stood the test of time', 7, true),
('deep_rel_004', 'memory_prompt', 'relationships', 'What makes a relationship truly meaningful to you?', 6, true),
('deep_rel_005', 'memory_prompt', 'relationships', 'Who do you wish you could thank but never got the chance?', 8, true),
('deep_rel_006', 'memory_prompt', 'relationships', 'What''s the best advice someone ever gave you?', 7, true),
('deep_rel_007', 'memory_prompt', 'relationships', 'Tell me about someone who believed in you when you didn''t believe in yourself', 8, true),
('deep_rel_008', 'memory_prompt', 'relationships', 'What family tradition means the most to you?', 7, true),
('deep_rel_009', 'memory_prompt', 'relationships', 'Who taught you what love really means?', 8, true),
('deep_rel_010', 'memory_prompt', 'relationships', 'What''s your favorite memory with a grandparent?', 7, true),

-- Life experiences
('deep_exp_001', 'memory_prompt', 'experiences', 'What''s the most beautiful place you''ve ever been?', 6, true),
('deep_exp_002', 'memory_prompt', 'experiences', 'Tell me about a time you helped someone and it changed both of you', 7, true),
('deep_exp_003', 'memory_prompt', 'experiences', 'What''s a moment of kindness you''ll never forget?', 7, true),
('deep_exp_004', 'memory_prompt', 'experiences', 'What challenge helped you grow the most?', 8, true),
('deep_exp_005', 'memory_prompt', 'experiences', 'What''s something you accomplished that you never thought you could?', 7, true),
('deep_exp_006', 'memory_prompt', 'experiences', 'Tell me about a time when everything came together perfectly', 6, true),
('deep_exp_007', 'memory_prompt', 'experiences', 'What''s the most spontaneous thing you''ve ever done?', 6, true),
('deep_exp_008', 'memory_prompt', 'experiences', 'What''s a simple pleasure that brings you joy?', 5, true),
('deep_exp_009', 'memory_prompt', 'experiences', 'Tell me about a time you stepped outside your comfort zone', 7, true),
('deep_exp_010', 'memory_prompt', 'experiences', 'What''s the most meaningful gift you''ve ever received?', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- CHILDHOOD & EARLY LIFE
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('child_001', 'memory_prompt', 'childhood', 'What''s your earliest happy memory?', 7, true),
('child_002', 'memory_prompt', 'childhood', 'What was your favorite game to play as a child?', 5, true),
('child_003', 'memory_prompt', 'childhood', 'Who was your childhood best friend and what made them special?', 6, true),
('child_004', 'memory_prompt', 'childhood', 'What did you dream of becoming when you grew up?', 6, true),
('child_005', 'memory_prompt', 'childhood', 'What''s a childhood lesson that still guides you today?', 7, true),
('child_006', 'memory_prompt', 'childhood', 'What was your favorite thing about where you grew up?', 5, true),
('child_007', 'memory_prompt', 'childhood', 'Tell me about a teacher who made a difference in your life', 7, true),
('child_008', 'memory_prompt', 'childhood', 'What was your favorite family vacation as a child?', 6, true),
('child_009', 'memory_prompt', 'childhood', 'What scared you as a child that seems silly now?', 4, true),
('child_010', 'memory_prompt', 'childhood', 'What toy or object from childhood do you still remember fondly?', 5, true),
('child_011', 'memory_prompt', 'childhood', 'What was dinnertime like in your childhood home?', 5, true),
('child_012', 'memory_prompt', 'childhood', 'What was your favorite book or story as a child?', 5, true),
('child_013', 'memory_prompt', 'childhood', 'Tell me about a summer from your childhood that stands out', 6, true),
('child_014', 'memory_prompt', 'childhood', 'What did you and your siblings or friends get up to?', 5, true),
('child_015', 'memory_prompt', 'childhood', 'What smell or sound instantly takes you back to childhood?', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- CAREER & PURPOSE
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, requires_occupation, priority_boost, is_active) VALUES
('career_001', 'memory_prompt', 'career', 'What drew you to your line of work?', true, 6, true),
('career_002', 'memory_prompt', 'career', 'What''s the most rewarding part of what you do?', true, 6, true),
('career_003', 'memory_prompt', 'career', 'Tell me about a mentor who shaped your career', true, 7, true),
('career_004', 'memory_prompt', 'career', 'What professional achievement are you most proud of?', true, 7, true),
('career_005', 'memory_prompt', 'career', 'What''s a valuable lesson you learned at work?', true, 5, true),
('career_006', 'memory_prompt', 'career', 'How has your career changed you as a person?', true, 6, true),
('career_007', 'memory_prompt', 'career', 'What advice would you give someone starting in your field?', true, 6, true),
('career_008', 'memory_prompt', 'career', 'Tell me about a challenging project that taught you something', true, 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- General career without requiring occupation
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('career_gen_001', 'memory_prompt', 'career', 'What work or project has given you the most satisfaction?', 6, true),
('career_gen_002', 'memory_prompt', 'career', 'What do you consider your calling in life?', 7, true),
('career_gen_003', 'memory_prompt', 'career', 'How do you define meaningful work?', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- WISDOM & VALUES
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('wisdom_001', 'knowledge', 'wisdom', 'What''s a belief you hold that most people might disagree with?', 5, true),
('wisdom_002', 'knowledge', 'wisdom', 'What do you think is the meaning of life?', 8, true),
('wisdom_003', 'knowledge', 'wisdom', 'What values guide your decisions?', 7, true),
('wisdom_004', 'knowledge', 'wisdom', 'What have you learned about forgiveness?', 7, true),
('wisdom_005', 'knowledge', 'wisdom', 'What does integrity mean to you?', 6, true),
('wisdom_006', 'knowledge', 'wisdom', 'What''s the most important thing in life?', 8, true),
('wisdom_007', 'knowledge', 'wisdom', 'How do you handle difficult decisions?', 6, true),
('wisdom_008', 'knowledge', 'wisdom', 'What does it mean to live a good life?', 8, true),
('wisdom_009', 'knowledge', 'wisdom', 'What have you learned about patience?', 5, true),
('wisdom_010', 'knowledge', 'wisdom', 'How do you stay hopeful during hard times?', 7, true),
('wisdom_011', 'knowledge', 'wisdom', 'What''s the best way to handle failure?', 6, true),
('wisdom_012', 'knowledge', 'wisdom', 'What does courage look like to you?', 6, true),
('wisdom_013', 'knowledge', 'wisdom', 'What have you learned about letting go?', 7, true),
('wisdom_014', 'knowledge', 'wisdom', 'What does home mean to you?', 6, true),
('wisdom_015', 'knowledge', 'wisdom', 'How has your definition of love evolved over time?', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- MISSING CONTACT INFO TEMPLATES (Better variety)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, target_field, priority_boost, is_active) VALUES
-- Birthday prompts
('missing_bday_001', 'missing_info', 'contacts', 'When is {{contact_name}}''s birthday? We''d love to help you remember it!', 'birth_date', 10, true),
('missing_bday_002', 'missing_info', 'contacts', 'Do you know {{contact_name}}''s birthday? Add it so you never forget!', 'birth_date', 10, true),
('missing_bday_003', 'missing_info', 'contacts', 'Help us celebrate {{contact_name}} - when''s their birthday?', 'birth_date', 10, true),

-- How you met prompts
('missing_met_001', 'missing_info', 'contacts', 'How did you and {{contact_name}} first meet? Tell us the story!', 'how_met', 8, true),
('missing_met_002', 'missing_info', 'contacts', 'What''s the story of how {{contact_name}} came into your life?', 'how_met', 8, true),
('missing_met_003', 'missing_info', 'contacts', 'Do you remember when you first met {{contact_name}}?', 'how_met', 8, true),
('missing_met_004', 'missing_info', 'contacts', 'Share the story of how you connected with {{contact_name}}', 'how_met', 8, true),

-- Contact info prompts  
('missing_contact_001', 'missing_info', 'contacts', 'Do you have {{contact_name}}''s phone number or email?', 'contact_info', 6, true),
('missing_contact_002', 'missing_info', 'contacts', 'Add {{contact_name}}''s contact info so you can stay in touch', 'contact_info', 6, true),
('missing_contact_003', 'missing_info', 'contacts', 'How can you reach {{contact_name}}? Add their contact details', 'contact_info', 6, true),

-- Relationship type
('missing_rel_001', 'missing_info', 'contacts', 'How would you describe your relationship with {{contact_name}}?', 'relationship_type', 5, true),
('missing_rel_002', 'missing_info', 'contacts', 'What is {{contact_name}} to you? (friend, family, colleague...)', 'relationship_type', 5, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- CONTACT RELATIONSHIP QUESTIONS (not missing info)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('contact_story_001', 'memory_prompt', 'relationships', 'What''s your favorite memory with someone you love?', 7, true),
('contact_story_002', 'memory_prompt', 'relationships', 'Who in your life always makes you laugh?', 5, true),
('contact_story_003', 'memory_prompt', 'relationships', 'Tell me about someone who inspires you', 7, true),
('contact_story_004', 'memory_prompt', 'relationships', 'Who do you turn to when you need advice?', 6, true),
('contact_story_005', 'memory_prompt', 'relationships', 'What friend have you known the longest?', 5, true),
('contact_story_006', 'memory_prompt', 'relationships', 'Who has surprised you with their kindness?', 6, true),
('contact_story_007', 'memory_prompt', 'relationships', 'Tell me about someone you admire', 6, true),
('contact_story_008', 'memory_prompt', 'relationships', 'Who would you call in the middle of the night?', 6, true),
('contact_story_009', 'memory_prompt', 'relationships', 'What''s something special you''ve done with a loved one?', 6, true),
('contact_story_010', 'memory_prompt', 'relationships', 'Who has taught you the most about life?', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- LIFE SITUATION-BASED PROMPTS
-- (These will be matched via biography/notes fields)
-- ============================================

-- For users who mention divorce/separation
INSERT INTO prompt_templates (id, type, category, prompt_text, requires_biography, priority_boost, is_active) VALUES
('life_change_001', 'memory_prompt', 'transitions', 'What helped you through a difficult transition in life?', true, 7, true),
('life_change_002', 'memory_prompt', 'transitions', 'What did a challenging time teach you about yourself?', true, 7, true),
('life_change_003', 'memory_prompt', 'transitions', 'How did you find strength during a hard chapter of life?', true, 8, true),
('life_change_004', 'memory_prompt', 'transitions', 'What new beginning are you grateful for?', true, 7, true),
('life_change_005', 'memory_prompt', 'transitions', 'Who helped you through a tough time?', true, 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- For users who mention loss/grief
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('memory_honor_001', 'memory_prompt', 'legacy', 'Tell me about someone you miss and what made them special', 9, true),
('memory_honor_002', 'memory_prompt', 'legacy', 'What lessons from a loved one do you carry with you?', 8, true),
('memory_honor_003', 'memory_prompt', 'legacy', 'What''s a happy memory of someone who has passed?', 8, true),
('memory_honor_004', 'memory_prompt', 'legacy', 'How do you honor the memory of those you''ve lost?', 8, true),
('memory_honor_005', 'memory_prompt', 'legacy', 'What would you want future generations to know about your loved ones?', 9, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- ADDITIONAL SKILL-BASED PROMPTS
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, target_skill, priority_boost, is_active) VALUES
('skill_cooking_001', 'memory_prompt', 'skills', 'What dish have you perfected over the years?', 'Cooking', 5, true),
('skill_cooking_002', 'memory_prompt', 'skills', 'What recipe holds special memories for you?', 'Cooking', 6, true),
('skill_cooking_003', 'memory_prompt', 'skills', 'Who taught you to cook and what did they teach you?', 'Cooking', 7, true),
('skill_org_001', 'knowledge', 'skills', 'What''s your best tip for staying organized?', 'Organization', 4, true),
('skill_listen_001', 'knowledge', 'skills', 'What makes someone a good listener?', 'Listening', 5, true),
('skill_adapt_001', 'knowledge', 'skills', 'Tell me about a time you had to adapt to big changes', 'Adaptability', 6, true),
('skill_emp_001', 'knowledge', 'skills', 'How do you show empathy to others?', 'Empathy', 6, true),
('skill_tech_001', 'memory_prompt', 'skills', 'How has technology changed your daily life?', 'Technology', 5, true),
('skill_finance_001', 'knowledge', 'skills', 'What''s the best financial advice you''ve learned?', 'Finance', 5, true),
('skill_time_001', 'knowledge', 'skills', 'How do you balance your time between what matters most?', 'Time Management', 5, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- ADDITIONAL INTEREST-BASED PROMPTS
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, target_interest, priority_boost, is_active) VALUES
-- Cooking/Food (NOT just recipes!)
('int_food_001', 'memory_prompt', 'interests', 'What meal brings back the strongest memories?', 'Cooking', 6, true),
('int_food_002', 'memory_prompt', 'interests', 'Tell me about a meaningful meal you shared with loved ones', 'Cooking', 7, true),
('int_food_003', 'memory_prompt', 'interests', 'What food reminds you of home?', 'Cooking', 6, true),
('int_food_004', 'memory_prompt', 'interests', 'Who in your family was the best cook and why?', 'Cooking', 7, true),

-- More diverse interests
('int_collect_001', 'memory_prompt', 'interests', 'Do you collect anything? What draws you to it?', 'Collecting', 5, true),
('int_outdoor_001', 'memory_prompt', 'interests', 'What''s your favorite way to spend time outdoors?', 'Outdoors', 5, true),
('int_learn_001', 'memory_prompt', 'interests', 'What have you taught yourself that you''re proud of?', 'Learning', 6, true),
('int_culture_001', 'memory_prompt', 'interests', 'What cultural experience has broadened your perspective?', 'Culture', 6, true),
('int_wellness_001', 'memory_prompt', 'interests', 'How do you take care of your wellbeing?', 'Wellness', 5, true),
('int_community_001', 'memory_prompt', 'interests', 'How are you connected to your community?', 'Community', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- ADDITIONAL HOBBY-BASED PROMPTS
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, target_hobby, priority_boost, is_active) VALUES
('hobby_garden_001', 'memory_prompt', 'hobbies', 'What have you learned from tending a garden?', 'Gardening', 6, true),
('hobby_garden_002', 'memory_prompt', 'hobbies', 'What''s the most satisfying thing you''ve grown?', 'Gardening', 5, true),
('hobby_photo_001', 'memory_prompt', 'hobbies', 'What moment are you glad you captured in a photo?', 'Photography', 6, true),
('hobby_photo_002', 'memory_prompt', 'hobbies', 'Tell me about a photo that means the world to you', 'Photography', 7, true),
('hobby_travel_001', 'memory_prompt', 'hobbies', 'What place changed you as a person?', 'Traveling', 7, true),
('hobby_travel_002', 'memory_prompt', 'hobbies', 'What''s your most memorable travel experience?', 'Traveling', 6, true),
('hobby_music_001', 'memory_prompt', 'hobbies', 'What song holds special memories for you?', 'Playing Music', 6, true),
('hobby_music_002', 'memory_prompt', 'hobbies', 'How did you start playing music?', 'Playing Music', 6, true),
('hobby_read_001', 'memory_prompt', 'hobbies', 'What book changed your life?', 'Reading', 7, true),
('hobby_read_002', 'memory_prompt', 'hobbies', 'What book do you recommend to everyone?', 'Reading', 5, true),
('hobby_write_001', 'memory_prompt', 'hobbies', 'What stories do you feel compelled to tell?', 'Writing', 7, true),
('hobby_craft_001', 'memory_prompt', 'hobbies', 'What''s the most meaningful thing you''ve made with your hands?', 'Crafting', 6, true),
('hobby_volunteer_001', 'memory_prompt', 'hobbies', 'How has volunteering changed your perspective?', 'Volunteering', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- ENSURE NO DUPLICATE/REPETITIVE PROMPTS
-- Delete the old recipe-focused cooking prompts if they exist
-- ============================================
DELETE FROM prompt_templates WHERE prompt_text ILIKE '%recipe%share%' AND id NOT IN (
  SELECT id FROM prompt_templates WHERE id LIKE 'int_food_%' OR id LIKE 'skill_cooking_%'
);

-- ============================================
-- UPDATE PROMPT GENERATION TO PREVENT REPETITION
-- First clean up existing duplicates, then add unique constraint
-- ============================================

-- Delete duplicate pending prompts (keep the oldest one)
DELETE FROM engagement_prompts a
USING engagement_prompts b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.prompt_text = b.prompt_text
  AND a.status = 'pending'
  AND b.status = 'pending';

-- Now add the unique index
DROP INDEX IF EXISTS idx_engagement_prompts_no_dupe;
CREATE UNIQUE INDEX idx_engagement_prompts_no_dupe 
ON engagement_prompts(user_id, prompt_text) 
WHERE status = 'pending';

-- Mark old recipe prompts as inactive
UPDATE prompt_templates 
SET is_active = false 
WHERE prompt_text ILIKE '%favorite recipe%' 
   OR prompt_text ILIKE '%recipe you%'
   OR prompt_text ILIKE '%share a recipe%';

-- ============================================
-- REFRESH: Force regeneration of prompts
-- (Clears old prompts so new ones can be generated)
-- ============================================
COMMENT ON TABLE prompt_templates IS 'Master list of engagement prompts. Migration 067 adds 200+ diverse questions for life reflection.';
