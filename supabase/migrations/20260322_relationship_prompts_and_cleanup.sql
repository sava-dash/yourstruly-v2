-- ============================================================================
-- Relationship-specific engagement prompts & cleanup
-- Created: 2026-03-22
-- Purpose: Add deep, emotionally engaging prompts for each relationship type
--          collected during onboarding. Remove redundant birthplace prompt.
-- ============================================================================

-- ============================================================================
-- 1. DEACTIVATE REDUNDANT PROMPTS
-- These overlap with onboarding (birthplace, location timeline, siblings names)
-- ============================================================================

UPDATE prompt_templates
SET is_active = FALSE, updated_at = NOW()
WHERE id IN (
  'location_childhood_city_001',   -- "What city/state did you spend childhood?" (asked in onboarding places-lived)
  'location_all_places_001',       -- "List all places you've lived" (onboarding captures this)
  'location_timeline_001',         -- "Timeline of where you lived from birth" (onboarding captures this)
  'location_current_001'           -- "What's your current address?" (captured in onboarding)
)
AND is_active = TRUE;

-- Also deactivate any "where were you born" if it exists
UPDATE prompt_templates
SET is_active = FALSE, updated_at = NOW()
WHERE (
  LOWER(prompt_text) LIKE '%where were you born%'
  OR LOWER(prompt_text) LIKE '%where you were born%'
  OR LOWER(prompt_text) LIKE '%city were you born%'
  OR LOWER(prompt_text) LIKE '%place of birth%'
)
AND is_active = TRUE;

-- ============================================================================
-- 2. SPOUSE / PARTNER PROMPTS
-- Condition: user has a contact with relationship_type in (spouse, partner, significant_other)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

-- Story of the relationship
('rel_spouse_how_met_001', 'memory_prompt', 'relationships', 'How did you and your spouse/partner first meet? What was your first impression?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_first_date_001', 'memory_prompt', 'relationships', 'What was your first date like? Where did you go?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_knew_one_001', 'memory_prompt', 'relationships', 'When did you know your spouse/partner was "the one"?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

-- What you love
('rel_spouse_love_most_001', 'memory_prompt', 'relationships', 'What do you love most about your spouse/partner?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_admire_001', 'memory_prompt', 'relationships', 'What do you admire most about your spouse/partner?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_laugh_001', 'memory_prompt', 'relationships', 'What''s something your spouse/partner does that always makes you laugh?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

-- Shared memories
('rel_spouse_fav_memory_001', 'memory_prompt', 'relationships', 'What''s your absolute favorite memory with your spouse/partner?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_trip_001', 'memory_prompt', 'relationships', 'What''s the best trip or vacation you''ve taken together?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_challenge_001', 'memory_prompt', 'relationships', 'What''s the biggest challenge you''ve faced together, and how did you get through it?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_tradition_001', 'memory_prompt', 'relationships', 'Do you and your spouse/partner have any special traditions or rituals?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

('rel_spouse_song_001', 'memory_prompt', 'relationships', 'Do you and your spouse/partner have a song? What is it and why?', 6, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))'),

-- Wisdom
('rel_spouse_advice_001', 'knowledge', 'wisdom_legacy', 'What advice would you give to young couples about making a relationship last?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''spouse'', ''partner'', ''significant_other''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 3. CHILDREN PROMPTS (son, daughter, child, grandson, granddaughter)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

-- Birth & early memories
('rel_child_birth_001', 'memory_prompt', 'relationships', 'What do you remember about your child''s birth? How did you feel?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_name_001', 'memory_prompt', 'relationships', 'How did you choose your child''s name? Does it have special meaning?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_first_steps_001', 'memory_prompt', 'relationships', 'Do you remember your child''s first steps or first word? Tell me about it.', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_first_day_school_001', 'memory_prompt', 'relationships', 'What was your child''s first day of school like? How did you handle it?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

-- Proud moments
('rel_child_proudest_001', 'memory_prompt', 'relationships', 'What''s your proudest moment as a parent?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_like_you_001', 'memory_prompt', 'relationships', 'In what ways is your child like you? In what ways are they different?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_funny_001', 'memory_prompt', 'relationships', 'What''s the funniest thing your child ever said or did?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

-- Activities & traditions
('rel_child_activity_001', 'memory_prompt', 'relationships', 'What did you and your child love doing together when they were little?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_bedtime_001', 'memory_prompt', 'relationships', 'Did you have a bedtime routine or favorite story you''d read together?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

-- Wisdom
('rel_child_taught_001', 'knowledge', 'wisdom_legacy', 'What has being a parent taught you about yourself?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

('rel_child_wish_001', 'knowledge', 'wisdom_legacy', 'What do you wish for your children''s future?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''son'', ''daughter'', ''child''))'),

-- Grandchildren
('rel_grandchild_meet_001', 'memory_prompt', 'relationships', 'What was it like meeting your grandchild for the first time?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandson'', ''granddaughter''))'),

('rel_grandchild_spoil_001', 'memory_prompt', 'relationships', 'What''s your favorite way to spoil your grandkids?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandson'', ''granddaughter''))'),

('rel_grandchild_teach_001', 'memory_prompt', 'relationships', 'What have you taught your grandchildren that you hope they remember?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandson'', ''granddaughter''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 4. PARENT PROMPTS (mother, father)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

-- Memories
('rel_parent_fav_memory_001', 'memory_prompt', 'childhood', 'What''s your favorite memory with your mother?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''mother'')'),

('rel_parent_fav_memory_002', 'memory_prompt', 'childhood', 'What''s your favorite memory with your father?', 15, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''father'')'),

('rel_parent_cooking_001', 'memory_prompt', 'childhood', 'What did your mother used to cook for you? Any dishes you still crave?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''mother'')'),

('rel_parent_cooking_002', 'memory_prompt', 'childhood', 'Did your father cook? What was his specialty?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''father'')'),

('rel_parent_passtime_001', 'memory_prompt', 'childhood', 'What was your favorite family pastime growing up?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))'),

('rel_parent_always_said_001', 'memory_prompt', 'childhood', 'What''s something your mother always used to say?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''mother'')'),

('rel_parent_always_said_002', 'memory_prompt', 'childhood', 'What''s something your father always used to say?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''father'')'),

('rel_parent_lesson_001', 'knowledge', 'wisdom_legacy', 'What''s the most important lesson your parents taught you?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))'),

('rel_parent_like_them_001', 'memory_prompt', 'childhood', 'In what ways are you like your parents? What did you inherit from them?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))'),

('rel_parent_weekend_001', 'memory_prompt', 'childhood', 'What did your family typically do on weekends when you were growing up?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))'),

('rel_parent_discipline_001', 'memory_prompt', 'childhood', 'How did your parents handle discipline? Were they strict or relaxed?', 6, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))'),

('rel_parent_sacrifice_001', 'memory_prompt', 'childhood', 'Is there a sacrifice your parents made that you only understood later in life?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''mother'', ''father''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 5. SIBLING PROMPTS (brother, sister)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

('rel_sibling_fight_001', 'memory_prompt', 'childhood', 'What did you and your sibling fight about the most growing up?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))'),

('rel_sibling_team_001', 'memory_prompt', 'childhood', 'Did you and your sibling ever team up against your parents? What happened?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))'),

('rel_sibling_protect_001', 'memory_prompt', 'childhood', 'Was there a time you protected your sibling, or they protected you?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))'),

('rel_sibling_shared_001', 'memory_prompt', 'childhood', 'Did you and your sibling share a room? What was that like?', 6, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))'),

('rel_sibling_now_001', 'memory_prompt', 'relationships', 'How has your relationship with your sibling changed over the years?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))'),

('rel_sibling_funniest_001', 'memory_prompt', 'childhood', 'What''s the funniest memory you have with your sibling?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''brother'', ''sister''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 6. FRIEND PROMPTS (best_friend, close_friend, friend, childhood_friend)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

('rel_friend_how_met_001', 'memory_prompt', 'relationships', 'How did you meet your best friend? What was your first impression?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend'', ''friend'', ''childhood_friend''))'),

('rel_friend_funniest_001', 'memory_prompt', 'relationships', 'What''s the funniest thing that ever happened with your friend?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend'', ''friend'', ''childhood_friend''))'),

('rel_friend_crazy_001', 'memory_prompt', 'relationships', 'What''s the craziest adventure you''ve had with a friend?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend'', ''friend'', ''childhood_friend''))'),

('rel_friend_important_001', 'memory_prompt', 'relationships', 'Why is your best friend important to you? What makes the friendship last?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend''))'),

('rel_friend_there_for_001', 'memory_prompt', 'relationships', 'Was there a time a friend was really there for you when you needed it?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend'', ''friend''))'),

('rel_friend_childhood_001', 'memory_prompt', 'childhood', 'Who was your childhood best friend? What did you do together?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''childhood_friend'')'),

('rel_friend_lost_touch_001', 'memory_prompt', 'relationships', 'Is there a friend you''ve lost touch with that you think about sometimes?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''best_friend'', ''close_friend'', ''friend'', ''childhood_friend''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 7. GRANDPARENT PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

('rel_grandparent_memory_001', 'memory_prompt', 'childhood', 'What''s your favorite memory with your grandmother?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''grandmother'')'),

('rel_grandparent_memory_002', 'memory_prompt', 'childhood', 'What''s your favorite memory with your grandfather?', 12, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''grandfather'')'),

('rel_grandparent_house_001', 'memory_prompt', 'childhood', 'What was your grandparents'' house like? What do you remember most?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandmother'', ''grandfather''))'),

('rel_grandparent_lesson_001', 'knowledge', 'wisdom_legacy', 'What wisdom did your grandparents pass down to you?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandmother'', ''grandfather''))'),

('rel_grandparent_food_001', 'memory_prompt', 'childhood', 'What did your grandparents cook for you? Any recipes you wish you had?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''grandmother'', ''grandfather''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 8. MENTOR / PROFESSIONAL PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

('rel_mentor_influence_001', 'memory_prompt', 'jobs_career', 'Who has been your most important mentor? How did they shape your life?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''mentor'')'),

('rel_mentor_advice_001', 'knowledge', 'wisdom_legacy', 'What''s the best advice a mentor ever gave you?', 10, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''mentor'')'),

('rel_colleague_story_001', 'memory_prompt', 'jobs_career', 'What''s a memorable moment with a work colleague that you''ll never forget?', 6, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type IN (''colleague'', ''boss'', ''business_partner''))')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;

-- ============================================================================
-- 9. IN-LAW PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active, conditional_query) VALUES

('rel_inlaw_first_meet_001', 'memory_prompt', 'relationships', 'What was it like meeting your in-laws for the first time?', 8, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''in-law'')'),

('rel_inlaw_relationship_001', 'memory_prompt', 'relationships', 'How would you describe your relationship with your in-laws?', 6, TRUE,
  'SELECT EXISTS(SELECT 1 FROM contacts WHERE user_id = $1 AND relationship_type = ''in-law'')')

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active,
  conditional_query = EXCLUDED.conditional_query;
