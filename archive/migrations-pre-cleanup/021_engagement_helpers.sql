-- ============================================================================
-- Migration: Engagement Bubble Helper Functions & Views
-- Created: 2026-02-20
-- Description: Utility functions for generating and managing engagement prompts
-- ============================================================================

-- ============================================================================
-- VIEW: Photos needing backstory
-- ============================================================================

CREATE OR REPLACE VIEW photos_needing_backstory AS
SELECT 
  mm.id AS media_id,
  mm.user_id,
  mm.file_url,
  mm.created_at,
  mm.description,
  (SELECT COUNT(*) FROM detected_faces df WHERE df.media_id = mm.id AND df.matched_contact_id IS NULL) AS untagged_faces
FROM memory_media mm
WHERE mm.description IS NULL
  AND mm.backstory_audio_url IS NULL
  AND mm.file_type IN ('image', 'photo')
ORDER BY mm.created_at DESC;

-- ============================================================================
-- VIEW: Contacts with missing info
-- ============================================================================

CREATE OR REPLACE VIEW contacts_missing_info AS
SELECT 
  c.id AS contact_id,
  c.user_id,
  c.full_name AS name,
  c.avatar_url AS photo_url,
  c.relationship_type,
  CASE 
    WHEN c.date_of_birth IS NULL THEN 'birth_date'
    WHEN c.how_met IS NULL THEN 'how_met'
    WHEN c.email IS NULL AND c.phone IS NULL THEN 'contact_info'
    ELSE NULL
  END AS missing_field,
  -- Priority: birthday > how_met > contact info
  CASE 
    WHEN c.date_of_birth IS NULL THEN 80
    WHEN c.how_met IS NULL THEN 50
    WHEN c.email IS NULL AND c.phone IS NULL THEN 30
    ELSE 0
  END AS priority
FROM contacts c
WHERE 
  c.date_of_birth IS NULL
  OR c.how_met IS NULL
  OR (c.email IS NULL AND c.phone IS NULL)
ORDER BY priority DESC;

-- ============================================================================
-- VIEW: Untagged faces
-- ============================================================================

CREATE OR REPLACE VIEW untagged_faces AS
SELECT 
  df.id AS face_id,
  df.user_id,
  df.media_id,
  mm.file_url AS photo_url,
  df.bbox_x,
  df.bbox_y,
  df.bbox_width,
  df.bbox_height,
  df.created_at,
  -- Suggested match if we have one
  df.matched_contact_id AS suggested_contact_id,
  df.match_confidence,
  c.full_name AS suggested_contact_name
FROM detected_faces df
JOIN memory_media mm ON df.media_id = mm.id
LEFT JOIN contacts c ON df.matched_contact_id = c.id AND df.match_confidence < 0.9
WHERE df.is_ignored = FALSE
  AND (df.matched_contact_id IS NULL OR df.manually_verified = FALSE)
ORDER BY df.created_at DESC;

-- ============================================================================
-- VIEW: Life stage coverage
-- ============================================================================

CREATE OR REPLACE VIEW life_stage_coverage AS
WITH stages AS (
  SELECT unnest(ARRAY[
    'childhood',
    'family',
    'milestones',
    'travel',
    'everyday',
    'wisdom'
  ]) AS stage
),
memory_counts AS (
  SELECT 
    m.user_id,
    CASE 
      WHEN m.ai_category = 'family' OR m.memory_type = 'family' THEN 'family'
      WHEN m.memory_type = 'milestone' THEN 'milestones'
      WHEN m.ai_category = 'travel' OR m.memory_type = 'trip' THEN 'travel'
      WHEN m.memory_type = 'everyday' OR m.memory_type = 'moment' THEN 'everyday'
      ELSE 'everyday'
    END AS stage,
    COUNT(*) AS count
  FROM memories m
  GROUP BY m.user_id, stage
),
knowledge_counts AS (
  SELECT 
    user_id,
    'wisdom' AS stage,
    COUNT(*) AS count
  FROM knowledge_entries
  GROUP BY user_id
)
SELECT 
  p.id AS user_id,
  s.stage,
  COALESCE(mc.count, 0) + COALESCE(kc.count, 0) AS entry_count,
  -- Coverage percentage (target: 5 entries per stage = 100%)
  LEAST(100, (COALESCE(mc.count, 0) + COALESCE(kc.count, 0)) * 20) AS coverage_percent
FROM profiles p
CROSS JOIN stages s
LEFT JOIN memory_counts mc ON p.id = mc.user_id AND s.stage = mc.stage
LEFT JOIN knowledge_counts kc ON p.id = kc.user_id AND s.stage = kc.stage;

-- ============================================================================
-- VIEW: Knowledge category coverage
-- ============================================================================

CREATE OR REPLACE VIEW knowledge_coverage AS
WITH categories AS (
  SELECT unnest(ARRAY[
    'life_lessons',
    'values',
    'relationships',
    'parenting',
    'career',
    'health',
    'practical',
    'legacy',
    'faith',
    'interests',
    'skills'
  ]::knowledge_category[]) AS category
)
SELECT 
  p.id AS user_id,
  c.category,
  COUNT(ke.id) AS entry_count,
  -- Target: 3 entries per category = 100%
  LEAST(100, COUNT(ke.id) * 33) AS coverage_percent
FROM profiles p
CROSS JOIN categories c
LEFT JOIN knowledge_entries ke ON p.id = ke.user_id AND c.category = ke.category
GROUP BY p.id, c.category;

-- ============================================================================
-- FUNCTION: Generate prompts for user
-- ============================================================================

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
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;
  
  -- 1. Generate photo backstory prompts (20%)
  FOR v_photo IN 
    SELECT * FROM photos_needing_backstory 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.2)::INTEGER
  LOOP
    INSERT INTO engagement_prompts (user_id, type, photo_id, prompt_text, priority, source)
    VALUES (
      p_user_id, 
      'photo_backstory', 
      v_photo.media_id,
      'What''s the story behind this photo?',
      60 + (EXTRACT(EPOCH FROM (NOW() - v_photo.created_at)) / 86400)::INTEGER, -- Newer = higher priority
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 2. Generate tag person prompts (15%)
  FOR v_face IN 
    SELECT * FROM untagged_faces 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.15)::INTEGER
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
  
  -- 3. Generate missing info prompts (10%)
  FOR v_contact IN 
    SELECT * FROM contacts_missing_info 
    WHERE user_id = p_user_id 
    LIMIT (p_count * 0.1)::INTEGER
  LOOP
    SELECT * INTO v_template 
    FROM prompt_templates 
    WHERE type = 'missing_info' 
      AND target_field = v_contact.missing_field
      AND is_active = TRUE
    LIMIT 1;
    
    IF FOUND THEN
      INSERT INTO engagement_prompts (user_id, type, contact_id, prompt_text, priority, source, missing_field)
      VALUES (
        p_user_id,
        'missing_info',
        v_contact.contact_id,
        REPLACE(v_template.prompt_text, '{{contact_name}}', v_contact.name),
        v_contact.priority,
        'system',
        v_contact.missing_field
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END IF;
  END LOOP;
  
  -- 4. Generate interest-based prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND target_interest IS NOT NULL
      AND target_interest = ANY(v_profile.interests)
    ORDER BY RANDOM()
    LIMIT (p_count * 0.15)::INTEGER
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
    VALUES (
      p_user_id,
      v_template.type,
      v_template.category,
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'profile_based',
      jsonb_build_object('interest', v_template.target_interest)
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 5. Generate religion-based prompts (if religion set)
  IF v_profile.religion IS NOT NULL AND v_profile.religion != 'prefer_not_to_say' THEN
    FOR v_template IN 
      SELECT * FROM prompt_templates 
      WHERE is_active = TRUE
        AND target_religion = v_profile.religion
      ORDER BY RANDOM()
      LIMIT 2
    LOOP
      INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source, personalization_context)
      VALUES (
        p_user_id,
        v_template.type,
        v_template.category,
        v_template.prompt_text,
        50 + v_template.priority_boost,
        'profile_based',
        jsonb_build_object('religion', v_template.target_religion)
      )
      ON CONFLICT DO NOTHING;
      v_prompt_count := v_prompt_count + 1;
    END LOOP;
  END IF;
  
  -- 6. Generate seasonal prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND v_current_month = ANY(seasonal_months)
    ORDER BY RANDOM()
    LIMIT 2
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (
      p_user_id,
      v_template.type,
      'seasonal',
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'scheduled'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  -- 7. Fill remaining with general prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE
      AND target_interest IS NULL
      AND target_skill IS NULL
      AND target_hobby IS NULL
      AND target_religion IS NULL
      AND seasonal_months IS NULL
    ORDER BY RANDOM()
    LIMIT p_count - v_prompt_count
  LOOP
    INSERT INTO engagement_prompts (user_id, type, category, prompt_text, priority, source)
    VALUES (
      p_user_id,
      v_template.type,
      v_template.category,
      v_template.prompt_text,
      50 + v_template.priority_boost,
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get shuffled prompts
-- ============================================================================

CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Check how many pending prompts exist
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW());
  
  -- Generate more if needed
  IF v_pending_count < p_count OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 20);
  END IF;
  
  -- Return shuffled prompts with type diversity
  RETURN QUERY
  WITH ranked AS (
    SELECT 
      ep.*,
      ROW_NUMBER() OVER (PARTITION BY ep.type ORDER BY RANDOM()) AS type_rank
    FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
  )
  SELECT r.id, r.user_id, r.type, r.category, r.prompt_text, r.prompt_template_id,
         r.photo_id, r.contact_id, r.memory_id, r.compare_photo_id, r.compare_contact_id,
         r.compare_memory_id, r.missing_field, r.status, r.priority, r.created_at,
         r.shown_at, r.answered_at, r.skipped_at, r.expires_at, r.cooldown_until,
         r.response_type, r.response_text, r.response_audio_url, r.response_data,
         r.result_memory_id, r.result_knowledge_id, r.source, r.personalization_context,
         r.metadata, r.updated_at
  FROM ranked r
  WHERE r.type_rank <= 2  -- Max 2 of same type
  ORDER BY r.priority DESC, RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOB: Daily prompt generation (requires pg_cron extension)
-- ============================================================================

-- Note: Uncomment if pg_cron is available
-- SELECT cron.schedule(
--   'generate-daily-prompts',
--   '0 6 * * *', -- Every day at 6 AM
--   $$
--     SELECT generate_engagement_prompts(id, 10)
--     FROM profiles
--     WHERE updated_at > NOW() - INTERVAL '30 days'
--   $$
-- );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW photos_needing_backstory IS 'Photos without descriptions for photo_backstory prompts';
COMMENT ON VIEW contacts_missing_info IS 'Contacts with missing fields for missing_info prompts';
COMMENT ON VIEW untagged_faces IS 'Detected faces not yet matched to contacts';
COMMENT ON VIEW life_stage_coverage IS 'Memory coverage by life stage for prioritizing prompts';
COMMENT ON VIEW knowledge_coverage IS 'Knowledge entry coverage by category';
COMMENT ON FUNCTION generate_engagement_prompts IS 'Generate personalized prompts for a user';
COMMENT ON FUNCTION shuffle_engagement_prompts IS 'Get shuffled set of prompts with type diversity';
