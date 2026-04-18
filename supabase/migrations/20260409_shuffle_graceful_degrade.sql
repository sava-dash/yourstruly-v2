-- ============================================================================
-- Shuffle graceful degradation
--
-- Problem observed after the previous two migrations:
--   After a single shuffle call the function marked up to 100 rows as
--   shown. On the very next page load (within the 6-hour cooldown) the
--   "recently_shown" filter excluded every pending row and the feed went
--   empty again. Generation topping up doesn't help when ON CONFLICT
--   DO NOTHING blocks re-inserting templates that already have a
--   pending row.
--
-- Fix:
--   1. One-time rescue — clear shown_at on every pending, unanswered
--      prompt so the user can see cards immediately.
--   2. Rewrite shuffle_engagement_prompts so it falls back gracefully:
--      if the recency-filtered pool is empty, retry WITHOUT the
--      recently_shown filter before returning nothing.
--   3. Don't mark rows as "shown" when we had to fall back — that
--      would just deepen the lockout for the next call.
-- ============================================================================

-- One-time rescue
UPDATE engagement_prompts
SET shown_at = NULL
WHERE status = 'pending'
  AND shown_at IS NOT NULL
  AND answered_at IS NULL;


CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5,
  p_regenerate BOOLEAN DEFAULT FALSE,
  p_life_chapter TEXT DEFAULT NULL
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_fresh_count INTEGER;
  v_recently_shown TEXT[];
  v_cat_cap INTEGER;
  v_gen_batch INTEGER;
  v_selected_ids UUID[];
  v_used_fallback BOOLEAN := FALSE;
BEGIN
  v_cat_cap := GREATEST(3, (p_count / 5)::INTEGER);
  v_gen_batch := GREATEST(60, p_count * 2);

  -- Recently shown (6h window)
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '6 hours';

  -- Pool size after cooldown dedup
  SELECT COUNT(*) INTO v_fresh_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));

  -- Total pending (ignoring recency)
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW());

  -- Top up the pool if we're running low OR caller asked to regenerate
  IF v_fresh_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, v_gen_batch);
    -- Re-measure both counts after generation
    SELECT COUNT(*) INTO v_fresh_count
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown));
    SELECT COUNT(*) INTO v_pending_count
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW());
  END IF;

  -- Graceful degradation: if the fresh pool is empty but we do have
  -- pending rows, drop the recently_shown filter for this call so the
  -- user still sees cards. Don't bump shown_at in that branch.
  IF v_fresh_count = 0 AND v_pending_count > 0 THEN
    v_used_fallback := TRUE;
    v_recently_shown := NULL;
  END IF;

  -- Select the IDs we'll return
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
    SELECT a.id
    FROM available a
    WHERE a.photo_id IS NOT NULL
      AND a.type IN ('photo_backstory'::prompt_type, 'tag_person'::prompt_type)
    ORDER BY RANDOM()
    LIMIT GREATEST(1, (p_count / 10)::INTEGER)
  ),
  contact_pick AS (
    SELECT a.id
    FROM available a
    WHERE a.contact_id IS NOT NULL
      AND a.id NOT IN (SELECT id FROM photo_pick)
    ORDER BY RANDOM()
    LIMIT GREATEST(1, (p_count / 10)::INTEGER)
  ),
  remaining AS (
    SELECT a.id,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(a.category, 'uncategorized') ORDER BY RANDOM()) AS cat_rank
    FROM available a
    WHERE a.id NOT IN (SELECT id FROM photo_pick)
      AND a.id NOT IN (SELECT id FROM contact_pick)
  ),
  fill_picks AS (
    SELECT id FROM remaining
    WHERE cat_rank <= v_cat_cap
    ORDER BY RANDOM()
    LIMIT GREATEST(0, p_count - (SELECT COUNT(*) FROM photo_pick) - (SELECT COUNT(*) FROM contact_pick))
  ),
  combined AS (
    SELECT id FROM photo_pick
    UNION ALL
    SELECT id FROM contact_pick
    UNION ALL
    SELECT id FROM fill_picks
  )
  SELECT ARRAY_AGG(id) INTO v_selected_ids FROM combined;

  -- Mark rows as shown only on the normal path. During fallback we're
  -- intentionally returning "stale" rows and don't want to extend
  -- their cooldown window.
  IF NOT v_used_fallback
     AND v_selected_ids IS NOT NULL
     AND array_length(v_selected_ids, 1) > 0 THEN
    UPDATE engagement_prompts
    SET shown_at = NOW()
    WHERE id = ANY(v_selected_ids);
  END IF;

  RETURN QUERY
  SELECT *
  FROM engagement_prompts
  WHERE id = ANY(v_selected_ids)
  ORDER BY RANDOM();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION shuffle_engagement_prompts IS
  'Returns a shuffled batch of engagement prompts. Falls back to ignoring the 6h recently-shown cooldown when it would otherwise return zero rows, and skips marking shown_at on fallback returns so the feed never locks itself out.';
