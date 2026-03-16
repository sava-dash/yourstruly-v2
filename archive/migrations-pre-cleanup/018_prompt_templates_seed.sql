-- ============================================================================
-- Migration: Prompt Templates Seed Data
-- Created: 2026-02-20
-- Description: Pre-populated prompt templates for engagement bubbles
-- ============================================================================

-- ============================================================================
-- GENERAL MEMORY PROMPTS (no targeting)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Childhood
('memory_childhood_001', 'memory_prompt', 'childhood', 
 'What games did you play as a kid?',
 ARRAY['What was your favorite childhood game?', 'How did you spend summer days as a child?'],
 0),

('memory_childhood_002', 'memory_prompt', 'childhood',
 'Tell me about your childhood home',
 ARRAY['What do you remember about the house you grew up in?', 'Describe your childhood bedroom'],
 0),

('memory_childhood_003', 'memory_prompt', 'childhood',
 'Who was your best friend growing up?',
 ARRAY['Tell me about your childhood best friend', 'Who did you play with most as a kid?'],
 0),

('memory_childhood_004', 'memory_prompt', 'childhood',
 'What''s your earliest memory?',
 ARRAY['What''s the first thing you can remember?', 'How far back can your memory go?'],
 10),

('memory_childhood_005', 'memory_prompt', 'childhood',
 'What smell takes you back to childhood?',
 ARRAY['What scent reminds you of being a kid?', 'What smells trigger childhood memories?'],
 0),

-- School
('memory_school_001', 'memory_prompt', 'school',
 'Who was your favorite teacher and why?',
 ARRAY['Tell me about a teacher who influenced you', 'Which teacher made the biggest impact?'],
 0),

('memory_school_002', 'memory_prompt', 'school',
 'What was your most embarrassing school moment?',
 ARRAY['Tell me about an embarrassing school memory', 'What moment still makes you cringe?'],
 0),

('memory_school_003', 'memory_prompt', 'school',
 'What were you known for in school?',
 ARRAY['How would classmates have described you?', 'What was your reputation in school?'],
 0),

-- Family
('memory_family_001', 'memory_prompt', 'family',
 'Tell me about a family tradition you cherish',
 ARRAY['What traditions did your family have?', 'What family ritual do you miss most?'],
 5),

('memory_family_002', 'memory_prompt', 'family',
 'What''s your favorite memory with your mother?',
 ARRAY['Tell me about a special moment with your mom', 'What do you treasure most about your mother?'],
 5),

('memory_family_003', 'memory_prompt', 'family',
 'What''s your favorite memory with your father?',
 ARRAY['Tell me about a special moment with your dad', 'What did your father teach you?'],
 5),

('memory_family_004', 'memory_prompt', 'family',
 'Tell me about your grandparents',
 ARRAY['What do you remember about your grandparents?', 'What wisdom did your grandparents share?'],
 5),

-- Milestones
('memory_milestone_001', 'memory_prompt', 'milestones',
 'Tell me about your wedding day',
 ARRAY['What do you remember most about getting married?', 'Describe your wedding day'],
 10),

('memory_milestone_002', 'memory_prompt', 'milestones',
 'What was the day your first child was born like?',
 ARRAY['Tell me about becoming a parent', 'What do you remember about your child''s birth?'],
 10),

('memory_milestone_003', 'memory_prompt', 'milestones',
 'Tell me about your first job',
 ARRAY['What was your first real job like?', 'How did you feel starting your career?'],
 0),

('memory_milestone_004', 'memory_prompt', 'milestones',
 'Where were you during a major historical event?',
 ARRAY['Tell me about living through a moment in history', 'What historical event did you witness?'],
 5),

-- Relationships
('memory_relationship_001', 'memory_prompt', 'relationships',
 'How did you meet your spouse/partner?',
 ARRAY['Tell me your love story', 'How did you fall in love?'],
 10),

('memory_relationship_002', 'memory_prompt', 'relationships',
 'How did you meet your best friend?',
 ARRAY['Tell me about your closest friendship', 'Who knows you best?'],
 0),

-- Senses
('memory_senses_001', 'memory_prompt', 'senses',
 'What song takes you back to a specific moment?',
 ARRAY['What music triggers memories for you?', 'What''s "your song" and why?'],
 0),

('memory_senses_002', 'memory_prompt', 'senses',
 'What taste reminds you of home?',
 ARRAY['What food takes you back to childhood?', 'What dish means "home" to you?'],
 0);

-- ============================================================================
-- GENERAL KNOWLEDGE PROMPTS (no targeting)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Life Lessons
('knowledge_life_001', 'knowledge', 'life_lessons',
 'What''s the most important lesson life has taught you?',
 ARRAY['What wisdom has life given you?', 'What have you learned that you wish you knew earlier?'],
 10),

('knowledge_life_002', 'knowledge', 'life_lessons',
 'What do you wish you knew at 20?',
 ARRAY['What advice would you give your younger self?', 'What would you tell yourself at 20?'],
 5),

('knowledge_life_003', 'knowledge', 'life_lessons',
 'What mistake taught you the most?',
 ARRAY['What failure turned into a lesson?', 'What did you learn from your biggest mistake?'],
 0),

('knowledge_life_004', 'knowledge', 'life_lessons',
 'What''s the best advice you ever received?',
 ARRAY['What advice changed your life?', 'What wisdom was passed to you?'],
 5),

-- Values
('knowledge_values_001', 'knowledge', 'values',
 'What principles guide your decisions?',
 ARRAY['What values do you live by?', 'What''s your moral compass?'],
 5),

('knowledge_values_002', 'knowledge', 'values',
 'What do you believe that most people don''t?',
 ARRAY['What''s an unpopular opinion you hold?', 'What belief sets you apart?'],
 0),

('knowledge_values_003', 'knowledge', 'values',
 'What does success mean to you?',
 ARRAY['How do you define success?', 'What does a successful life look like?'],
 0),

('knowledge_values_004', 'knowledge', 'values',
 'What matters most in life?',
 ARRAY['What''s truly important?', 'If you had to prioritize, what matters most?'],
 10),

-- Relationships
('knowledge_rel_001', 'knowledge', 'relationships',
 'What makes a good marriage or partnership?',
 ARRAY['What''s the secret to a lasting relationship?', 'What makes love work?'],
 5),

('knowledge_rel_002', 'knowledge', 'relationships',
 'How do you maintain lifelong friendships?',
 ARRAY['What keeps friendships strong?', 'How do you stay close to friends over decades?'],
 0),

('knowledge_rel_003', 'knowledge', 'relationships',
 'What''s the key to resolving conflicts?',
 ARRAY['How do you handle disagreements?', 'What''s your approach to conflict?'],
 0),

('knowledge_rel_004', 'knowledge', 'relationships',
 'What do you wish you''d said to someone who''s gone?',
 ARRAY['What would you tell someone you''ve lost?', 'What was left unsaid?'],
 5),

-- Parenting
('knowledge_parent_001', 'knowledge', 'parenting',
 'What''s the most important thing to teach children?',
 ARRAY['What should every child learn?', 'What values should kids be taught?'],
 5),

('knowledge_parent_002', 'knowledge', 'parenting',
 'What do you hope your kids remember about you?',
 ARRAY['How do you want your children to remember you?', 'What legacy do you want to leave your kids?'],
 10),

('knowledge_parent_003', 'knowledge', 'parenting',
 'What''s one thing every parent should know?',
 ARRAY['What parenting wisdom would you share?', 'What did you learn as a parent?'],
 0),

('knowledge_parent_004', 'knowledge', 'parenting',
 'How do you balance work and family?',
 ARRAY['What''s the secret to work-life balance?', 'How do you make time for what matters?'],
 0),

-- Career
('knowledge_career_001', 'knowledge', 'career',
 'What''s the best career advice you''d give?',
 ARRAY['What professional wisdom do you have?', 'What should someone starting out know?'],
 0),

('knowledge_career_002', 'knowledge', 'career',
 'How do you handle failure?',
 ARRAY['How do you bounce back from setbacks?', 'What''s your approach to failure?'],
 0),

('knowledge_career_003', 'knowledge', 'career',
 'What does meaningful work look like?',
 ARRAY['How do you find purpose in work?', 'What makes work fulfilling?'],
 0),

-- Health
('knowledge_health_001', 'knowledge', 'health',
 'How do you stay mentally healthy?',
 ARRAY['What keeps you mentally strong?', 'How do you take care of your mind?'],
 0),

('knowledge_health_002', 'knowledge', 'health',
 'What''s your secret to happiness?',
 ARRAY['What makes you happy?', 'How do you find joy?'],
 5),

('knowledge_health_003', 'knowledge', 'health',
 'What would you tell someone going through a hard time?',
 ARRAY['What comfort would you offer someone struggling?', 'How do you help people who are hurting?'],
 5),

-- Practical
('knowledge_practical_001', 'knowledge', 'practical',
 'What''s a skill everyone should learn?',
 ARRAY['What skill has served you well?', 'What should everyone know how to do?'],
 0),

('knowledge_practical_002', 'knowledge', 'practical',
 'What''s your best money advice?',
 ARRAY['What financial wisdom do you have?', 'What should people know about money?'],
 0),

-- Legacy
('knowledge_legacy_001', 'knowledge', 'legacy',
 'How do you want to be remembered?',
 ARRAY['What do you want your legacy to be?', 'How do you hope people remember you?'],
 10),

('knowledge_legacy_002', 'knowledge', 'legacy',
 'What are you most proud of?',
 ARRAY['What accomplishment means most to you?', 'What makes you proudest?'],
 5),

('knowledge_legacy_003', 'knowledge', 'legacy',
 'If you could pass on one piece of wisdom, what would it be?',
 ARRAY['What''s the one thing you want people to know?', 'What single lesson would you share?'],
 15),

('knowledge_legacy_004', 'knowledge', 'legacy',
 'What gives your life meaning?',
 ARRAY['Where do you find purpose?', 'What makes life worth living?'],
 10);

-- ============================================================================
-- INTEREST-BASED PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, target_interest, priority_boost) VALUES

-- Cooking
('memory_cooking_001', 'memory_prompt', 'interests', 
 'What''s a dish that reminds you of home?',
 'Cooking', 5),
('knowledge_cooking_001', 'knowledge', 'interests',
 'What recipe absolutely must be passed down?',
 'Cooking', 10),
('knowledge_cooking_002', 'knowledge', 'interests',
 'What did cooking teach you about life?',
 'Cooking', 0),

-- Music
('memory_music_001', 'memory_prompt', 'interests',
 'What song takes you back to a specific moment?',
 'Music', 5),
('knowledge_music_001', 'knowledge', 'interests',
 'How has music shaped who you are?',
 'Music', 5),
('memory_music_002', 'memory_prompt', 'interests',
 'Tell me about a concert or performance that moved you',
 'Music', 0),

-- Reading
('memory_reading_001', 'memory_prompt', 'interests',
 'What book changed how you see the world?',
 'Reading', 5),
('knowledge_reading_001', 'knowledge', 'interests',
 'What story would you want your grandkids to read?',
 'Reading', 5),
('memory_reading_002', 'memory_prompt', 'interests',
 'Who introduced you to the joy of reading?',
 'Reading', 0),

-- Photography
('memory_photo_001', 'memory_prompt', 'interests',
 'What''s the story behind your favorite photo you took?',
 'Photography', 5),
('knowledge_photo_001', 'knowledge', 'interests',
 'What makes a moment worth capturing?',
 'Photography', 5),

-- Travel
('memory_travel_001', 'memory_prompt', 'interests',
 'What place changed your perspective?',
 'Travel', 5),
('knowledge_travel_001', 'knowledge', 'interests',
 'What do you learn from experiencing other cultures?',
 'Travel', 5),
('memory_travel_002', 'memory_prompt', 'interests',
 'Tell me about a trip that didn''t go as planned',
 'Travel', 0),

-- Gardening
('memory_garden_001', 'memory_prompt', 'interests',
 'What''s growing in your garden right now?',
 'Gardening', 0),
('knowledge_garden_001', 'knowledge', 'interests',
 'What has gardening taught you about life?',
 'Gardening', 5),
('knowledge_garden_002', 'knowledge', 'interests',
 'What plants would you recommend everyone grow?',
 'Gardening', 0),

-- Sports
('memory_sports_001', 'memory_prompt', 'interests',
 'What''s your greatest athletic memory?',
 'Sports', 5),
('knowledge_sports_001', 'knowledge', 'interests',
 'What has competition taught you?',
 'Sports', 5),

-- Art
('memory_art_001', 'memory_prompt', 'interests',
 'What piece of art has moved you most?',
 'Art', 5),
('knowledge_art_001', 'knowledge', 'interests',
 'How do you express yourself creatively?',
 'Art', 5),

-- Writing
('memory_writing_001', 'memory_prompt', 'interests',
 'What story have you always wanted to tell?',
 'Writing', 5),
('knowledge_writing_001', 'knowledge', 'interests',
 'Why do words matter to you?',
 'Writing', 5);

-- ============================================================================
-- HOBBY-BASED PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, target_hobby, priority_boost) VALUES

-- Golf
('memory_golf_001', 'memory_prompt', 'hobbies',
 'Tell me about your best round ever',
 'Golf', 5),
('knowledge_golf_001', 'knowledge', 'hobbies',
 'What has golf taught you about patience?',
 'Golf', 5),
('memory_golf_002', 'memory_prompt', 'hobbies',
 'Who taught you to play golf?',
 'Golf', 0),

-- Woodworking
('memory_wood_001', 'memory_prompt', 'hobbies',
 'What''s the most meaningful thing you''ve built?',
 'Woodworking', 5),
('knowledge_wood_001', 'knowledge', 'hobbies',
 'What do you love about creating with your hands?',
 'Woodworking', 5),
('memory_wood_002', 'memory_prompt', 'hobbies',
 'Tell me about a project that challenged you',
 'Woodworking', 0),

-- Fishing
('memory_fish_001', 'memory_prompt', 'hobbies',
 'Tell me about the one that got away',
 'Fishing', 5),
('knowledge_fish_001', 'knowledge', 'hobbies',
 'Why do you find peace on the water?',
 'Fishing', 5),
('memory_fish_002', 'memory_prompt', 'hobbies',
 'Who first took you fishing?',
 'Fishing', 0),

-- Hiking
('memory_hike_001', 'memory_prompt', 'hobbies',
 'What''s the most beautiful place you''ve hiked?',
 'Hiking', 5),
('knowledge_hike_001', 'knowledge', 'hobbies',
 'What does nature teach you?',
 'Hiking', 5),

-- Camping
('memory_camp_001', 'memory_prompt', 'hobbies',
 'Tell me about a memorable camping trip',
 'Camping', 5),
('knowledge_camp_001', 'knowledge', 'hobbies',
 'What do you love about being in the wilderness?',
 'Camping', 5);

-- ============================================================================
-- SKILL-BASED PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, target_skill, priority_boost) VALUES

-- Leadership
('knowledge_lead_001', 'knowledge', 'skills',
 'What makes a good leader?',
 'Leadership', 5),
('knowledge_lead_002', 'knowledge', 'skills',
 'How do you inspire others?',
 'Leadership', 0),
('memory_lead_001', 'memory_prompt', 'skills',
 'Tell me about a time you had to lead through difficulty',
 'Leadership', 5),

-- Communication
('knowledge_comm_001', 'knowledge', 'skills',
 'How do you handle difficult conversations?',
 'Communication', 5),
('knowledge_comm_002', 'knowledge', 'skills',
 'What''s the secret to being a good listener?',
 'Communication', 0),

-- Creativity
('knowledge_create_001', 'knowledge', 'skills',
 'Where do your best ideas come from?',
 'Creativity', 5),
('knowledge_create_002', 'knowledge', 'skills',
 'How do you overcome creative blocks?',
 'Creativity', 0),

-- Problem Solving
('knowledge_solve_001', 'knowledge', 'skills',
 'Walk me through how you approach a tough problem',
 'Problem Solving', 5),
('memory_solve_001', 'memory_prompt', 'skills',
 'Tell me about a problem you''re proud of solving',
 'Problem Solving', 5),

-- Teaching
('knowledge_teach_001', 'knowledge', 'skills',
 'What''s the secret to helping someone learn?',
 'Teaching', 5),
('memory_teach_001', 'memory_prompt', 'skills',
 'Tell me about someone you taught who made you proud',
 'Teaching', 5);

-- ============================================================================
-- RELIGION-BASED PROMPTS (opt-in)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, target_religion, priority_boost) VALUES

-- Hindu
('memory_hindu_001', 'memory_prompt', 'faith',
 'Tell me about a meaningful puja or festival',
 'Hindu', 5),
('knowledge_hindu_001', 'knowledge', 'faith',
 'How has dharma guided your decisions?',
 'Hindu', 10),
('knowledge_hindu_002', 'knowledge', 'faith',
 'What does karma mean in your daily life?',
 'Hindu', 5),
('memory_hindu_002', 'memory_prompt', 'faith',
 'What''s your favorite Diwali memory?',
 'Hindu', 5),

-- Christian
('memory_christian_001', 'memory_prompt', 'faith',
 'Tell me about a moment your faith carried you',
 'Christian', 5),
('knowledge_christian_001', 'knowledge', 'faith',
 'How has your faith shaped who you are?',
 'Christian', 10),
('knowledge_christian_002', 'knowledge', 'faith',
 'What scripture speaks to you most?',
 'Christian', 5),
('memory_christian_002', 'memory_prompt', 'faith',
 'Tell me about a meaningful Christmas or Easter',
 'Christian', 5),

-- Jewish
('memory_jewish_001', 'memory_prompt', 'faith',
 'What''s your favorite Shabbat memory?',
 'Jewish', 5),
('knowledge_jewish_001', 'knowledge', 'faith',
 'How do you pass down traditions to the next generation?',
 'Jewish', 10),
('knowledge_jewish_002', 'knowledge', 'faith',
 'What does tikkun olam mean to you?',
 'Jewish', 5),
('memory_jewish_002', 'memory_prompt', 'faith',
 'Tell me about a meaningful Passover or High Holy Days',
 'Jewish', 5),

-- Muslim
('memory_muslim_001', 'memory_prompt', 'faith',
 'Tell me about a meaningful Ramadan',
 'Muslim', 5),
('knowledge_muslim_001', 'knowledge', 'faith',
 'How does your faith guide your daily life?',
 'Muslim', 10),
('knowledge_muslim_002', 'knowledge', 'faith',
 'What has the Quran taught you?',
 'Muslim', 5),
('memory_muslim_002', 'memory_prompt', 'faith',
 'Tell me about a meaningful Eid celebration',
 'Muslim', 5),

-- Buddhist
('memory_buddhist_001', 'memory_prompt', 'faith',
 'Tell me about a moment of true mindfulness',
 'Buddhist', 5),
('knowledge_buddhist_001', 'knowledge', 'faith',
 'How do you practice compassion daily?',
 'Buddhist', 10),
('knowledge_buddhist_002', 'knowledge', 'faith',
 'What has meditation taught you?',
 'Buddhist', 5),

-- Sikh
('memory_sikh_001', 'memory_prompt', 'faith',
 'Tell me about a meaningful langar experience',
 'Sikh', 5),
('knowledge_sikh_001', 'knowledge', 'faith',
 'How do you practice seva in your life?',
 'Sikh', 10),
('knowledge_sikh_002', 'knowledge', 'faith',
 'What does the Guru Granth Sahib teach you?',
 'Sikh', 5),

-- Spiritual (non-religious)
('memory_spiritual_001', 'memory_prompt', 'faith',
 'Tell me about a transcendent moment in nature',
 'Spiritual', 5),
('knowledge_spiritual_001', 'knowledge', 'faith',
 'Where do you find meaning?',
 'Spiritual', 10),
('knowledge_spiritual_002', 'knowledge', 'faith',
 'What do you believe happens after we die?',
 'Spiritual', 5),

-- Atheist/Agnostic
('memory_atheist_001', 'memory_prompt', 'faith',
 'Tell me about a moment of profound wonder',
 'Atheist', 5),
('knowledge_atheist_001', 'knowledge', 'faith',
 'Where do you find purpose without religion?',
 'Atheist', 10),
('knowledge_atheist_002', 'knowledge', 'faith',
 'What gives your life meaning?',
 'Atheist', 5);

-- ============================================================================
-- SEASONAL PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, seasonal_months, priority_boost) VALUES

-- Winter Holidays (Nov-Dec)
('memory_holiday_001', 'memory_prompt', 'seasonal',
 'What''s your favorite holiday memory?',
 ARRAY[11, 12], 15),
('memory_holiday_002', 'memory_prompt', 'seasonal',
 'What holiday traditions does your family have?',
 ARRAY[11, 12], 10),
('knowledge_holiday_001', 'knowledge', 'seasonal',
 'What makes the holidays special to you?',
 ARRAY[11, 12], 10),

-- Summer (Jun-Aug)
('memory_summer_001', 'memory_prompt', 'seasonal',
 'What''s your favorite summer memory?',
 ARRAY[6, 7, 8], 10),
('memory_summer_002', 'memory_prompt', 'seasonal',
 'Tell me about a memorable family vacation',
 ARRAY[6, 7, 8], 10),

-- Back to School (Aug-Sep)
('memory_school_season_001', 'memory_prompt', 'seasonal',
 'What do you remember about going back to school?',
 ARRAY[8, 9], 10),

-- Spring (Mar-May)
('memory_spring_001', 'memory_prompt', 'seasonal',
 'What does spring remind you of?',
 ARRAY[3, 4, 5], 5),

-- Mother's Day (May)
('memory_mothers_001', 'memory_prompt', 'seasonal',
 'Tell me about your mother',
 ARRAY[5], 15),

-- Father's Day (June)
('memory_fathers_001', 'memory_prompt', 'seasonal',
 'Tell me about your father',
 ARRAY[6], 15);

-- ============================================================================
-- MISSING INFO PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, target_field, priority_boost) VALUES

('missing_dob_001', 'missing_info', 'contact_info',
 'When is {{contact_name}}''s birthday?',
 'birth_date', 10),

('missing_rel_001', 'missing_info', 'contact_info',
 'What''s your relationship to {{contact_name}}?',
 'relationship_type', 15),

('missing_howmet_001', 'missing_info', 'contact_info',
 'How did you meet {{contact_name}}?',
 'how_met', 5),

('missing_phone_001', 'missing_info', 'contact_info',
 'What''s {{contact_name}}''s phone number?',
 'phone', 0),

('missing_email_001', 'missing_info', 'contact_info',
 'What''s {{contact_name}}''s email?',
 'email', 0);

-- ============================================================================
-- QUICK QUESTION PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('quick_alive_001', 'quick_question', 'verification',
 'Is {{contact_name}} still with us?',
 ARRAY['Is {{contact_name}} still living?'],
 20),

('quick_season_001', 'quick_question', 'metadata',
 'What season was this photo taken?',
 ARRAY['When was this taken?'],
 5),

('quick_location_001', 'quick_question', 'metadata',
 'Was this photo taken in {{suggested_location}}?',
 ARRAY['Is this {{suggested_location}}?'],
 5),

('quick_mood_001', 'quick_question', 'tagging',
 'Is this memory happy or bittersweet?',
 NULL,
 0),

('quick_favorite_001', 'quick_question', 'featuring',
 'Is this one of your favorite memories?',
 ARRAY['Should we feature this memory?'],
 0);

-- ============================================================================
-- UPDATE STATISTICS
-- ============================================================================

-- Log how many templates we created
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM prompt_templates;
  RAISE NOTICE 'Inserted % prompt templates', template_count;
END $$;
