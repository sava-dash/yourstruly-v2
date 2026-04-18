-- ============================================================================
-- Fix: shuffle_engagement_prompts was returning 0 rows after the volume
-- unlock migration.
--
-- Bug: the UPDATE at the end of the previous rewrite was marking arbitrary
-- pending rows as shown (not the rows that were actually returned), so on
-- the very next call the 6h cooldown excluded them and the feed went empty.
--
-- Fix:
--   1. Rewrite to collect the returned ID array via a temp scratch table
--      so the UPDATE marks exactly the rows we just returned.
--   2. As a one-time rescue, reset shown_at on all pending rows older than
--      10 minutes so the feed recovers immediately instead of waiting 6h.
-- ============================================================================

-- One-time rescue: anything marked shown in the last 6h that hasn't actually
-- been answered gets its shown_at cleared so the feed has cards to display.
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
  v_recently_shown TEXT[];
  v_cat_cap INTEGER;
  v_gen_batch INTEGER;
  v_selected_ids UUID[];
BEGIN
  -- Per-category cap in the fill pool (proportional to request).
  v_cat_cap := GREATEST(3, (p_count / 5)::INTEGER);

  -- Generation top-up batch.
  v_gen_batch := GREATEST(60, p_count * 2);

  -- Recently shown cooldown — 6h window.
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

  IF v_pending_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, v_gen_batch);
  END IF;

  -- === Select the rows, capturing their IDs === --
  -- Uses a single CTE chain to build the selection deterministically,
  -- then materializes the result as an array so the subsequent UPDATE
  -- marks exactly the rows we're about to return.
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
  SELECT ARRAY_AGG(id) INTO v_selected_ids
  FROM combined;

  -- Mark the actually-returned rows as shown.
  IF v_selected_ids IS NOT NULL AND array_length(v_selected_ids, 1) > 0 THEN
    UPDATE engagement_prompts
    SET shown_at = NOW()
    WHERE id = ANY(v_selected_ids);
  END IF;

  -- Return the rows in random order.
  RETURN QUERY
  SELECT *
  FROM engagement_prompts
  WHERE id = ANY(v_selected_ids)
  ORDER BY RANDOM();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION shuffle_engagement_prompts IS
  'Returns a shuffled batch of engagement prompts. Collects selected IDs via CTE into an array, then updates shown_at and returns in one pass. Proportional cat_cap preserves diversity while honoring p_count.';
