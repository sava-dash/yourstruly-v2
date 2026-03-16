-- Migration 068: Personalized prompts that reference user's specific skills/interests
-- These use {{variable}} placeholders that get replaced during prompt generation

-- ============================================
-- DYNAMIC SKILL PROMPTS (uses {{skill}} placeholder)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, requires_occupation, priority_boost, is_active) VALUES
('dyn_skill_001', 'memory_prompt', 'skills', 'You mentioned you''re skilled at {{skill}} - how did you develop that ability?', false, 8, true),
('dyn_skill_002', 'memory_prompt', 'skills', 'Tell me about a time your {{skill}} skills really made a difference', false, 8, true),
('dyn_skill_003', 'knowledge', 'skills', 'What advice would you give someone wanting to improve their {{skill}}?', false, 7, true),
('dyn_skill_004', 'memory_prompt', 'skills', 'What''s a proud moment involving your {{skill}} abilities?', false, 7, true),
('dyn_skill_005', 'knowledge', 'skills', 'How has being good at {{skill}} shaped your life?', false, 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- DYNAMIC INTEREST PROMPTS (uses {{interest}} placeholder)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('dyn_int_001', 'memory_prompt', 'interests', 'You''re interested in {{interest}} - what drew you to it?', 8, true),
('dyn_int_002', 'memory_prompt', 'interests', 'Tell me about a memorable experience related to {{interest}}', 8, true),
('dyn_int_003', 'knowledge', 'interests', 'What has {{interest}} taught you about life?', 7, true),
('dyn_int_004', 'memory_prompt', 'interests', 'How did your passion for {{interest}} begin?', 8, true),
('dyn_int_005', 'knowledge', 'interests', 'What do you love most about {{interest}}?', 7, true),
('dyn_int_006', 'memory_prompt', 'interests', 'Who introduced you to {{interest}}?', 7, true),
('dyn_int_007', 'knowledge', 'interests', 'What would you tell someone curious about {{interest}}?', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- DYNAMIC HOBBY PROMPTS (uses {{hobby}} placeholder)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('dyn_hobby_001', 'memory_prompt', 'hobbies', 'You enjoy {{hobby}} - what''s your favorite part of it?', 8, true),
('dyn_hobby_002', 'memory_prompt', 'hobbies', 'Tell me about a meaningful moment while doing {{hobby}}', 8, true),
('dyn_hobby_003', 'knowledge', 'hobbies', 'How has {{hobby}} enriched your life?', 7, true),
('dyn_hobby_004', 'memory_prompt', 'hobbies', 'What got you started with {{hobby}}?', 7, true),
('dyn_hobby_005', 'knowledge', 'hobbies', 'What would you tell someone interested in trying {{hobby}}?', 6, true),
('dyn_hobby_006', 'memory_prompt', 'hobbies', 'What''s the most rewarding thing about {{hobby}}?', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- DYNAMIC LIFE GOAL PROMPTS (uses {{life_goal}} placeholder)
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('dyn_goal_001', 'knowledge', 'goals', 'You want to {{life_goal}} - what drives that goal?', 8, true),
('dyn_goal_002', 'knowledge', 'goals', 'What steps are you taking toward {{life_goal}}?', 7, true),
('dyn_goal_003', 'memory_prompt', 'goals', 'When did you first realize you wanted to {{life_goal}}?', 8, true),
('dyn_goal_004', 'knowledge', 'goals', 'Who inspires you in your journey to {{life_goal}}?', 7, true),
('dyn_goal_005', 'knowledge', 'goals', 'What will it mean to you when you {{life_goal}}?', 8, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- DYNAMIC FAVORITE PROMPTS
-- ============================================
INSERT INTO prompt_templates (id, type, category, prompt_text, target_favorite_type, priority_boost, is_active) VALUES
-- Books
('dyn_book_001', 'memory_prompt', 'favorites', 'You listed {{book}} as a favorite - what makes it special to you?', 'book', 7, true),
('dyn_book_002', 'memory_prompt', 'favorites', 'How did {{book}} change your perspective?', 'book', 7, true),
-- Movies
('dyn_movie_001', 'memory_prompt', 'favorites', 'You love {{movie}} - what resonates with you about it?', 'movie', 7, true),
('dyn_movie_002', 'memory_prompt', 'favorites', 'What memories do you associate with {{movie}}?', 'movie', 6, true),
-- Music
('dyn_music_001', 'memory_prompt', 'favorites', 'You enjoy {{music}} - what does it mean to you?', 'music', 7, true),
('dyn_music_002', 'memory_prompt', 'favorites', 'When did you first discover {{music}}?', 'music', 6, true),
-- Food
('dyn_food_001', 'memory_prompt', 'favorites', 'You listed {{food}} as a favorite - what memories does it bring back?', 'food', 6, true),
('dyn_food_002', 'memory_prompt', 'favorites', 'Who introduced you to {{food}}?', 'food', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- ============================================
-- UPDATE generate_engagement_prompts FUNCTION
-- To use dynamic placeholders
-- ============================================
CREATE OR REPLACE FUNCTION generate_personalized_prompt(
  p_template_text TEXT,
  p_context JSONB
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT := p_template_text;
BEGIN
  -- Replace all known placeholders
  IF p_context ? 'skill' THEN
    v_result := REPLACE(v_result, '{{skill}}', p_context->>'skill');
  END IF;
  IF p_context ? 'interest' THEN
    v_result := REPLACE(v_result, '{{interest}}', p_context->>'interest');
  END IF;
  IF p_context ? 'hobby' THEN
    v_result := REPLACE(v_result, '{{hobby}}', p_context->>'hobby');
  END IF;
  IF p_context ? 'life_goal' THEN
    v_result := REPLACE(v_result, '{{life_goal}}', p_context->>'life_goal');
  END IF;
  IF p_context ? 'book' THEN
    v_result := REPLACE(v_result, '{{book}}', p_context->>'book');
  END IF;
  IF p_context ? 'movie' THEN
    v_result := REPLACE(v_result, '{{movie}}', p_context->>'movie');
  END IF;
  IF p_context ? 'music' THEN
    v_result := REPLACE(v_result, '{{music}}', p_context->>'music');
  END IF;
  IF p_context ? 'food' THEN
    v_result := REPLACE(v_result, '{{food}}', p_context->>'food');
  END IF;
  IF p_context ? 'occupation' THEN
    v_result := REPLACE(v_result, '{{occupation}}', p_context->>'occupation');
  END IF;
  IF p_context ? 'contact_name' THEN
    v_result := REPLACE(v_result, '{{contact_name}}', p_context->>'contact_name');
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_personalized_prompt IS 'Replaces {{placeholder}} variables in prompt text with actual values from context';
