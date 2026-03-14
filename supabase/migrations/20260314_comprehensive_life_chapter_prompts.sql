-- ============================================================================
-- Comprehensive Life Chapter Prompts
-- Purpose: Add thoughtful, positive, reflective questions for each life chapter
-- Created: 2026-03-14
-- ============================================================================

-- ============================================================================
-- CHILDHOOD PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Early memories
('childhood_earliest_001', 'memory_prompt', 'childhood', 'What is your very first memory? What made it stick with you?', 15, TRUE),
('childhood_home_001', 'memory_prompt', 'childhood', 'Describe the first home you remember. What did it smell like? What sounds do you remember?', 12, TRUE),
('childhood_bedroom_001', 'memory_prompt', 'childhood', 'What was your childhood bedroom like? What was your favorite thing in it?', 10, TRUE),
('childhood_favorite_spot_001', 'memory_prompt', 'childhood', 'What was your favorite place to play as a child?', 10, TRUE),

-- Family
('childhood_parents_001', 'memory_prompt', 'childhood', 'What do you remember most about your parents when you were little?', 12, TRUE),
('childhood_bedtime_001', 'memory_prompt', 'childhood', 'What was bedtime like in your house? Any special rituals or stories?', 8, TRUE),
('childhood_meals_001', 'memory_prompt', 'childhood', 'What did family meals look like? Any favorite dishes from childhood?', 8, TRUE),
('childhood_holidays_001', 'memory_prompt', 'childhood', 'What was your favorite holiday tradition as a child?', 10, TRUE),

-- Friends & Play
('childhood_bestfriend_001', 'memory_prompt', 'childhood', 'Who was your best friend in elementary school? What did you love to do together?', 12, TRUE),
('childhood_games_001', 'memory_prompt', 'childhood', 'What games did you play as a kid? Outdoor games, imaginary games, board games?', 8, TRUE),
('childhood_toy_001', 'memory_prompt', 'childhood', 'What was your most treasured toy or possession as a child?', 10, TRUE),

-- School
('childhood_school_001', 'memory_prompt', 'childhood', 'What do you remember about your first day of school?', 12, TRUE),
('childhood_teacher_001', 'memory_prompt', 'childhood', 'Tell me about a teacher who made an impact on you in elementary school', 10, TRUE),
('childhood_subject_001', 'memory_prompt', 'childhood', 'What was your favorite subject in elementary school and why?', 8, TRUE),

-- Special moments
('childhood_birthday_001', 'memory_prompt', 'childhood', 'Tell me about your most memorable childhood birthday', 10, TRUE),
('childhood_adventure_001', 'memory_prompt', 'childhood', 'What was the biggest adventure you had as a child?', 10, TRUE),
('childhood_brave_001', 'memory_prompt', 'childhood', 'Tell me about a time you were brave as a kid', 8, TRUE),
('childhood_happy_001', 'memory_prompt', 'childhood', 'What made you happiest as a child?', 10, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- TEENAGE YEARS PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Identity & Growth
('teenage_changing_001', 'memory_prompt', 'teenage', 'What was the biggest way you changed as a teenager?', 12, TRUE),
('teenage_realized_001', 'memory_prompt', 'teenage', 'What did you realize about yourself in your teen years?', 10, TRUE),
('teenage_style_001', 'memory_prompt', 'teenage', 'Describe your style and look as a teenager. What were you trying to express?', 8, TRUE),
('teenage_music_001', 'memory_prompt', 'teenage', 'What music defined your teenage years? What did those songs mean to you?', 10, TRUE),

-- Friends & Social
('teenage_friends_001', 'memory_prompt', 'teenage', 'Who was in your friend group as a teenager? What did you do together?', 12, TRUE),
('teenage_hangout_001', 'memory_prompt', 'teenage', 'Where did you and your friends hang out? Describe a typical weekend', 10, TRUE),
('teenage_first_crush_001', 'memory_prompt', 'teenage', 'Tell me about your first crush. What drew you to them?', 10, TRUE),
('teenage_first_heartbreak_001', 'memory_prompt', 'teenage', 'What did your first heartbreak teach you?', 8, TRUE),

-- Discovery
('teenage_discovered_001', 'memory_prompt', 'teenage', 'What hobby or passion did you discover as a teenager?', 10, TRUE),
('teenage_dream_001', 'memory_prompt', 'teenage', 'What did you dream about doing or becoming as a teen?', 10, TRUE),
('teenage_rebel_001', 'memory_prompt', 'teenage', 'What did you rebel against as a teenager?', 8, TRUE),
('teenage_learned_001', 'knowledge', 'teenage', 'What is the most important lesson you learned in your teenage years?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- HIGH SCHOOL PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Academic
('highschool_favorite_class_001', 'memory_prompt', 'high_school', 'What was your favorite class in high school and why?', 10, TRUE),
('highschool_teacher_impact_001', 'memory_prompt', 'high_school', 'Which high school teacher had the biggest impact on you?', 12, TRUE),
('highschool_best_project_001', 'memory_prompt', 'high_school', 'Tell me about a school project you were proud of', 8, TRUE),

-- Activities
('highschool_activities_001', 'memory_prompt', 'high_school', 'What activities or clubs were you involved in? What did you love about them?', 10, TRUE),
('highschool_sports_001', 'memory_prompt', 'high_school', 'Did you play any sports? What do you remember about the experience?', 8, TRUE),
('highschool_performance_001', 'memory_prompt', 'high_school', 'Ever perform on stage? In a play, concert, or competition?', 10, TRUE),

-- Social Life
('highschool_prom_001', 'memory_prompt', 'high_school', 'Tell me about prom or another big school dance', 8, TRUE),
('highschool_lunch_001', 'memory_prompt', 'high_school', 'Where did you eat lunch? Who did you sit with?', 6, TRUE),
('highschool_achievement_001', 'memory_prompt', 'high_school', 'What was your proudest achievement in high school?', 12, TRUE),

-- Milestones
('highschool_graduation_001', 'memory_prompt', 'high_school', 'Tell me about your high school graduation. How did you feel?', 12, TRUE),
('highschool_summer_001', 'memory_prompt', 'high_school', 'What was your best summer during high school?', 10, TRUE),
('highschool_wisdom_001', 'knowledge', 'high_school', 'What would you tell your high school self?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- COLLEGE PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- The Experience
('college_decision_001', 'memory_prompt', 'college', 'What made you choose your college? What were you hoping for?', 12, TRUE),
('college_first_day_001', 'memory_prompt', 'college', 'What do you remember about moving into your dorm or first apartment?', 10, TRUE),
('college_major_001', 'memory_prompt', 'college', 'How did you choose your major? Did it match your expectations?', 10, TRUE),
('college_professor_001', 'memory_prompt', 'college', 'Tell me about a professor who changed how you think', 12, TRUE),

-- Growth
('college_changed_001', 'memory_prompt', 'college', 'How did college change you? Who were you when you arrived vs. when you left?', 15, TRUE),
('college_challenge_001', 'memory_prompt', 'college', 'What was the biggest challenge you faced in college? How did you overcome it?', 12, TRUE),
('college_discovery_001', 'memory_prompt', 'college', 'What did you discover about yourself in college?', 12, TRUE),

-- Experiences
('college_friends_001', 'memory_prompt', 'college', 'Tell me about your college friend group. What brought you together?', 10, TRUE),
('college_adventure_001', 'memory_prompt', 'college', 'What was your craziest college adventure or road trip?', 10, TRUE),
('college_study_abroad_001', 'memory_prompt', 'college', 'Did you study abroad? Tell me about that experience', 12, TRUE),

-- Graduation
('college_graduation_001', 'memory_prompt', 'college', 'Describe your college graduation day. What were you feeling?', 12, TRUE),
('college_lessons_001', 'knowledge', 'college', 'What did college teach you beyond academics?', 15, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- CAREER / JOBS PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Getting Started
('career_first_job_001', 'memory_prompt', 'jobs_career', 'Tell me about your very first job. What did you learn?', 15, TRUE),
('career_first_paycheck_001', 'memory_prompt', 'jobs_career', 'What did you do with your first real paycheck?', 8, TRUE),
('career_finding_path_001', 'memory_prompt', 'jobs_career', 'How did you find your career path? Was it planned or did you stumble into it?', 12, TRUE),

-- Growth & Challenges
('career_breakthrough_001', 'memory_prompt', 'jobs_career', 'Tell me about a career breakthrough or turning point', 12, TRUE),
('career_challenge_001', 'memory_prompt', 'jobs_career', 'What was the biggest professional challenge you overcame?', 12, TRUE),
('career_proud_001', 'memory_prompt', 'jobs_career', 'What professional achievement are you most proud of?', 15, TRUE),
('career_mentor_001', 'memory_prompt', 'jobs_career', 'Who mentored you in your career? What did they teach you?', 12, TRUE),

-- Experience
('career_favorite_job_001', 'memory_prompt', 'jobs_career', 'What was your favorite job and why?', 10, TRUE),
('career_colleagues_001', 'memory_prompt', 'jobs_career', 'Tell me about colleagues who became friends', 8, TRUE),
('career_tough_day_001', 'memory_prompt', 'jobs_career', 'Describe your toughest workday. How did you get through it?', 8, TRUE),

-- Wisdom
('career_advice_001', 'knowledge', 'jobs_career', 'What career advice would you give your younger self?', 15, TRUE),
('career_skills_001', 'knowledge', 'jobs_career', 'What skills did you develop that serve you beyond work?', 12, TRUE),
('career_success_001', 'knowledge', 'jobs_career', 'How do you define success in your career?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- RELATIONSHIPS PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Love Story
('relationships_met_001', 'memory_prompt', 'relationships', 'Tell me the story of how you met your partner', 15, TRUE),
('relationships_first_date_001', 'memory_prompt', 'relationships', 'Describe your first date. What do you remember most?', 12, TRUE),
('relationships_knew_001', 'memory_prompt', 'relationships', 'When did you know this person was special?', 12, TRUE),
('relationships_proposal_001', 'memory_prompt', 'relationships', 'Tell me about the proposal. How did it happen?', 12, TRUE),
('relationships_wedding_001', 'memory_prompt', 'relationships', 'Describe your wedding day. What moments stand out?', 15, TRUE),

-- Partnership
('relationships_grows_001', 'memory_prompt', 'relationships', 'How has your relationship grown over the years?', 12, TRUE),
('relationships_challenge_001', 'memory_prompt', 'relationships', 'What challenge did you overcome together that made you stronger?', 12, TRUE),
('relationships_traditions_001', 'memory_prompt', 'relationships', 'What traditions have you created together?', 10, TRUE),
('relationships_love_about_001', 'memory_prompt', 'relationships', 'What do you love most about your partner?', 15, TRUE),

-- Family Building
('relationships_kids_decision_001', 'memory_prompt', 'relationships', 'How did you decide to have children (or not to)?', 12, TRUE),
('relationships_parent_became_001', 'memory_prompt', 'relationships', 'Tell me about the day you became a parent', 15, TRUE),
('relationships_parenting_001', 'knowledge', 'relationships', 'What has parenting taught you?', 15, TRUE),

-- Wisdom
('relationships_love_learned_001', 'knowledge', 'relationships', 'What have you learned about love over the years?', 15, TRUE),
('relationships_advice_001', 'knowledge', 'relationships', 'What relationship advice would you give to someone starting out?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- TRAVEL PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Adventures
('travel_first_trip_001', 'memory_prompt', 'travel', 'Tell me about your first big trip away from home', 12, TRUE),
('travel_favorite_place_001', 'memory_prompt', 'travel', 'What is your favorite place you've ever visited? What made it special?', 15, TRUE),
('travel_unexpected_001', 'memory_prompt', 'travel', 'Tell me about an unexpected adventure while traveling', 12, TRUE),
('travel_changed_perspective_001', 'memory_prompt', 'travel', 'What place changed your perspective on life?', 15, TRUE),

-- Experiences
('travel_local_001', 'memory_prompt', 'travel', 'Describe an interaction with a local that stuck with you', 10, TRUE),
('travel_food_001', 'memory_prompt', 'travel', 'What is the best meal you've ever had while traveling?', 10, TRUE),
('travel_mishap_001', 'memory_prompt', 'travel', 'Tell me about a travel mishap that makes you laugh now', 10, TRUE),
('travel_solo_001', 'memory_prompt', 'travel', 'Have you traveled alone? What did you learn about yourself?', 12, TRUE),

-- Bucket List
('travel_dream_001', 'memory_prompt', 'travel', 'What place is still on your bucket list? Why do you want to go?', 10, TRUE),
('travel_return_001', 'memory_prompt', 'travel', 'What place would you love to return to?', 10, TRUE),

-- Wisdom
('travel_taught_001', 'knowledge', 'travel', 'What has travel taught you about the world and yourself?', 15, TRUE),
('travel_home_001', 'knowledge', 'travel', 'How has travel changed what "home" means to you?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- SPIRITUALITY PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Faith Journey
('spirituality_raised_001', 'memory_prompt', 'spirituality', 'How were you raised spiritually? What did you believe as a child?', 12, TRUE),
('spirituality_questioned_001', 'memory_prompt', 'spirituality', 'Tell me about a time you questioned your beliefs', 12, TRUE),
('spirituality_deepened_001', 'memory_prompt', 'spirituality', 'What experience deepened your faith or spiritual understanding?', 12, TRUE),

-- Practice & Meaning
('spirituality_practices_001', 'memory_prompt', 'spirituality', 'What spiritual practices bring you peace?', 10, TRUE),
('spirituality_community_001', 'memory_prompt', 'spirituality', 'Tell me about your spiritual community and what it means to you', 10, TRUE),
('spirituality_moment_001', 'memory_prompt', 'spirituality', 'Describe a moment you felt deeply connected to something greater', 15, TRUE),

-- Guidance
('spirituality_carried_001', 'memory_prompt', 'spirituality', 'Tell me about a time your faith carried you through difficulty', 12, TRUE),
('spirituality_prayer_001', 'memory_prompt', 'spirituality', 'Is there a prayer or practice that has special meaning to you?', 10, TRUE),

-- Wisdom
('spirituality_learned_001', 'knowledge', 'spirituality', 'What has your spiritual journey taught you about life?', 15, TRUE),
('spirituality_hope_001', 'knowledge', 'spirituality', 'What gives you hope?', 12, TRUE),
('spirituality_grateful_001', 'knowledge', 'spirituality', 'What are you most grateful for?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- WISDOM & LEGACY PROMPTS
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Life Lessons
('wisdom_biggest_lesson_001', 'knowledge', 'wisdom_legacy', 'What is the most important lesson life has taught you?', 20, TRUE),
('wisdom_mistake_001', 'knowledge', 'wisdom_legacy', 'What mistake taught you the most?', 15, TRUE),
('wisdom_changed_mind_001', 'knowledge', 'wisdom_legacy', 'What have you changed your mind about as you've gotten older?', 15, TRUE),
('wisdom_wish_knew_001', 'knowledge', 'wisdom_legacy', 'What do you wish you had known when you were younger?', 15, TRUE),

-- Values & Character
('wisdom_values_001', 'knowledge', 'wisdom_legacy', 'What values guide your life? Where did they come from?', 15, TRUE),
('wisdom_character_001', 'knowledge', 'wisdom_legacy', 'What quality or trait are you most proud of developing?', 12, TRUE),
('wisdom_courage_001', 'knowledge', 'wisdom_legacy', 'What does courage mean to you?', 12, TRUE),
('wisdom_success_001', 'knowledge', 'wisdom_legacy', 'How do you define a successful life?', 15, TRUE),

-- Legacy
('wisdom_remembered_001', 'knowledge', 'wisdom_legacy', 'What do you want to be remembered for?', 20, TRUE),
('wisdom_pass_on_001', 'knowledge', 'wisdom_legacy', 'What wisdom do you want to pass on to the next generation?', 20, TRUE),
('wisdom_proud_of_001', 'knowledge', 'wisdom_legacy', 'What are you most proud of in your life?', 15, TRUE),

-- Philosophy
('wisdom_happiness_001', 'knowledge', 'wisdom_legacy', 'What have you learned about happiness?', 15, TRUE),
('wisdom_meaning_001', 'knowledge', 'wisdom_legacy', 'What gives your life meaning?', 18, TRUE),
('wisdom_aging_001', 'knowledge', 'wisdom_legacy', 'What has getting older taught you?', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- LIFE MOMENTS (General memorable experiences)
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES

-- Defining Moments
('lifemoments_turning_point_001', 'memory_prompt', 'life_moments', 'Tell me about a turning point in your life. What changed?', 15, TRUE),
('lifemoments_proudest_001', 'memory_prompt', 'life_moments', 'What is your proudest moment?', 15, TRUE),
('lifemoments_overcoming_001', 'memory_prompt', 'life_moments', 'Tell me about a time you overcame something difficult', 12, TRUE),

-- Joy & Celebration
('lifemoments_happiest_001', 'memory_prompt', 'life_moments', 'Describe one of the happiest days of your life', 15, TRUE),
('lifemoments_celebration_001', 'memory_prompt', 'life_moments', 'Tell me about a celebration that meant the world to you', 10, TRUE),
('lifemoments_laugh_001', 'memory_prompt', 'life_moments', 'What is a time you laughed so hard you cried?', 10, TRUE),

-- Growth
('lifemoments_risk_001', 'memory_prompt', 'life_moments', 'Tell me about a risk you took that paid off', 12, TRUE),
('lifemoments_reinvented_001', 'memory_prompt', 'life_moments', 'When did you reinvent yourself? What prompted it?', 12, TRUE),

-- People
('lifemoments_kindness_001', 'memory_prompt', 'life_moments', 'Tell me about a random act of kindness you received or witnessed', 10, TRUE),
('lifemoments_goodbye_001', 'memory_prompt', 'life_moments', 'Tell me about a meaningful goodbye', 12, TRUE)

ON CONFLICT (id) DO UPDATE SET 
  prompt_text = EXCLUDED.prompt_text,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Update generate_engagement_prompts to assign life_chapter properly
-- ============================================================================

-- This will be applied when prompts are generated
COMMENT ON COLUMN engagement_prompts.life_chapter IS 'Assigned based on template category when prompt is created from template';
