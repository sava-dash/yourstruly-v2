-- ============================================================================
-- shuffle_engagement_prompts: honor p_life_chapter
--
-- Before: p_life_chapter was accepted as a parameter but ignored in the CTE.
-- When a user selected "childhood" from the right panel, the shuffle still
-- ran the diversity slotting and might only return 3 childhood rows.
--
-- Now: when p_life_chapter is set, the function filters the `available`
-- pool to rows whose category OR life_chapter matches, AND skips the
-- cat_cap / photo_pick / contact_pick slotting entirely. It just returns
-- up to p_count prompts from that chapter, randomly ordered.
--
-- Filter-mode returns still honor the cooldown/fallback logic so users
-- don't get trapped in an empty-state loop when they filter.
-- ============================================================================

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
  v_chapter TEXT;
BEGIN
  v_cat_cap := GREATEST(3, (p_count / 5)::INTEGER);
  v_gen_batch := GREATEST(60, p_count * 2);
  v_chapter := NULLIF(TRIM(COALESCE(p_life_chapter, '')), '');

  -- Recently shown (6h window) — still applies so we don't repeat
  SELECT ARRAY_AGG(prompt_text) INTO v_recently_shown
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND shown_at > NOW() - INTERVAL '6 hours';

  -- Pool size after cooldown dedup (respecting the chapter filter when set)
  SELECT COUNT(*) INTO v_fresh_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown))
    AND (
      v_chapter IS NULL
      OR category = v_chapter
      OR life_chapter = v_chapter
    );

  -- Total pending (ignoring recency, still respecting chapter filter)
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (
      v_chapter IS NULL
      OR category = v_chapter
      OR life_chapter = v_chapter
    );

  -- Top up the pool if we're running low OR caller asked to regenerate
  IF v_fresh_count < p_count * 2 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, v_gen_batch);
    -- Re-measure after generation
    SELECT COUNT(*) INTO v_fresh_count
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND (v_recently_shown IS NULL OR prompt_text != ALL(v_recently_shown))
      AND (
        v_chapter IS NULL
        OR category = v_chapter
        OR life_chapter = v_chapter
      );
    SELECT COUNT(*) INTO v_pending_count
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND (
        v_chapter IS NULL
        OR category = v_chapter
        OR life_chapter = v_chapter
      );
  END IF;

  -- Graceful degradation: drop recency filter if the fresh pool is empty
  IF v_fresh_count = 0 AND v_pending_count > 0 THEN
    v_used_fallback := TRUE;
    v_recently_shown := NULL;
  END IF;

  -- ── FILTERED BRANCH ─────────────────────────────────────────────
  -- When a chapter is selected, return EVERYTHING available in that
  -- chapter (up to p_count) without the diversity slotting. The user
  -- asked to drill into this chapter specifically — give them the
  -- full depth of the pool.
  IF v_chapter IS NOT NULL THEN
    WITH available AS (
      SELECT ep.id
      FROM engagement_prompts ep
      WHERE ep.user_id = p_user_id
        AND ep.status = 'pending'
        AND (ep.cooldown_until IS NULL OR ep.cooldown_until < NOW())
        AND (v_recently_shown IS NULL OR ep.prompt_text != ALL(v_recently_shown))
        AND (ep.category = v_chapter OR ep.life_chapter = v_chapter)
      ORDER BY RANDOM()
      LIMIT p_count
    )
    SELECT ARRAY_AGG(id) INTO v_selected_ids FROM available;

  ELSE
    -- ── UNFILTERED BRANCH ──────────────────────────────────────────
    -- Default behaviour: diversity slotting with proportional cat_cap
    -- so a normal shuffle surfaces variety across every chapter.
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
  END IF;

  -- Mark rows as shown only on the normal (non-fallback) path
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
  'Returns a shuffled batch of engagement prompts. When p_life_chapter is set, returns the full depth of that chapter (up to p_count). When NULL, applies diversity slotting across all chapters.';
