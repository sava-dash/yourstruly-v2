-- Migration 085: Fix engagement prompt targeting and photo priority
-- =============================================================================
-- FIXES:
-- 1. generate_engagement_prompts: NEVER serve religion/interest/skill/hobby-targeted
--    templates to users who don't have matching profile data
-- 2. shuffle_engagement_prompts: ALWAYS include at least 1 photo prompt if available
-- 3. Add contact missing info prompts (funny story, address, phone, email, DOB, how met)
-- 4. Better prompt mix: blend user data with reflection questions
-- =============================================================================

-- ============================================
-- STEP 1: Update contacts_missing_info view to include more fields
-- ============================================

CREATE OR REPLACE VIEW contacts_missing_info AS
SELECT 
  c.id AS contact_id,
  c.user_id,
  c.full_name AS name,
  c.avatar_url AS photo_url,
  c.relationship_type,
  unnested.missing_field,
  -- Priority: birthday > how_met > relationship > phone > email > address
  CASE 
    WHEN unnested.missing_field = 'birth_date' THEN 80
    WHEN unnested.missing_field = 'how_met' THEN 70
    WHEN unnested.missing_field = 'relationship' THEN 60
    WHEN unnested.missing_field = 'phone' THEN 40
    WHEN unnested.missing_field = 'email' THEN 35
    WHEN unnested.missing_field = 'address' THEN 30
    ELSE 20
  END AS priority
FROM contacts c
CROSS JOIN LATERAL (
  SELECT missing_field FROM (VALUES
    (CASE WHEN c.date_of_birth IS NULL THEN 'birth_date' END),
    (CASE WHEN c.how_met IS NULL OR c.how_met = '' THEN 'how_met' END),
    (CASE WHEN c.relationship_type IS NULL OR c.relationship_type = '' THEN 'relationship' END),
    (CASE WHEN c.phone IS NULL OR c.phone = '' THEN 'phone' END),
    (CASE WHEN c.email IS NULL OR c.email = '' THEN 'email' END),
    (CASE WHEN c.address IS NULL OR c.address = '' THEN 'address' END)
  ) AS t(missing_field)
  WHERE missing_field IS NOT NULL
) AS unnested
WHERE c.full_name IS NOT NULL AND c.full_name != ''
ORDER BY priority DESC;

-- ============================================
-- STEP 2: Add more contact info prompt templates
-- ============================================

INSERT INTO prompt_templates (id, type, category, prompt_text, prompt_variations, target_field, priority_boost, is_active) VALUES
-- Funny story
('missing_info_funny_001', 'missing_info', 'contact_info',
 'What''s a funny story about {{contact_name}}?',
 ARRAY['Share something hilarious that happened with {{contact_name}}', 'What always makes you laugh about {{contact_name}}?'],
 'funny_story', 7, TRUE),
-- How met (more engaging variations)
('missing_info_howmet_002', 'missing_info', 'contact_info',
 'How did you and {{contact_name}} first cross paths?',
 ARRAY['What''s the story of meeting {{contact_name}}?', 'Do you remember the first time you met {{contact_name}}?'],
 'how_met', 8, TRUE),
-- Birthday (warmer)
('missing_info_birthday_003', 'missing_info', 'contact_info',
 'Do you know when {{contact_name}}''s birthday is? We''ll help you remember it!',
 ARRAY['When does {{contact_name}} celebrate their birthday?'],
 'birth_date', 10, TRUE),
-- Address (warmer)
('missing_info_address_002', 'missing_info', 'contact_info',
 'Where does {{contact_name}} call home these days?',
 ARRAY['What city does {{contact_name}} live in?'],
 'address', 3, TRUE),
-- Phone (warmer)
('missing_info_phone_002', 'missing_info', 'contact_info',
 'Got {{contact_name}}''s phone number? We''ll keep it safe for you.',
 ARRAY['What''s the best number to reach {{contact_name}}?'],
 'phone', 5, TRUE),
-- Email (warmer)
('missing_info_email_002', 'missing_info', 'contact_info',
 'Do you have {{contact_name}}''s email? Useful for future messages.',
 ARRAY['What''s {{contact_name}}''s email address?'],
 'email', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  prompt_variations = EXCLUDED.prompt_variations,
  target_field = EXCLUDED.target_field,
  priority_boost = EXCLUDED.priority_boost,
  is_active = EXCLUDED.is_active;

-- ============================================
-- STEP 3: Rebuild generate_engagement_prompts with proper targeting
-- ============================================

CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_prompt_count INTEGER := 0;
  v_template RECORD;
  v_prompt_text TEXT;
  v_skill TEXT;
  v_interest TEXT;
  v_hobby TEXT;
  v_photo RECORD;
  v_contact RECORD;
  v_current_month INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;

  -- ============================================
  -- 1. PHOTO PROMPTS (priority 80+, up to 5)
  -- Photos needing context get highest priority
  -- ============================================
  FOR v_photo IN 
    SELECT mm.id AS media_id, mm.file_url
    FROM memory_media mm
    WHERE mm.user_id = p_user_id
      AND (mm.file_type = 'image' OR mm.file_type LIKE 'image/%')
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.photo_id = mm.id 
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '10 days'
      )
    ORDER BY mm.created_at DESC
    LIMIT 5
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'photo_backstory'::prompt_type AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      BEGIN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, photo_id, 
          priority, source, personalization_context
        ) VALUES (
          p_user_id, 'photo_backstory'::prompt_type, 'photos', 
          v_template.prompt_text, v_photo.media_id,
          80 + COALESCE(v_template.priority_boost, 0), 'photo_based',
          jsonb_build_object('photo_url', v_photo.file_url)
        );
        v_prompt_count := v_prompt_count + 1;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
  END LOOP;

  -- ============================================
  -- 2. CONTACT STORY PROMPTS (priority 75+, up to 3)
  -- ============================================
  FOR v_contact IN 
    SELECT c.id AS contact_id, c.full_name
    FROM contacts c
    WHERE c.user_id = p_user_id
      AND c.full_name IS NOT NULL AND c.full_name != ''
      AND NOT EXISTS (
        SELECT 1 FROM engagement_prompts ep 
        WHERE ep.contact_id = c.id 
          AND ep.type = 'contact_story'::prompt_type
          AND ep.status IN ('answered', 'pending') 
          AND ep.created_at > NOW() - INTERVAL '60 days'
      )
    ORDER BY RANDOM()
    LIMIT 3
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'contact_story'::prompt_type AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.full_name);
      BEGIN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, contact_id,
          priority, source, personalization_context
        ) VALUES (
          p_user_id, 'contact_story'::prompt_type, 'relationships', 
          v_prompt_text, v_contact.contact_id,
          75 + COALESCE(v_template.priority_boost, 0), 'contact_based',
          jsonb_build_object('contact_name', v_contact.full_name)
        );
        v_prompt_count := v_prompt_count + 1;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
  END LOOP;

  -- ============================================
  -- 3. CONTACT MISSING INFO (priority 65+, up to 3)
  -- Collect DOB, how met, phone, email, address, funny stories
  -- ============================================
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT 3
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info'::prompt_type 
      AND target_field = v_contact.missing_field
      AND is_active = TRUE
    ORDER BY RANDOM() LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      v_prompt_text := REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name);
    ELSE
      v_prompt_text := 'Tell us about ' || v_contact.name;
    END IF;
    
    BEGIN
      INSERT INTO engagement_prompts (
        user_id, type, contact_id, prompt_text, priority, 
        source, missing_field, metadata
      ) VALUES (
        p_user_id, 'missing_info'::prompt_type, v_contact.contact_id,
        v_prompt_text, 65 + COALESCE(v_template.priority_boost, 0),
        'system', v_contact.missing_field,
        jsonb_build_object('contact', jsonb_build_object(
          'name', v_contact.name,
          'relationship', v_contact.relationship_type
        ))
      );
      v_prompt_count := v_prompt_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  -- ============================================
  -- 4. SKILL-BASED PROMPTS (only if user has skills)
  -- ============================================
  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) > 0 THEN
    FOREACH v_skill IN ARRAY v_profile.skills
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND target_religion IS NULL  -- Don't pull religion templates here
          AND (
            prompt_text LIKE '%{{skill}}%' 
            OR (target_skill IS NOT NULL AND LOWER(target_skill) = LOWER(v_skill))
          )
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{skill}}', v_skill);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'skills'), v_prompt_text, 
                  70 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('skill', v_skill));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 10;
      END LOOP;
      EXIT WHEN v_prompt_count >= 10;
    END LOOP;
  END IF;

  -- ============================================
  -- 5. INTEREST-BASED PROMPTS (only if user has interests)
  -- ============================================
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    FOREACH v_interest IN ARRAY v_profile.interests
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND target_religion IS NULL  -- Don't pull religion templates here
          AND (
            prompt_text LIKE '%{{interest}}%' 
            OR (target_interest IS NOT NULL AND LOWER(target_interest) = LOWER(v_interest))
          )
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{interest}}', v_interest);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'interests'), v_prompt_text,
                  68 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('interest', v_interest));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 14;
      END LOOP;
      EXIT WHEN v_prompt_count >= 14;
    END LOOP;
  END IF;

  -- ============================================
  -- 6. HOBBY-BASED PROMPTS (only if user has hobbies)
  -- ============================================
  IF v_profile.hobbies IS NOT NULL AND array_length(v_profile.hobbies, 1) > 0 THEN
    FOREACH v_hobby IN ARRAY v_profile.hobbies
    LOOP
      FOR v_template IN 
        SELECT * FROM prompt_templates 
        WHERE is_active = TRUE 
          AND target_religion IS NULL
          AND (
            prompt_text LIKE '%{{hobby}}%' 
            OR (target_hobby IS NOT NULL AND LOWER(target_hobby) = LOWER(v_hobby))
          )
        ORDER BY RANDOM() LIMIT 2
      LOOP
        v_prompt_text := REPLACE(COALESCE(v_template.prompt_text, ''), '{{hobby}}', v_hobby);
        BEGIN
          INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
          VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'hobbies'), v_prompt_text,
                  66 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                  jsonb_build_object('hobby', v_hobby));
          v_prompt_count := v_prompt_count + 1;
        EXCEPTION WHEN unique_violation THEN NULL;
        END;
        EXIT WHEN v_prompt_count >= 18;
      END LOOP;
      EXIT WHEN v_prompt_count >= 18;
    END LOOP;
  END IF;

  -- ============================================
  -- 7. RELIGION-BASED PROMPTS (ONLY if user has set a religion)
  -- This is the critical fix: never serve religion questions
  -- to users who didn't provide a religion
  -- ============================================
  IF v_profile.religion IS NOT NULL 
     AND v_profile.religion != '' 
     AND v_profile.religion != 'prefer_not_to_say'
     AND v_profile.religion != 'none' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE
        AND target_religion IS NOT NULL
        AND LOWER(target_religion) = LOWER(v_profile.religion)
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      BEGIN
        INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
        VALUES (p_user_id, v_template.type, COALESCE(v_template.category, 'faith'), v_template.prompt_text,
                64 + COALESCE(v_template.priority_boost, 0), 'profile_based',
                jsonb_build_object('religion', v_template.target_religion));
        v_prompt_count := v_prompt_count + 1;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END IF;

  -- ============================================
  -- 8. SEASONAL PROMPTS
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND v_current_month = ANY(seasonal_months)
      AND target_religion IS NULL  -- Seasonal religion prompts only if user matches
    ORDER BY RANDOM()
    LIMIT 2
  LOOP
    BEGIN
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
      VALUES (p_user_id, v_template.type, 'seasonal', v_template.prompt_text,
              62 + COALESCE(v_template.priority_boost, 0), 'scheduled');
      v_prompt_count := v_prompt_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  -- ============================================
  -- 9. GENERAL REFLECTION PROMPTS (fill remainder)
  -- These are the deep life questions - no targeting required
  -- CRITICAL: Exclude ALL targeted templates to prevent leaking
  -- religion/interest/skill/hobby questions to wrong users
  -- ============================================
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
      AND type IN ('memory_prompt'::prompt_type, 'knowledge'::prompt_type)
      AND prompt_text NOT LIKE '%{{%'  -- No unfilled placeholders
      -- Exclude ALL targeted templates
      AND target_interest IS NULL
      AND target_skill IS NULL
      AND target_hobby IS NULL
      AND target_religion IS NULL
      AND target_field IS NULL
      AND seasonal_months IS NULL
    ORDER BY RANDOM()
    LIMIT GREATEST(5, p_count - v_prompt_count)
  LOOP
    BEGIN
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
      VALUES (p_user_id, v_template.type, v_template.category, v_template.prompt_text,
              60 + COALESCE(v_template.priority_boost, 0), 'template');
      v_prompt_count := v_prompt_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Rebuild shuffle to guarantee photo + diverse mix
-- ============================================

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
BEGIN
  -- Get prompts shown in last 24 hours to avoid repetition
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '24 hours';
  
  -- Check how many pending prompts exist
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));
  
  -- Generate more if needed
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 30);
  END IF;
  
  -- Return a diverse set with GUARANTEED photo slot if available
  RETURN QUERY
  WITH 
  available AS (
    SELECT ep.*
    FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown))
  ),
  -- 1. Pick the best photo prompt (guaranteed slot)
  photo_pick AS (
    SELECT a.*, 1 AS slot_group
    FROM available a
    WHERE a.photo_id IS NOT NULL
      AND a.type IN ('photo_backstory'::prompt_type, 'tag_person'::prompt_type)
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  -- 2. Pick a contact prompt (missing info or story)
  contact_pick AS (
    SELECT a.*, 2 AS slot_group
    FROM available a
    WHERE a.contact_id IS NOT NULL
      AND a.id NOT IN (SELECT id FROM photo_pick)
    ORDER BY a.priority DESC, RANDOM()
    LIMIT 1
  ),
  -- 3. Fill remaining with diverse prompts (no more than 1 per category)
  remaining AS (
    SELECT a.*, 3 AS slot_group,
      ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY a.priority DESC, RANDOM()) AS cat_rank
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM photo_pick)
      AND a.id NOT IN (SELECT id FROM contact_pick)
  ),
  fill_picks AS (
    SELECT * FROM remaining
    WHERE cat_rank = 1  -- Max 1 per category for variety
    ORDER BY 
      CASE WHEN source = 'profile_based' THEN 0 ELSE 1 END,  -- Prefer personalized
      priority DESC,
      RANDOM()
    LIMIT GREATEST(0, p_count - (SELECT COUNT(*) FROM photo_pick) - (SELECT COUNT(*) FROM contact_pick))
  ),
  -- Combine all picks
  combined AS (
    SELECT id, user_id, type, category, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM photo_pick
    UNION ALL
    SELECT id, user_id, type, category, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM contact_pick
    UNION ALL
    SELECT id, user_id, type, category, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM fill_picks
  )
  SELECT id, user_id, type, category, prompt_text, prompt_template_id,
         photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
         compare_memory_id, missing_field, status, priority, created_at,
         shown_at, answered_at, skipped_at, expires_at, cooldown_until,
         response_type, response_text, response_audio_url, response_data,
         result_memory_id, result_knowledge_id, source, personalization_context,
         metadata, updated_at
  FROM combined
  ORDER BY slot_group, priority DESC
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Clean up pending prompts that were generated with bad targeting
-- This removes any religion-targeted prompts served to users without that religion
-- ============================================

DELETE FROM engagement_prompts ep
WHERE ep.status = 'pending'
  AND ep.personalization_context ? 'religion'
  AND NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ep.user_id
      AND p.religion IS NOT NULL
      AND p.religion != ''
      AND p.religion != 'prefer_not_to_say'
      AND p.religion != 'none'
      AND LOWER(p.religion) = LOWER(ep.personalization_context->>'religion')
  );

-- Also delete any pending prompts with unfilled template placeholders
DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND prompt_text LIKE '%{{%}}%';

-- Grant execute
GRANT EXECUTE ON FUNCTION generate_engagement_prompts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION shuffle_engagement_prompts(UUID, INTEGER, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION generate_engagement_prompts IS 
  'Generate personalized prompts with strict targeting: religion/skill/interest/hobby templates 
   only served when user profile matches. Photo prompts get highest priority. 
   Fixed in migration 085.';

COMMENT ON FUNCTION shuffle_engagement_prompts IS 
  'Return diverse prompt set with guaranteed photo slot (if available), 
   contact slot, and category-diverse fill. Fixed in migration 085.';
