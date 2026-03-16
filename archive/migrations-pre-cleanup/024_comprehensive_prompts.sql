-- ============================================================================
-- Migration: Comprehensive Life Documentation Prompts
-- Created: 2026-02-20
-- Description: Early life questions + comprehensive life documentation
-- Make reminiscing fun and encourage daily return
-- ============================================================================

-- ============================================================================
-- EARLY LIFE / CHILDHOOD (High Priority for new users)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Birth & Origins
('memory_birth_001', 'memory_prompt', 'early_life',
 'Where were you born?',
 ARRAY['What city/town were you born in?', 'Tell me about your birthplace'],
 25),

('memory_birth_002', 'memory_prompt', 'early_life',
 'What do you know about the day you were born?',
 ARRAY['Do you know any stories about your birth?', 'What did your parents tell you about your arrival?'],
 20),

('memory_earliest_001', 'memory_prompt', 'early_life',
 'What''s your earliest memory?',
 ARRAY['What''s the first thing you can remember?', 'How far back can you remember?'],
 25),

-- Childhood Home
('memory_childhood_home_001', 'memory_prompt', 'early_life',
 'Describe the first home you remember living in',
 ARRAY['What was your childhood home like?', 'Tell me about where you grew up'],
 20),

('memory_childhood_room_001', 'memory_prompt', 'early_life',
 'What was your childhood bedroom like?',
 ARRAY['Describe your room growing up', 'What posters or decorations did you have?'],
 15),

('memory_childhood_neighborhood_001', 'memory_prompt', 'early_life',
 'What was your neighborhood like growing up?',
 ARRAY['Describe where you grew up', 'Who were your neighbors?'],
 15),

-- Childhood Fun
('memory_childhood_game_001', 'memory_prompt', 'early_life',
 'What was your favorite game to play as a child?',
 ARRAY['What games did you play growing up?', 'What was playtime like for you?'],
 20),

('memory_childhood_food_001', 'memory_prompt', 'early_life',
 'What was your favorite food as a child?',
 ARRAY['What did you love to eat growing up?', 'Any foods you couldn''t get enough of?'],
 15),

('memory_childhood_toy_001', 'memory_prompt', 'early_life',
 'What was your favorite toy?',
 ARRAY['What toy did you treasure most?', 'What couldn''t you live without as a kid?'],
 15),

('memory_childhood_tv_001', 'memory_prompt', 'early_life',
 'What TV shows or movies did you love as a kid?',
 ARRAY['What did you watch growing up?', 'Any shows you still remember fondly?'],
 10),

-- Childhood Activities
('memory_childhood_sports_001', 'memory_prompt', 'early_life',
 'Did you play any sports as a child?',
 ARRAY['Were you athletic growing up?', 'What sports or activities were you in?'],
 15),

('memory_childhood_hobby_001', 'memory_prompt', 'early_life',
 'What hobbies did you have as a child that you no longer do?',
 ARRAY['Any childhood hobbies you''ve since given up?', 'What did you used to love doing?'],
 15),

('memory_childhood_summer_001', 'memory_prompt', 'early_life',
 'What were summers like when you were a kid?',
 ARRAY['How did you spend summer vacation?', 'What''s your best summer memory?'],
 15),

-- Childhood Friends & Family
('memory_childhood_friend_001', 'memory_prompt', 'early_life',
 'Who was your best friend as a child?',
 ARRAY['Tell me about your childhood best friend', 'Who did you play with most?'],
 15),

('memory_childhood_sibling_001', 'memory_prompt', 'early_life',
 'What was your relationship with your siblings like growing up?',
 ARRAY['Tell me about growing up with your brothers/sisters', 'Any sibling memories that stand out?'],
 15),

('memory_childhood_grandparent_001', 'memory_prompt', 'early_life',
 'What do you remember about visiting your grandparents?',
 ARRAY['Tell me about your grandparents', 'What was their house like?'],
 15)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- PLACES LIVED (Comprehensive)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_places_002', 'memory_prompt', 'places_lived',
 'Where did you live as a teenager?',
 ARRAY['Did you move during high school?', 'What was your teen home like?'],
 10),

('memory_places_003', 'memory_prompt', 'places_lived',
 'Where did you live in your 20s?',
 ARRAY['Where did you go after leaving home?', 'First places you lived on your own?'],
 10),

('memory_places_004', 'memory_prompt', 'places_lived',
 'What''s the longest you''ve lived in one place?',
 ARRAY['Where did you put down roots?', 'Where did you live the longest?'],
 10),

('memory_places_005', 'memory_prompt', 'places_lived',
 'Have you ever lived in another country?',
 ARRAY['Any international moves?', 'Where outside your country have you lived?'],
 10),

('memory_places_006', 'memory_prompt', 'places_lived',
 'Which home holds the most memories for you?',
 ARRAY['What place feels most like home?', 'Where do you feel most nostalgic about?'],
 15)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- CARS OWNED (Every vehicle tells a story)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_cars_001', 'memory_prompt', 'vehicles',
 'What was your first car?',
 ARRAY['Tell me about your first vehicle', 'What did you drive when you first got your license?'],
 15),

('memory_cars_002', 'memory_prompt', 'vehicles',
 'What''s the most memorable car you''ve owned?',
 ARRAY['Which car has the best stories?', 'What vehicle do you miss most?'],
 10),

('memory_cars_003', 'memory_prompt', 'vehicles',
 'Did you ever have a car that broke down constantly?',
 ARRAY['Any car horror stories?', 'What vehicle gave you the most trouble?'],
 10),

('memory_cars_004', 'memory_prompt', 'vehicles',
 'What''s the longest road trip you''ve taken?',
 ARRAY['Any epic drives?', 'What''s the farthest you''ve driven?'],
 10),

('memory_cars_005', 'memory_prompt', 'vehicles',
 'Did you name any of your cars?',
 ARRAY['Any vehicles with nicknames?', 'What did you call your cars?'],
 5)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- SCHOOLS ATTENDED
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_school_elem_001', 'memory_prompt', 'education',
 'What was your elementary school like?',
 ARRAY['Tell me about grade school', 'Where did you go to elementary school?'],
 15),

('memory_school_middle_001', 'memory_prompt', 'education',
 'What do you remember about middle school?',
 ARRAY['How were your junior high years?', 'What was middle school like?'],
 10),

('memory_school_high_001', 'memory_prompt', 'education',
 'Tell me about your high school experience',
 ARRAY['What was high school like?', 'Where did you go to high school?'],
 15),

('memory_school_college_001', 'memory_prompt', 'education',
 'Did you go to college? What was it like?',
 ARRAY['Tell me about your college years', 'Where did you study?'],
 10),

('memory_school_teacher_001', 'memory_prompt', 'education',
 'Who was your most influential teacher?',
 ARRAY['What teacher made the biggest impact?', 'Who shaped your education most?'],
 15),

('memory_school_subject_001', 'memory_prompt', 'education',
 'What was your favorite subject in school?',
 ARRAY['What did you love studying?', 'What class did you look forward to?'],
 10)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- JOBS / CAREER (Every job teaches something)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_job_first_001', 'memory_prompt', 'career',
 'What was your very first job?',
 ARRAY['How did you earn your first paycheck?', 'Where did you first work?'],
 20),

('memory_job_teen_001', 'memory_prompt', 'career',
 'Did you have a job in high school?',
 ARRAY['What did you do for money as a teen?', 'Any summer jobs?'],
 10),

('memory_job_worst_001', 'memory_prompt', 'career',
 'What was your worst job?',
 ARRAY['Any jobs you couldn''t wait to leave?', 'What''s your worst work experience?'],
 10),

('memory_job_best_001', 'memory_prompt', 'career',
 'What''s been your favorite job?',
 ARRAY['What work have you loved most?', 'Where did you enjoy working most?'],
 15),

('memory_job_boss_001', 'memory_prompt', 'career',
 'Who was the best boss you ever had?',
 ARRAY['Tell me about a great manager', 'Who taught you the most at work?'],
 10),

('memory_job_coworker_001', 'memory_prompt', 'career',
 'Tell me about a memorable coworker',
 ARRAY['Any work friends that stand out?', 'Who made work enjoyable?'],
 10),

('memory_job_lesson_001', 'knowledge', 'career',
 'What''s the biggest lesson you learned from work?',
 ARRAY['What did your career teach you?', 'What wisdom did you gain from working?'],
 15)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- RELATIONSHIPS (The people in your life)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_love_first_001', 'memory_prompt', 'relationships',
 'Tell me about your first crush',
 ARRAY['Who was your first love interest?', 'Do you remember falling in love for the first time?'],
 15),

('memory_love_date_001', 'memory_prompt', 'relationships',
 'What was your first date like?',
 ARRAY['Tell me about your earliest date', 'How did you start dating?'],
 15),

('memory_love_meet_001', 'memory_prompt', 'relationships',
 'How did you meet your partner/spouse?',
 ARRAY['Tell me your love story', 'How did you two find each other?'],
 20),

('memory_love_proposal_001', 'memory_prompt', 'relationships',
 'Tell me about your proposal (giving or receiving)',
 ARRAY['How did the proposal happen?', 'Describe getting engaged'],
 15),

('memory_friend_lifelong_001', 'memory_prompt', 'relationships',
 'Who''s been your longest friendship?',
 ARRAY['Who have you known the longest?', 'Tell me about your oldest friend'],
 15)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- FUN & ENCOURAGING PROMPTS (Make them feel good)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('memory_proud_001', 'memory_prompt', 'celebration',
 'What''s a moment you felt really proud of yourself?',
 ARRAY['When did you feel on top of the world?', 'What accomplishment makes you smile?'],
 15),

('memory_laugh_001', 'memory_prompt', 'celebration',
 'What''s the hardest you''ve ever laughed?',
 ARRAY['What moment had you in tears laughing?', 'What''s your funniest memory?'],
 15),

('memory_brave_001', 'memory_prompt', 'celebration',
 'When were you really brave?',
 ARRAY['Tell me about a time you showed courage', 'What''s the bravest thing you''ve done?'],
 15),

('memory_kind_001', 'memory_prompt', 'celebration',
 'When did someone''s kindness really touch you?',
 ARRAY['Who showed you unexpected kindness?', 'What act of kindness do you remember?'],
 15),

('memory_adventure_001', 'memory_prompt', 'celebration',
 'What''s the most adventurous thing you''ve done?',
 ARRAY['When did you step way outside your comfort zone?', 'What''s your wildest story?'],
 15),

('memory_surprise_001', 'memory_prompt', 'celebration',
 'What''s the best surprise you''ve ever gotten?',
 ARRAY['When were you wonderfully surprised?', 'What surprise made your day?'],
 10),

('memory_overcome_001', 'memory_prompt', 'celebration',
 'What challenge did you overcome that you''re proud of?',
 ARRAY['What obstacle did you conquer?', 'When did you surprise yourself?'],
 15)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- DAILY ENGAGEMENT (Quick, easy wins)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('quick_today_001', 'memory_prompt', 'daily',
 'What made you smile today?',
 ARRAY['Any good moments today?', 'What was the highlight of your day?'],
 5),

('quick_grateful_001', 'knowledge', 'daily',
 'What are you grateful for right now?',
 ARRAY['What''s one thing you appreciate today?', 'What brings you gratitude?'],
 5),

('quick_thinking_001', 'knowledge', 'daily',
 'What''s on your mind lately?',
 ARRAY['What have you been thinking about?', 'Anything weighing on your mind?'],
 5),

('quick_learn_001', 'knowledge', 'daily',
 'What''s something you learned recently?',
 ARRAY['Any new discoveries?', 'What did you figure out lately?'],
 5)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- KNOWLEDGE WISDOM (Bite-sized insights)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

('knowledge_simple_001', 'knowledge', 'wisdom',
 'What''s a simple pleasure that never gets old?',
 ARRAY['What small thing always brings you joy?', 'What simple thing do you treasure?'],
 10),

('knowledge_younger_001', 'knowledge', 'wisdom',
 'What do you know now that you wish you knew at 18?',
 ARRAY['What would you tell your younger self?', 'What wisdom came with age?'],
 15),

('knowledge_wrong_001', 'knowledge', 'wisdom',
 'What did you used to believe that turned out to be wrong?',
 ARRAY['How has your thinking changed?', 'What did you have to unlearn?'],
 10),

('knowledge_right_001', 'knowledge', 'wisdom',
 'What did you believe as a kid that turned out to be absolutely right?',
 ARRAY['What childhood instinct was correct?', 'What did you know all along?'],
 10)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- Update statistics
-- ============================================================================

DO $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM prompt_templates;
  RAISE NOTICE 'Total prompt templates: %', total_count;
END $$;
