-- ============================================================================
-- Migration: Additional Prompt Templates
-- Created: 2026-02-20
-- Description: PostScript prompts, more knowledge questions, practical wisdom
-- ============================================================================

-- ============================================================================
-- POSTSCRIPT PROMPTS - Future Messages
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Milestone messages
('postscript_18th_001', 'knowledge', 'postscript',
 'What would you tell your child on their 18th birthday?',
 ARRAY['Write a letter to your child for when they turn 18', 'What wisdom would you share on their 18th?'],
 15),

('postscript_wedding_001', 'knowledge', 'postscript',
 'What would you say to your child on their wedding day?',
 ARRAY['Write a message for your child''s wedding day', 'What marriage advice would you give them?'],
 15),

('postscript_grad_001', 'knowledge', 'postscript',
 'What would you tell your child at their graduation?',
 ARRAY['Write a graduation message for your child', 'What advice for starting their career?'],
 10),

('postscript_firstchild_001', 'knowledge', 'postscript',
 'What would you tell your child when they become a parent?',
 ARRAY['Write advice for when your child has their first baby', 'What parenting wisdom would you share?'],
 15),

-- Anniversary messages
('postscript_anniversary_001', 'knowledge', 'postscript',
 'Write a love note to your spouse for a future anniversary',
 ARRAY['What would you say on your 25th anniversary?', 'Leave a message for your partner'],
 10),

-- General future messages
('postscript_tough_001', 'knowledge', 'postscript',
 'What would you tell your loved ones during a difficult time?',
 ARRAY['Write words of comfort for when times get hard', 'What helps you get through tough moments?'],
 10),

('postscript_proud_001', 'knowledge', 'postscript',
 'What makes you most proud of your family?',
 ARRAY['Tell them what you admire about them', 'What do you want them to know you noticed?'],
 10)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- FAVORITES & FIRSTS - Personal History
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Favorites
('knowledge_fav_movie_001', 'knowledge', 'favorites',
 'What''s your favorite movie and why does it resonate with you?',
 ARRAY['What film changed how you see the world?', 'What movie could you watch forever?'],
 5),

('knowledge_fav_book_001', 'knowledge', 'favorites',
 'What book has influenced you most and why?',
 ARRAY['What story stayed with you?', 'What book would you recommend to everyone?'],
 5),

('knowledge_fav_song_001', 'knowledge', 'favorites',
 'What song or artist means the most to you and why?',
 ARRAY['What music defines your life?', 'What song brings back the strongest memories?'],
 5),

('knowledge_fav_place_001', 'knowledge', 'favorites',
 'What''s your favorite place in the world and why?',
 ARRAY['Where do you feel most at peace?', 'What place holds special meaning?'],
 5),

('knowledge_fav_meal_001', 'knowledge', 'favorites',
 'What''s your favorite meal and who makes it best?',
 ARRAY['What dish feels like home?', 'What food brings back memories?'],
 5),

-- Firsts
('memory_first_house_001', 'memory_prompt', 'firsts',
 'Tell me about your first home',
 ARRAY['Where did you live when you first moved out?', 'What was your first place like?'],
 5),

('memory_first_car_001', 'memory_prompt', 'firsts',
 'What was your first car?',
 ARRAY['Tell me about your first vehicle', 'What do you remember about learning to drive?'],
 5),

('memory_first_job_001', 'memory_prompt', 'firsts',
 'What was your very first job?',
 ARRAY['How did you earn your first paycheck?', 'What was your first work experience?'],
 5),

('memory_first_love_001', 'memory_prompt', 'firsts',
 'Tell me about your first love',
 ARRAY['What was your first crush like?', 'Do you remember falling in love for the first time?'],
 5),

('memory_first_pet_001', 'memory_prompt', 'firsts',
 'Tell me about your first pet',
 ARRAY['What was your first animal companion?', 'Did you have pets growing up?'],
 5)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- RECIPES & PRACTICAL WISDOM
-- ============================================================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, priority_boost) VALUES

-- Recipes
('knowledge_recipe_001', 'knowledge', 'recipes',
 'What''s a family recipe that must be passed down?',
 ARRAY['What dish is your signature?', 'What recipe would be lost without you?'],
 10),

('knowledge_recipe_002', 'knowledge', 'recipes',
 'What''s the secret to your best dish?',
 ARRAY['Share the cooking tip you swear by', 'What makes your cooking special?'],
 5),

('knowledge_recipe_003', 'knowledge', 'recipes',
 'What did your mother or grandmother cook best?',
 ARRAY['What family recipe do you treasure?', 'What dish reminds you of your childhood kitchen?'],
 5),

-- Practical advice
('knowledge_practical_house_001', 'knowledge', 'practical',
 'What should someone know before buying a house?',
 ARRAY['What''s your best homebuying advice?', 'What do you wish you knew about owning a home?'],
 5),

('knowledge_practical_car_001', 'knowledge', 'practical',
 'What should someone know before buying a car?',
 ARRAY['What''s your best car-buying tip?', 'How do you choose a good vehicle?'],
 5),

('knowledge_practical_money_001', 'knowledge', 'practical',
 'What''s the best financial advice you can give?',
 ARRAY['What do you wish you knew about money?', 'What''s your best saving tip?'],
 5),

('knowledge_practical_interview_001', 'knowledge', 'practical',
 'What''s your best job interview advice?',
 ARRAY['How do you nail an interview?', 'What gets you hired?'],
 5),

('knowledge_practical_relation_001', 'knowledge', 'practical',
 'What''s the secret to a lasting relationship?',
 ARRAY['What makes love work?', 'What keeps a relationship strong?'],
 10)

ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  priority_boost = EXCLUDED.priority_boost;

-- ============================================================================
-- Update category display for UI
-- ============================================================================

COMMENT ON TABLE prompt_templates IS 'Prompt templates now include: postscript (future messages), favorites, firsts, recipes, practical wisdom';
