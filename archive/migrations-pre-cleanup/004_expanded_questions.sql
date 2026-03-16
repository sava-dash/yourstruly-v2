-- Expanded Question Bank for YoursTruly V2
-- Comprehensive life documentation prompts inspired by original YT

-- ============================================
-- ADDITIONAL CATEGORIES & QUESTIONS
-- ============================================

-- Delete existing to replace with comprehensive set
DELETE FROM interview_questions WHERE is_system = true;

-- ============================================
-- CHILDHOOD & EARLY LIFE
-- ============================================
INSERT INTO interview_questions (question_text, category, is_system, user_id) VALUES
('What is your earliest childhood memory?', 'childhood', true, null),
('What was your favorite thing to do as a child?', 'childhood', true, null),
('Tell me about the house you grew up in.', 'childhood', true, null),
('What were your parents like when you were young?', 'childhood', true, null),
('What was school like for you?', 'childhood', true, null),
('Who was your best friend growing up and what did you do together?', 'childhood', true, null),
('What was your favorite toy or game as a child?', 'childhood', true, null),
('What scared you as a child?', 'childhood', true, null),
('What was your favorite subject in school and why?', 'childhood', true, null),
('Tell me about a family vacation from your childhood.', 'childhood', true, null),
('What did you want to be when you grew up?', 'childhood', true, null),
('What was your neighborhood like growing up?', 'childhood', true, null),
('Tell me about your siblings and your relationship with them.', 'childhood', true, null),
('What were mealtimes like in your family?', 'childhood', true, null),
('What was your favorite holiday as a child and how did you celebrate?', 'childhood', true, null),
('What was the first movie you remember seeing?', 'childhood', true, null),
('Tell me about a teacher who made an impact on you.', 'childhood', true, null),
('What was your favorite book as a child?', 'childhood', true, null),
('What did you and your friends do after school?', 'childhood', true, null),
('What was your first pet?', 'childhood', true, null),

-- ============================================
-- TEEN YEARS & COMING OF AGE
-- ============================================
('What was high school like for you?', 'teen', true, null),
('Who were your closest friends as a teenager?', 'teen', true, null),
('What music did you listen to as a teenager?', 'teen', true, null),
('Tell me about your first crush or relationship.', 'teen', true, null),
('What was the most rebellious thing you did as a teenager?', 'teen', true, null),
('What was your first car or how did you get around?', 'teen', true, null),
('What did you do during your summers as a teen?', 'teen', true, null),
('What was your biggest challenge as a teenager?', 'teen', true, null),
('Tell me about your high school graduation.', 'teen', true, null),
('What sports or activities were you involved in?', 'teen', true, null),

-- ============================================
-- CAREER & WORK
-- ============================================
('What was your first job?', 'career', true, null),
('What are you most proud of in your career?', 'career', true, null),
('What advice would you give someone starting in your field?', 'career', true, null),
('Tell me about a challenge you overcame at work.', 'career', true, null),
('What was the best job you ever had and why?', 'career', true, null),
('What was the worst job you ever had?', 'career', true, null),
('Who was the best boss you ever had?', 'career', true, null),
('Tell me about a mentor who helped shape your career.', 'career', true, null),
('What was your biggest professional achievement?', 'career', true, null),
('If you could do your career over, what would you change?', 'career', true, null),
('What skills from your career are you most proud of developing?', 'career', true, null),
('Tell me about a project you worked on that you''re proud of.', 'career', true, null),
('What was the hardest decision you ever made at work?', 'career', true, null),
('How did you balance work and family?', 'career', true, null),
('What did retirement mean to you?', 'career', true, null),

-- ============================================
-- RELATIONSHIPS & LOVE
-- ============================================
('How did you meet your spouse/partner?', 'relationships', true, null),
('What is your favorite family tradition?', 'relationships', true, null),
('What do you love most about your children?', 'relationships', true, null),
('Who has been the biggest influence in your life?', 'relationships', true, null),
('Tell me about your wedding day.', 'relationships', true, null),
('What is the secret to a lasting relationship?', 'relationships', true, null),
('What is your fondest memory with your spouse/partner?', 'relationships', true, null),
('How did your relationship with your parents evolve over time?', 'relationships', true, null),
('What is your proudest moment as a parent?', 'relationships', true, null),
('Tell me about your grandchildren.', 'relationships', true, null),
('Who is the friend you''ve had the longest?', 'relationships', true, null),
('What makes a good friend?', 'relationships', true, null),
('How did you maintain friendships over the years?', 'relationships', true, null),
('Tell me about someone who was like family but wasn''t related by blood.', 'relationships', true, null),
('What do you wish you had told someone while you had the chance?', 'relationships', true, null),

-- ============================================
-- WISDOM & VALUES
-- ============================================
('What is the most important lesson life has taught you?', 'wisdom', true, null),
('What advice would you give your younger self?', 'wisdom', true, null),
('What do you hope people remember about you?', 'wisdom', true, null),
('What brings you the most joy in life?', 'wisdom', true, null),
('What are you grateful for?', 'wisdom', true, null),
('What does success mean to you?', 'wisdom', true, null),
('What would you tell your grandchildren about life?', 'wisdom', true, null),
('What matters most to you now that didn''t matter when you were younger?', 'wisdom', true, null),
('What is one thing you would change about the world?', 'wisdom', true, null),
('What does family mean to you?', 'wisdom', true, null),
('What is your definition of happiness?', 'wisdom', true, null),
('What do you believe happens after we die?', 'wisdom', true, null),
('What was the biggest risk you ever took?', 'wisdom', true, null),
('What is the best piece of advice you''ve ever received?', 'wisdom', true, null),
('How do you want to be remembered?', 'wisdom', true, null),
('What do you wish you had done differently?', 'wisdom', true, null),
('What principles have guided your life?', 'wisdom', true, null),
('What have you learned about forgiveness?', 'wisdom', true, null),
('What do you think is the meaning of life?', 'wisdom', true, null),
('What would you want future generations to know?', 'wisdom', true, null),

-- ============================================
-- MEMORIES & EXPERIENCES
-- ============================================
('What is your favorite memory?', 'general', true, null),
('If you could relive one day, which would it be?', 'general', true, null),
('What is something most people don''t know about you?', 'general', true, null),
('What was the best trip you ever took?', 'general', true, null),
('What music or songs are meaningful to you?', 'general', true, null),
('What was the happiest moment of your life?', 'general', true, null),
('Tell me about a time you laughed until you cried.', 'general', true, null),
('What was the most beautiful place you''ve ever been?', 'general', true, null),
('What is a skill or hobby you''re proud of?', 'general', true, null),
('Tell me about a book that changed your life.', 'general', true, null),
('What was your favorite meal growing up?', 'general', true, null),
('What traditions have you passed down to your family?', 'general', true, null),
('Tell me about a time when you surprised yourself.', 'general', true, null),
('What is your favorite photograph and why?', 'general', true, null),
('What smell brings back strong memories for you?', 'general', true, null),

-- ============================================
-- ADVERSITY & RESILIENCE
-- ============================================
('Tell me about a difficult time in your life and how you got through it.', 'adversity', true, null),
('What is the hardest thing you''ve ever had to do?', 'adversity', true, null),
('How did you handle loss or grief?', 'adversity', true, null),
('What challenge are you most proud of overcoming?', 'adversity', true, null),
('Tell me about a time when you felt like giving up but didn''t.', 'adversity', true, null),
('What gave you strength during hard times?', 'adversity', true, null),
('How did your struggles shape who you became?', 'adversity', true, null),
('What helped you stay hopeful during difficult periods?', 'adversity', true, null),
('Tell me about someone who helped you through a tough time.', 'adversity', true, null),
('What would you tell someone going through something similar?', 'adversity', true, null),

-- ============================================
-- HISTORY & WORLD EVENTS
-- ============================================
('What historical events have you lived through?', 'history', true, null),
('How did major world events affect your life?', 'history', true, null),
('What was it like during [specific era - e.g., the 60s, 70s]?', 'history', true, null),
('How has the world changed most since you were young?', 'history', true, null),
('What invention or technology surprised you the most?', 'history', true, null),
('Tell me about a moment in history you''ll never forget.', 'history', true, null),
('What was it like when you first used a computer/internet?', 'history', true, null),
('How did you stay informed about world events?', 'history', true, null),
('What do you think is the most important change you''ve witnessed?', 'history', true, null),
('What would you tell future generations about your era?', 'history', true, null),

-- ============================================
-- HEALTH & WELLBEING
-- ============================================
('What do you do to stay healthy?', 'health', true, null),
('What is your secret to a long life?', 'health', true, null),
('How have you taken care of your mental health?', 'health', true, null),
('What physical activities have you enjoyed throughout life?', 'health', true, null),
('What foods have been important in your life?', 'health', true, null),

-- ============================================
-- FAITH & SPIRITUALITY
-- ============================================
('What role has faith or spirituality played in your life?', 'spirituality', true, null),
('How have your spiritual beliefs evolved over time?', 'spirituality', true, null),
('What gives you comfort and peace?', 'spirituality', true, null),
('Tell me about a spiritual experience that was meaningful to you.', 'spirituality', true, null),
('What do you believe about the purpose of life?', 'spirituality', true, null),

-- ============================================
-- FUN & PERSONALITY
-- ============================================
('What makes you laugh?', 'fun', true, null),
('What''s the funniest thing that ever happened to you?', 'fun', true, null),
('What''s a silly habit you have?', 'fun', true, null),
('What was your favorite movie or TV show?', 'fun', true, null),
('If you could have dinner with anyone from history, who would it be?', 'fun', true, null),
('What''s your guilty pleasure?', 'fun', true, null),
('What nickname have you had and how did you get it?', 'fun', true, null),
('What''s the most adventurous thing you''ve ever done?', 'fun', true, null),
('What would people be surprised to learn about you?', 'fun', true, null),
('What is your favorite way to spend a day?', 'fun', true, null)

ON CONFLICT DO NOTHING;

-- ============================================
-- ADD NEW CATEGORY FOR UI
-- ============================================
-- Note: Update the journalist page to include new categories: teen, adversity, history, health, spirituality, fun
