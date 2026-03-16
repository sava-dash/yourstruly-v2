-- Comprehensive personalized prompt generation using ALL profile data

-- First, update religion templates to match profile values
UPDATE prompt_templates SET target_religion = 'Hinduism' WHERE target_religion = 'Hindu';
UPDATE prompt_templates SET target_religion = 'Christianity' WHERE target_religion = 'Christian';
UPDATE prompt_templates SET target_religion = 'Judaism' WHERE target_religion = 'Jewish';
UPDATE prompt_templates SET target_religion = 'Islam' WHERE target_religion = 'Muslim';
UPDATE prompt_templates SET target_religion = 'Buddhism' WHERE target_religion = 'Buddhist';

-- Add columns to prompt_templates for new targeting options
ALTER TABLE prompt_templates 
ADD COLUMN IF NOT EXISTS target_personality_type TEXT,
ADD COLUMN IF NOT EXISTS target_personality_trait TEXT,
ADD COLUMN IF NOT EXISTS target_life_goal TEXT,
ADD COLUMN IF NOT EXISTS target_language TEXT,
ADD COLUMN IF NOT EXISTS target_education_level TEXT,
ADD COLUMN IF NOT EXISTS target_favorite_type TEXT, -- 'book', 'movie', 'music', 'food'
ADD COLUMN IF NOT EXISTS requires_occupation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_location BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_biography BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_min INTEGER,
ADD COLUMN IF NOT EXISTS age_max INTEGER;

-- Comprehensive prompt generation function
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
  v_user_age INTEGER;
  v_target_personalized INTEGER;
  v_target_general INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;
  
  -- Calculate user age
  IF v_profile.date_of_birth IS NOT NULL THEN
    v_user_age := EXTRACT(YEAR FROM age(v_profile.date_of_birth))::INTEGER;
  END IF;
  
  -- Target: 60% personalized, 40% general
  v_target_personalized := (p_count * 0.6)::INTEGER;
  v_target_general := p_count - v_target_personalized;
  
  -- ============================================
  -- PHOTO & CONTACT PROMPTS (20% of total)
  -- ============================================
  
  -- 1. Photo backstory prompts
  FOR v_photo IN 
    SELECT * FROM photos_needing_backstory 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.1)::INTEGER
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
  
  -- 2. Tag person prompts
  FOR v_face IN 
    SELECT * FROM untagged_faces 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.05)::INTEGER
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
  
  -- 3. Missing contact info prompts
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.05)::INTEGER
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info' AND target_field = v_contact.missing_field AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    v_prompt_text := COALESCE(
      REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name),
      'Update ' || v_contact.name || '''s ' || v_contact.missing_field
    );
    
    INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source, missing_field, metadata)
    VALUES (p_user_id, 'missing_info', v_contact.contact_id, v_prompt_text, v_contact.priority, 'system', v_contact.missing_field,
      jsonb_build_object('contact', jsonb_build_object('name', v_contact.name, 'photo_url', v_contact.photo_url, 'relationship', v_contact.relationship_type)))
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;

  -- ============================================
  -- PERSONALIZED PROMPTS (60% of total)
  -- ============================================
  
  -- 4. Interest-based prompts
  IF array_length(v_profile.interests, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_interest IS NOT NULL
        AND LOWER(target_interest) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.interests))
      ORDER BY RANDOM()
      LIMIT GREATEST(2, (v_target_personalized * 0.15)::INTEGER)
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 60 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('interest', v_template.target_interest))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 5. Hobby-based prompts
  IF array_length(v_profile.hobbies, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_hobby IS NOT NULL
        AND LOWER(target_hobby) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.hobbies))
      ORDER BY RANDOM()
      LIMIT GREATEST(2, (v_target_personalized * 0.15)::INTEGER)
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 60 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('hobby', v_template.target_hobby))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 6. Skill-based prompts
  IF array_length(v_profile.skills, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_skill IS NOT NULL
        AND LOWER(target_skill) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.skills))
      ORDER BY RANDOM()
      LIMIT GREATEST(1, (v_target_personalized * 0.1)::INTEGER)
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 58 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('skill', v_template.target_skill))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 7. Religion-based prompts
  IF array_length(v_profile.religions, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_religion IS NOT NULL
        AND target_religion = ANY(v_profile.religions)
        AND target_religion NOT IN ('Prefer not to say', 'Agnostic', 'Atheist')
      ORDER BY RANDOM()
      LIMIT GREATEST(1, (v_target_personalized * 0.1)::INTEGER)
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 58 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('religion', v_template.target_religion))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 8. Life goal-based prompts
  IF array_length(v_profile.life_goals, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_life_goal IS NOT NULL
        AND LOWER(target_life_goal) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.life_goals))
      ORDER BY RANDOM()
      LIMIT GREATEST(1, (v_target_personalized * 0.1)::INTEGER)
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 58 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('life_goal', v_template.target_life_goal))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 9. Personality type-based prompts
  IF v_profile.personality_type IS NOT NULL AND v_profile.personality_type != '' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_personality_type IS NOT NULL
        AND v_profile.personality_type ILIKE '%' || target_personality_type || '%'
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 55 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('personality_type', v_profile.personality_type))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 10. Personality trait-based prompts
  IF array_length(v_profile.personality_traits, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_personality_trait IS NOT NULL
        AND LOWER(target_personality_trait) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.personality_traits))
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 55 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('personality_trait', v_template.target_personality_trait))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 11. Language-based prompts
  IF array_length(v_profile.languages, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_language IS NOT NULL
        AND LOWER(target_language) = ANY(SELECT LOWER(unnest) FROM unnest(v_profile.languages))
      ORDER BY RANDOM()
      LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 55 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('language', v_template.target_language))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 12. Education-based prompts
  IF v_profile.education_level IS NOT NULL AND v_profile.education_level != '' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND target_education_level IS NOT NULL
        AND LOWER(target_education_level) = LOWER(v_profile.education_level)
      ORDER BY RANDOM()
      LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 55 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('education', v_profile.education_level))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 13. Occupation-based prompts
  IF v_profile.occupation IS NOT NULL AND v_profile.occupation != '' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND requires_occupation = TRUE
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, 
        REPLACE(v_template.prompt_text, '{{occupation}}', v_profile.occupation),
        55 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('occupation', v_profile.occupation))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 14. Location-based prompts
  IF v_profile.city IS NOT NULL OR v_profile.country IS NOT NULL THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE AND requires_location = TRUE
      ORDER BY RANDOM()
      LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('city', v_profile.city, 'country', v_profile.country))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 15. Age-based prompts
  IF v_user_age IS NOT NULL THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE 
        AND (age_min IS NOT NULL OR age_max IS NOT NULL)
        AND (age_min IS NULL OR v_user_age >= age_min)
        AND (age_max IS NULL OR v_user_age <= age_max)
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('age', v_user_age))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 16. Favorite books/movies/music/foods prompts
  IF array_length(v_profile.favorite_books, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates WHERE is_active = TRUE AND target_favorite_type = 'book'
      ORDER BY RANDOM() LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('favorite_books', v_profile.favorite_books))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  IF array_length(v_profile.favorite_movies, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates WHERE is_active = TRUE AND target_favorite_type = 'movie'
      ORDER BY RANDOM() LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('favorite_movies', v_profile.favorite_movies))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  IF array_length(v_profile.favorite_music, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates WHERE is_active = TRUE AND target_favorite_type = 'music'
      ORDER BY RANDOM() LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('favorite_music', v_profile.favorite_music))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  IF array_length(v_profile.favorite_foods, 1) > 0 THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates WHERE is_active = TRUE AND target_favorite_type = 'food'
      ORDER BY RANDOM() LIMIT 1
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 52 + v_template.priority_boost, 'profile_based',
        jsonb_build_object('favorite_foods', v_profile.favorite_foods))
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- ============================================
  -- SEASONAL PROMPTS
  -- ============================================
  
  -- 17. Seasonal prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE AND v_current_month = ANY(seasonal_months)
    ORDER BY RANDOM()
    LIMIT 2
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (p_user_id, v_template.type, 'seasonal', v_template.prompt_text, 50 + v_template.priority_boost, 'scheduled')
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- ============================================
  -- GENERAL PROMPTS (fill remaining)
  -- ============================================
  
  -- 18. Fill remaining with general knowledge/memory prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND type IN ('knowledge', 'memory_prompt')
      AND target_interest IS NULL AND target_skill IS NULL AND target_hobby IS NULL
      AND target_religion IS NULL AND target_life_goal IS NULL AND target_personality_type IS NULL
      AND target_personality_trait IS NULL AND target_language IS NULL AND target_education_level IS NULL
      AND target_favorite_type IS NULL AND requires_occupation = FALSE AND requires_location = FALSE
      AND seasonal_months IS NULL AND age_min IS NULL AND age_max IS NULL
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - v_prompt_count)
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text, 50 + v_template.priority_boost, 'system')
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED COMPREHENSIVE PROMPT TEMPLATES
-- ============================================

-- INTEREST-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_interest, priority_boost, is_active) VALUES
('memory_music_001', 'memory_prompt', 'interests', 'What song takes you back to a specific memory?', 'Music', 5, true),
('knowledge_music_001', 'knowledge', 'interests', 'What does music mean in your life?', 'Music', 5, true),
('memory_reading_001', 'memory_prompt', 'interests', 'What book changed your perspective on life?', 'Reading', 5, true),
('knowledge_reading_001', 'knowledge', 'interests', 'What lessons have books taught you?', 'Reading', 5, true),
('memory_travel_001', 'memory_prompt', 'interests', 'What trip changed you the most?', 'Travel', 5, true),
('knowledge_travel_001', 'knowledge', 'interests', 'What has traveling taught you about yourself?', 'Travel', 5, true),
('memory_fitness_001', 'memory_prompt', 'interests', 'Tell me about a fitness milestone you''re proud of', 'Fitness', 5, true),
('memory_photography_001', 'memory_prompt', 'interests', 'What draws you to capture moments through photos?', 'Photography', 5, true),
('memory_art_001', 'memory_prompt', 'interests', 'What piece of art has moved you the most?', 'Art', 5, true),
('memory_gardening_001', 'memory_prompt', 'interests', 'What have you learned from gardening?', 'Gardening', 5, true),
('memory_technology_001', 'memory_prompt', 'interests', 'How has technology changed your life?', 'Technology', 5, true),
('memory_gaming_001', 'memory_prompt', 'interests', 'What game holds special memories for you?', 'Gaming', 5, true),
('memory_movies_001', 'memory_prompt', 'interests', 'What movie has had the biggest impact on you?', 'Movies', 5, true),
('memory_sports_001', 'memory_prompt', 'interests', 'Tell me about a memorable sports moment', 'Sports', 5, true),
('memory_writing_001', 'memory_prompt', 'interests', 'What made you start writing?', 'Writing', 5, true),
('memory_yoga_001', 'memory_prompt', 'interests', 'How has yoga changed your perspective?', 'Yoga', 5, true),
('memory_nature_001', 'memory_prompt', 'interests', 'What''s your favorite place in nature?', 'Nature', 5, true),
('memory_animals_001', 'memory_prompt', 'interests', 'Tell me about a pet or animal that was special to you', 'Animals', 5, true),
('memory_history_001', 'memory_prompt', 'interests', 'What historical event fascinates you most?', 'History', 5, true),
('memory_science_001', 'memory_prompt', 'interests', 'What scientific discovery amazes you?', 'Science', 5, true),
('memory_philosophy_001', 'memory_prompt', 'interests', 'What philosophical idea has shaped your worldview?', 'Philosophy', 5, true),
('memory_spirituality_001', 'memory_prompt', 'interests', 'Tell me about a spiritual experience that moved you', 'Spirituality', 5, true),
('memory_volunteering_001', 'memory_prompt', 'interests', 'What''s the most rewarding volunteer experience you''ve had?', 'Volunteering', 5, true),
('memory_fashion_001', 'memory_prompt', 'interests', 'How has your style evolved over the years?', 'Fashion', 5, true),
('memory_diy_001', 'memory_prompt', 'interests', 'What''s the most satisfying DIY project you''ve completed?', 'DIY Projects', 5, true),
('memory_dancing_001', 'memory_prompt', 'interests', 'Tell me about a memorable time dancing', 'Dancing', 5, true),
('memory_theater_001', 'memory_prompt', 'interests', 'What theatrical performance has stayed with you?', 'Theater', 5, true),
('memory_wine_001', 'memory_prompt', 'interests', 'Tell me about a memorable dining experience', 'Wine & Dining', 5, true),
('memory_crafts_001', 'memory_prompt', 'interests', 'What craft brings you the most joy to create?', 'Crafts', 5, true),
('memory_podcasts_001', 'memory_prompt', 'interests', 'What podcast has changed how you think?', 'Podcasts', 5, true),
('memory_languages_001', 'memory_prompt', 'interests', 'What inspired you to learn new languages?', 'Languages', 5, true),
('memory_boardgames_001', 'memory_prompt', 'interests', 'What''s your favorite board game memory?', 'Board Games', 5, true),
('memory_cars_001', 'memory_prompt', 'interests', 'Tell me about a car that holds special memories', 'Cars', 5, true),
('memory_homedecor_001', 'memory_prompt', 'interests', 'What does your ideal home look like?', 'Home Decor', 5, true),
('memory_hiking_int_001', 'memory_prompt', 'interests', 'What''s the most beautiful place you''ve hiked?', 'Hiking', 5, true),
('memory_tvshows_001', 'memory_prompt', 'interests', 'What TV show has meant the most to you?', 'TV Shows', 5, true)
ON CONFLICT (id) DO NOTHING;

-- HOBBY-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_hobby, priority_boost, is_active) VALUES
('memory_golf_001', 'memory_prompt', 'hobbies', 'What''s your most memorable round of golf?', 'Golf', 5, true),
('memory_woodworking_001', 'memory_prompt', 'hobbies', 'What project are you most proud of making?', 'Woodworking', 5, true),
('memory_fishing_001', 'memory_prompt', 'hobbies', 'Tell me about a memorable fishing trip', 'Fishing', 5, true),
('memory_hiking_001', 'memory_prompt', 'hobbies', 'What trail holds the best memories?', 'Hiking', 5, true),
('memory_painting_001', 'memory_prompt', 'hobbies', 'What inspires your art?', 'Painting', 5, true),
('memory_knitting_001', 'memory_prompt', 'hobbies', 'What''s the most meaningful thing you''ve knitted?', 'Knitting', 5, true),
('memory_cycling_001', 'memory_prompt', 'hobbies', 'What''s your favorite cycling route and why?', 'Cycling', 5, true),
('memory_birdwatching_001', 'memory_prompt', 'hobbies', 'What''s the most exciting bird you''ve spotted?', 'Bird Watching', 5, true),
('memory_pottery_001', 'memory_prompt', 'hobbies', 'What draws you to working with clay?', 'Pottery', 5, true),
('memory_camping_001', 'memory_prompt', 'hobbies', 'Tell me about your most memorable camping trip', 'Camping', 5, true),
('memory_skiing_001', 'memory_prompt', 'hobbies', 'What''s your favorite ski memory?', 'Skiing', 5, true),
('memory_surfing_001', 'memory_prompt', 'hobbies', 'What does being in the ocean mean to you?', 'Surfing', 5, true),
('memory_running_001', 'memory_prompt', 'hobbies', 'Tell me about a race or run that challenged you', 'Running', 5, true),
('memory_chess_001', 'memory_prompt', 'hobbies', 'What has chess taught you about life?', 'Chess', 5, true),
('memory_scrapbooking_001', 'memory_prompt', 'hobbies', 'What memory are you most glad you preserved?', 'Scrapbooking', 5, true)
ON CONFLICT (id) DO NOTHING;

-- SKILL-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_skill, priority_boost, is_active) VALUES
('knowledge_leadership_001', 'knowledge', 'skills', 'What has leadership taught you about people?', 'Leadership', 5, true),
('knowledge_communication_001', 'knowledge', 'skills', 'What''s the most important communication lesson you''ve learned?', 'Communication', 5, true),
('knowledge_creativity_001', 'knowledge', 'skills', 'How do you nurture your creativity?', 'Creativity', 5, true),
('knowledge_teaching_001', 'knowledge', 'skills', 'What''s the most rewarding part of teaching others?', 'Teaching', 5, true),
('knowledge_problem_solving_001', 'knowledge', 'skills', 'Tell me about a problem you''re proud of solving', 'Problem-solving', 5, true),
('knowledge_writing_skill_001', 'knowledge', 'skills', 'What has writing taught you about yourself?', 'Writing', 5, true),
('knowledge_public_speaking_001', 'knowledge', 'skills', 'How did you overcome fear of public speaking?', 'Public Speaking', 5, true),
('knowledge_negotiation_001', 'knowledge', 'skills', 'What''s the key to good negotiation?', 'Negotiation', 5, true),
('knowledge_mentoring_001', 'knowledge', 'skills', 'What''s the most rewarding mentoring experience you''ve had?', 'Mentoring', 5, true),
('knowledge_planning_001', 'knowledge', 'skills', 'How do you approach planning for the future?', 'Planning', 5, true)
ON CONFLICT (id) DO NOTHING;

-- LIFE GOAL-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_life_goal, priority_boost, is_active) VALUES
('knowledge_family_goal_001', 'knowledge', 'goals', 'What does family mean to you?', 'Start a family', 5, true),
('knowledge_travel_goal_001', 'knowledge', 'goals', 'What places are still on your bucket list?', 'Travel the world', 5, true),
('knowledge_business_goal_001', 'knowledge', 'goals', 'What drives your entrepreneurial spirit?', 'Start a business', 5, true),
('knowledge_book_goal_001', 'knowledge', 'goals', 'What story do you want to tell the world?', 'Write a book', 5, true),
('knowledge_retire_goal_001', 'knowledge', 'goals', 'What does your ideal retirement look like?', 'Retire early', 5, true),
('knowledge_learn_goal_001', 'knowledge', 'goals', 'What would you love to master?', 'Learn a new skill', 5, true),
('knowledge_give_goal_001', 'knowledge', 'goals', 'How do you want to give back to the world?', 'Give back to community', 5, true),
('knowledge_health_goal_001', 'knowledge', 'goals', 'What does living healthy mean to you?', 'Live a healthy life', 5, true),
('knowledge_mentor_goal_001', 'knowledge', 'goals', 'Who has been your greatest mentor?', 'Be a mentor', 5, true),
('knowledge_legacy_goal_001', 'knowledge', 'goals', 'What legacy do you want to leave behind?', 'Leave a legacy', 5, true)
ON CONFLICT (id) DO NOTHING;

-- PERSONALITY TYPE-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_personality_type, priority_boost, is_active) VALUES
('knowledge_intj_001', 'knowledge', 'personality', 'How do you approach solving complex problems?', 'INTJ', 5, true),
('knowledge_enfp_001', 'knowledge', 'personality', 'What inspires you to connect with new people?', 'ENFP', 5, true),
('knowledge_infj_001', 'knowledge', 'personality', 'How do you balance helping others with self-care?', 'INFJ', 5, true),
('knowledge_estp_001', 'knowledge', 'personality', 'What adventure has taught you the most?', 'ESTP', 5, true),
('knowledge_isfj_001', 'knowledge', 'personality', 'How do you show care for the people you love?', 'ISFJ', 5, true),
('knowledge_introvert_001', 'knowledge', 'personality', 'How do you recharge when life gets overwhelming?', 'Introvert', 5, true),
('knowledge_extrovert_001', 'knowledge', 'personality', 'What do you love most about connecting with others?', 'Extrovert', 5, true)
ON CONFLICT (id) DO NOTHING;

-- PERSONALITY TRAIT-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_personality_trait, priority_boost, is_active) VALUES
('knowledge_optimistic_001', 'knowledge', 'personality', 'How has optimism shaped your life?', 'Optimistic', 5, true),
('knowledge_curious_001', 'knowledge', 'personality', 'What are you most curious about right now?', 'Curious', 5, true),
('knowledge_empathetic_001', 'knowledge', 'personality', 'Tell me about a time your empathy made a difference', 'Empathetic', 5, true),
('knowledge_creative_trait_001', 'knowledge', 'personality', 'Where does your creativity come from?', 'Creative', 5, true),
('knowledge_adventurous_001', 'knowledge', 'personality', 'What''s the most adventurous thing you''ve done?', 'Adventurous', 5, true),
('knowledge_patient_001', 'knowledge', 'personality', 'How has patience served you in life?', 'Patient', 5, true),
('knowledge_resilient_001', 'knowledge', 'personality', 'What has made you resilient?', 'Resilient', 5, true),
('knowledge_energetic_001', 'knowledge', 'personality', 'What gives you energy?', 'Energetic', 5, true)
ON CONFLICT (id) DO NOTHING;

-- LANGUAGE-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_language, priority_boost, is_active) VALUES
('memory_spanish_001', 'memory_prompt', 'languages', 'Tell me about a connection you made speaking Spanish', 'Spanish', 5, true),
('memory_french_001', 'memory_prompt', 'languages', 'What does French culture mean to you?', 'French', 5, true),
('memory_german_001', 'memory_prompt', 'languages', 'What drew you to learn German?', 'German', 5, true),
('memory_chinese_001', 'memory_prompt', 'languages', 'What has learning Mandarin taught you?', 'Chinese (Mandarin)', 5, true),
('memory_japanese_001', 'memory_prompt', 'languages', 'What aspects of Japanese culture inspire you?', 'Japanese', 5, true),
('memory_italian_001', 'memory_prompt', 'languages', 'Tell me about an experience where Italian enriched your life', 'Italian', 5, true),
('memory_portuguese_001', 'memory_prompt', 'languages', 'What connection do you have with Portuguese-speaking cultures?', 'Portuguese', 5, true),
('memory_korean_001', 'memory_prompt', 'languages', 'What inspired you to learn Korean?', 'Korean', 5, true),
('memory_arabic_001', 'memory_prompt', 'languages', 'How has Arabic opened doors for you?', 'Arabic', 5, true),
('memory_hindi_001', 'memory_prompt', 'languages', 'Tell me about your connection to Hindi', 'Hindi', 5, true)
ON CONFLICT (id) DO NOTHING;

-- EDUCATION-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_education_level, priority_boost, is_active) VALUES
('memory_highschool_001', 'memory_prompt', 'education', 'What''s your favorite high school memory?', 'High School', 5, true),
('memory_college_001', 'memory_prompt', 'education', 'What did college teach you beyond academics?', 'Some College', 5, true),
('memory_bachelors_001', 'memory_prompt', 'education', 'How did your degree shape your career path?', 'Bachelor''s Degree', 5, true),
('memory_masters_001', 'memory_prompt', 'education', 'What drove you to pursue a master''s degree?', 'Master''s Degree', 5, true),
('memory_doctorate_001', 'memory_prompt', 'education', 'What inspired your doctoral research?', 'Doctorate', 5, true)
ON CONFLICT (id) DO NOTHING;

-- OCCUPATION-BASED TEMPLATES (requires_occupation = true)
INSERT INTO prompt_templates (id, type, category, prompt_text, requires_occupation, priority_boost, is_active) VALUES
('knowledge_career_001', 'knowledge', 'career', 'What do you love most about your work as {{occupation}}?', true, 5, true),
('knowledge_career_002', 'knowledge', 'career', 'How did you end up in your career?', true, 5, true),
('knowledge_career_003', 'knowledge', 'career', 'What''s the most rewarding part of your job?', true, 5, true),
('knowledge_career_004', 'knowledge', 'career', 'What advice would you give someone starting in your field?', true, 5, true),
('memory_career_001', 'memory_prompt', 'career', 'Tell me about a proud moment in your career', true, 5, true)
ON CONFLICT (id) DO NOTHING;

-- LOCATION-BASED TEMPLATES (requires_location = true)
INSERT INTO prompt_templates (id, type, category, prompt_text, requires_location, priority_boost, is_active) VALUES
('memory_location_001', 'memory_prompt', 'location', 'What do you love most about where you live?', true, 5, true),
('memory_location_002', 'memory_prompt', 'location', 'What makes your hometown special?', true, 5, true),
('knowledge_location_001', 'knowledge', 'location', 'How has your location shaped who you are?', true, 5, true)
ON CONFLICT (id) DO NOTHING;

-- AGE-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, age_min, age_max, priority_boost, is_active) VALUES
('memory_youth_001', 'memory_prompt', 'life_stage', 'What do you wish you knew at 18?', 30, NULL, 5, true),
('memory_midlife_001', 'memory_prompt', 'life_stage', 'What has been the biggest surprise of adulthood?', 35, 55, 5, true),
('knowledge_wisdom_001', 'knowledge', 'life_stage', 'What wisdom would you share with the next generation?', 50, NULL, 5, true),
('knowledge_legacy_age_001', 'knowledge', 'life_stage', 'What do you want to be remembered for?', 60, NULL, 5, true),
('memory_young_001', 'memory_prompt', 'life_stage', 'What dreams are you chasing right now?', 18, 30, 5, true)
ON CONFLICT (id) DO NOTHING;

-- FAVORITES-BASED TEMPLATES
INSERT INTO prompt_templates (id, type, category, prompt_text, target_favorite_type, priority_boost, is_active) VALUES
('knowledge_books_001', 'knowledge', 'favorites', 'Why do your favorite books resonate with you?', 'book', 5, true),
('knowledge_movies_001', 'knowledge', 'favorites', 'What do your favorite movies say about you?', 'movie', 5, true),
('knowledge_music_fav_001', 'knowledge', 'favorites', 'What memories does your favorite music bring back?', 'music', 5, true),
('knowledge_food_001', 'knowledge', 'favorites', 'What''s the story behind your favorite foods?', 'food', 5, true),
('memory_books_001', 'memory_prompt', 'favorites', 'Tell me about when you first read your favorite book', 'book', 5, true),
('memory_movies_fav_001', 'memory_prompt', 'favorites', 'What memory is connected to your favorite movie?', 'movie', 5, true)
ON CONFLICT (id) DO NOTHING;
