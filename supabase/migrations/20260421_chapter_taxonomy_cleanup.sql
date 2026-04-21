-- ============================================================================
-- Chapter taxonomy cleanup
--
-- Problem: the chapter filter on /dashboard was showing a mix of cards
-- because (a) seed_library prompts were inserted without category or
-- life_chapter, and (b) the category→life_chapter mapping dumped every
-- thematic tag (music, food, humor, nostalgia, keepsakes...) into
-- `life_moments`, which was supposed to be reserved for milestones / big
-- events. Selecting "Life Moments" therefore returned random everyday
-- prompts, and the other chapters were undersized because their natural
-- tags were already claimed by `life_moments`.
--
-- Fix:
--   1. Introduce a new `everyday_life` catch-all chapter for thematic
--      tags (tastes, feelings, little things). Defined in JS via
--      src/app/(dashboard)/dashboard/constants.ts.
--   2. Rewrite map_category_to_life_chapter so only big-event categories
--      land in `life_moments`; everything ambient/thematic goes to
--      `everyday_life`.
--   3. Backfill existing seed_library prompts with category (pulled from
--      prompt_seed_library via anti_repeat_group) and recompute
--      life_chapter for every pending prompt.
-- ============================================================================

-- A 3-arg overload (p_category, p_type, p_prompt_text) was applied to
-- some environments via archived/sql-fixes scripts. Drop every known
-- overload before recreating the canonical (TEXT, TEXT) signature so
-- downstream references stay unambiguous.
DROP FUNCTION IF EXISTS map_category_to_life_chapter(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS map_category_to_life_chapter(TEXT, TEXT);

CREATE OR REPLACE FUNCTION map_category_to_life_chapter(p_category TEXT, p_type TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Knowledge prompts are always wisdom_legacy regardless of category.
  IF p_type = 'knowledge' THEN
    RETURN 'wisdom_legacy';
  END IF;

  RETURN CASE
    -- ── childhood ────────────────────────────────────────────────
    WHEN p_category IN ('childhood', 'early_life')                  THEN 'childhood'
    WHEN p_category ILIKE '%child%'                                  THEN 'childhood'

    -- ── teenage ──────────────────────────────────────────────────
    WHEN p_category IN ('teenage', 'growing_up')                    THEN 'teenage'
    WHEN p_category ILIKE '%teen%'                                   THEN 'teenage'

    -- ── high school ──────────────────────────────────────────────
    WHEN p_category IN ('high_school', 'school')                    THEN 'high_school'

    -- ── college ──────────────────────────────────────────────────
    WHEN p_category IN ('college', 'university', 'education')       THEN 'college'

    -- ── career ───────────────────────────────────────────────────
    WHEN p_category IN ('career', 'jobs_career', 'work')            THEN 'jobs_career'

    -- ── relationships ────────────────────────────────────────────
    WHEN p_category IN ('relationships', 'marriage', 'family',
                        'parenting', 'mentors', 'influence',
                        'support', 'friendship', 'lost_touch')      THEN 'relationships'

    -- ── travel ───────────────────────────────────────────────────
    WHEN p_category IN ('travel', 'places_lived', 'location',
                        'adventure')                                 THEN 'travel'

    -- ── spirituality ─────────────────────────────────────────────
    WHEN p_category IN ('spirituality', 'faith', 'religion')        THEN 'spirituality'

    -- ── wisdom & legacy ──────────────────────────────────────────
    WHEN p_category IN ('wisdom_legacy', 'wisdom', 'legacy',
                        'life_lessons', 'values', 'reflection',
                        'perspective', 'purpose', 'growth',
                        'resilience', 'courage', 'priorities')      THEN 'wisdom_legacy'

    -- ── life moments (big events only) ───────────────────────────
    WHEN p_category IN ('life_moments', 'milestones', 'celebration',
                        'firsts', 'turning_point', 'independence',
                        'decisions', 'endings', 'loss', 'regret')   THEN 'life_moments'

    -- ── everyday life catch-all (tastes, feelings, little things) ─
    ELSE 'everyday_life'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_category_to_life_chapter(TEXT, TEXT) IS
  'Routes a fine-grained prompt category onto a canonical life chapter. Thematic tags (music/food/humor/nostalgia/keepsakes/etc.) fall through to everyday_life; only substantive life events land in life_moments.';

-- ── Backfill existing seed_library prompts ───────────────────────
-- seed-first-session used to insert rows without category/life_chapter.
-- Pull the original category off prompt_seed_library via the preserved
-- anti_repeat_group when we can; otherwise the ELSE branch of the
-- mapping function sends them to `everyday_life`, which is the correct
-- catch-all for the universal/thematic seeds.
UPDATE engagement_prompts ep
SET category = psl.category
FROM prompt_seed_library psl
WHERE ep.source = 'seed_library'
  AND ep.category IS NULL
  AND ep.anti_repeat_group IS NOT NULL
  AND ep.anti_repeat_group = psl.anti_repeat_group;

-- Recompute life_chapter for every pending prompt so the tightened
-- taxonomy takes effect immediately, not just for new inserts.
UPDATE engagement_prompts
SET life_chapter = map_category_to_life_chapter(category, type::TEXT)
WHERE status = 'pending';
