-- ============================================================================
-- Unlock Prompt Volume
-- Created: 2026-04-09
--
-- Problem: Dashboard was showing at most ~25 engagement prompts even though
-- the template library has several hundred. Three stacked bottlenecks:
--
--   1. shuffle_engagement_prompts() had `WHERE cat_rank = 1` in its fill
--      group, meaning only ONE prompt per category.value could ever be
--      returned. With ~25 distinct category values in the template pool,
--      that hard-capped p_count at 25 regardless of what the caller asked
--      for.
--
--   2. generate_engagement_prompts() was invoked with a fixed batch of 30
--      and split into ~6 photo / 4 tag / 3 missing / 4 religion / 3 interest
--      / 9 general. Tiny slices meant the pool drained quickly.
--
--   3. A 24h "recently shown" cooldown further culled the visible pool,
--      even for users who only open the app once a day.
--
-- Fix: bump the generation batch, keep category diversity via a looser
-- cat_rank cap (proportional to requested count), shrink the cooldown to
-- 6 hours.
-- ============================================================================

-- 1. Bigger generation batch -----------------------------------------------
--    Bump default from 20 → 60 so a single regeneration refills ~60 rows.
--    The internal percentage splits still apply.
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 60
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
  v_condition_met BOOLEAN;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_current_month := EXTRACT(MONTH FROM NOW())::INTEGER;

  -- 1. Photo backstory (20%)
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
      60 + (EXTRACT(EPOCH FROM (NOW() - v_photo.created_at)) / 86400)::INTEGER,
      'system'
    )
    ON CONFLICT DO NOTHING;
    v_prompt_count := v_prompt_count + 1;
  END LOOP;

  -- 2. Tag person (15%)
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

  -- 3. Missing info (10%)
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
      v_condition_met := check_prompt_condition(p_user_id, v_template.conditional_query);
      IF v_condition_met THEN
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
    END IF;
  END LOOP;

  -- 4. Religion-based (15% of template share)
  IF v_profile.religion IS NOT NULL THEN
    FOR v_template IN
      SELECT * FROM prompt_templates
      WHERE is_active = TRUE
        AND target_religion = v_profile.religion
      ORDER BY priority_boost DESC, RANDOM()
      LIMIT (p_count * 0.15)::INTEGER
    LOOP
      v_condition_met := check_prompt_condition(p_user_id, v_template.conditional_query);
      IF v_condition_met THEN
        IF NOT EXISTS (
          SELECT 1 FROM engagement_prompts
          WHERE user_id = p_user_id
            AND prompt_template_id = v_template.id
            AND status = 'pending'
        ) THEN
          INSERT INTO engagement_prompts (
            user_id, type, category, prompt_text, prompt_template_id,
            priority, source
          )
          VALUES (
            p_user_id,
            v_template.type,
            v_template.category,
            v_template.prompt_text,
            v_template.id,
            50 + v_template.priority_boost,
            'template'
          )
          ON CONFLICT DO NOTHING;
          v_prompt_count := v_prompt_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 5. Interest-based (10%)
  FOR v_template IN
    SELECT * FROM prompt_templates
    WHERE is_active = TRUE
      AND target_interest IS NOT NULL
      AND target_interest = ANY(v_profile.interests)
    ORDER BY priority_boost DESC, RANDOM()
    LIMIT (p_count * 0.1)::INTEGER
  LOOP
    v_condition_met := check_prompt_condition(p_user_id, v_template.conditional_query);
    IF v_condition_met THEN
      IF NOT EXISTS (
        SELECT 1 FROM engagement_prompts
        WHERE user_id = p_user_id
          AND prompt_template_id = v_template.id
          AND status = 'pending'
      ) THEN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, prompt_template_id,
          priority, source
        )
        VALUES (
          p_user_id,
          v_template.type,
          v_template.category,
          v_template.prompt_text,
          v_template.id,
          45 + v_template.priority_boost,
          'template'
        )
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- 6. General pool (bumped to 45% so we get meaningful volume even when
  --    the user hasn't set religion/interests)
  FOR v_template IN
    SELECT * FROM prompt_templates
    WHERE is_active = TRUE
      AND target_religion IS NULL
      AND target_interest IS NULL
      AND type IN ('memory_prompt', 'favorites_firsts', 'knowledge', 'recipes_wisdom', 'connect_dots', 'highlight')
    ORDER BY priority_boost DESC, RANDOM()
    LIMIT (p_count * 0.45)::INTEGER
  LOOP
    v_condition_met := check_prompt_condition(p_user_id, v_template.conditional_query);
    IF v_condition_met THEN
      IF NOT EXISTS (
        SELECT 1 FROM engagement_prompts
        WHERE user_id = p_user_id
          AND prompt_template_id = v_template.id
          AND status = 'pending'
      ) THEN
        INSERT INTO engagement_prompts (
          user_id, type, category, prompt_text, prompt_template_id,
          priority, source
        )
        VALUES (
          p_user_id,
          v_template.type,
          v_template.category,
          v_template.prompt_text,
          v_template.id,
          40 + v_template.priority_boost,
          'template'
        )
        ON CONFLICT DO NOTHING;
        v_prompt_count := v_prompt_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_engagement_prompts IS
  'Generates fresh engagement prompts for a user based on their profile, interests, religion, and photos. Default batch raised to 60.';


-- 2. Shuffle without the cat_rank=1 bottleneck -----------------------------
--    Previously: fill_picks kept exactly 1 row per category value, hard-
--    capping the feed at ~25. Now we allow up to `cat_cap` rows per
--    category (proportional to p_count) so category diversity is
--    preserved but volume actually honors the caller's request.
--    Also shrinks the "recently shown" cooldown from 24h → 6h so
--    same-day refreshes surface fresh rows.
CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE,
  p_life_chapter TEXT DEFAULT NULL
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_recently_shown TEXT[];
  v_cat_cap INTEGER;
  v_gen_batch INTEGER;
BEGIN
  -- How many rows per category to allow in the fill pool. Scales with
  -- request size: p_count=5 → 3, p_count=30 → 6, p_count=100 → 20.
  v_cat_cap := GREATEST(3, (p_count / 5)::INTEGER);

  -- Generation batch: always refill at least p_count * 2 so we have
  -- headroom after dedup/conditionals.
  v_gen_batch := GREATEST(60, p_count * 2);

  -- Pull recent prompt_text values from the LAST 6 HOURS (was 24h).
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '6 hours';

  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));

  -- Top up generation whenever the pool is below ~2x what we need.
  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, v_gen_batch);
  END IF;

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
  photo_pick AS (
    SELECT a.*, 1 AS slot_group
    FROM available a
    WHERE a.photo_id IS NOT NULL
      AND a.type IN ('photo_backstory'::prompt_type, 'tag_person'::prompt_type)
    ORDER BY RANDOM()
    LIMIT GREATEST(1, (p_count / 10)::INTEGER)
  ),
  contact_pick AS (
    SELECT a.*, 2 AS slot_group
    FROM available a
    WHERE a.contact_id IS NOT NULL
      AND a.id NOT IN (SELECT id FROM photo_pick)
    ORDER BY RANDOM()
    LIMIT GREATEST(1, (p_count / 10)::INTEGER)
  ),
  remaining AS (
    SELECT a.*, 3 AS slot_group,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(a.category, 'uncategorized') ORDER BY RANDOM()) AS cat_rank
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM photo_pick)
      AND a.id NOT IN (SELECT id FROM contact_pick)
  ),
  fill_picks AS (
    SELECT * FROM remaining
    -- LOOSENED: allow up to v_cat_cap rows per category (was cat_rank = 1).
    WHERE cat_rank <= v_cat_cap
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - (SELECT COUNT(*) FROM photo_pick) - (SELECT COUNT(*) FROM contact_pick))
  ),
  combined AS (
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM photo_pick
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM contact_pick
    UNION ALL
    SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
           photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
           compare_memory_id, missing_field, status, priority, created_at,
           shown_at, answered_at, skipped_at, expires_at, cooldown_until,
           response_type, response_text, response_audio_url, response_data,
           result_memory_id, result_knowledge_id, source, personalization_context,
           metadata, updated_at, slot_group
    FROM fill_picks
  )
  SELECT id, user_id, type, category, life_chapter, prompt_text, prompt_template_id,
         photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
         compare_memory_id, missing_field, status, priority, created_at,
         shown_at, answered_at, skipped_at, expires_at, cooldown_until,
         response_type, response_text, response_audio_url, response_data,
         result_memory_id, result_knowledge_id, source, personalization_context,
         metadata, updated_at
  FROM combined
  ORDER BY RANDOM();

  UPDATE engagement_prompts
  SET shown_at = NOW()
  WHERE id IN (
    SELECT ep.id FROM engagement_prompts ep
    WHERE ep.user_id = p_user_id
      AND ep.status = 'pending'
      AND ep.shown_at < NOW() - INTERVAL '1 minute'
    LIMIT p_count
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION shuffle_engagement_prompts IS
  'Returns a shuffled batch of engagement prompts. Fill pool respects category diversity via a proportional cat_rank cap (was hard-capped at 1 per category). Cooldown shrunk to 6 hours.';
