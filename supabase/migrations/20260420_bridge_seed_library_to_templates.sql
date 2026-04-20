-- ============================================================================
-- Bridge: prompt_seed_library → prompt_templates
--
-- The 20260417_engagement_seed_library migration loaded a parallel table
-- (prompt_seed_library) with 500 hints-format prompts. But the live
-- generate_engagement_prompts RPC only reads from prompt_templates — never
-- touches the seed library. As a result every regenerated prompt uses
-- the OLD non-bullet text, so the new "question + thought-seeds" format
-- the dashboard renderer supports never actually appears for users.
--
-- This migration bridges the gap by:
--   1. De-duping prompt_seed_library (re-applies bloated it to 4x).
--   2. Mirroring each seed_library row into prompt_templates as an
--      active template with HIGH priority_boost (tier 0 = 50, tier 4 = 10)
--      so the shuffle RPC favors them over legacy entries.
--   3. Deactivating any pre-existing prompt_templates that lack the
--      hints separator, so they stop polluting new generations.
--   4. Refreshing every user's pending engagement_prompts queue —
--      the rows already created from old templates were locked in
--      with old text and won't change unless we wipe and regenerate.
--
-- Old templates stay in the table but inactive — easy to revive with
-- a one-line UPDATE if anything was depended on.
--
-- Idempotent: re-running is a no-op for the insert (NOT EXISTS dedupe)
-- and for the deactivate (already-inactive rows aren't re-touched).
-- ============================================================================

-- 1. De-dupe prompt_seed_library (keep the lowest id per distinct text).
DELETE FROM prompt_seed_library psl
WHERE EXISTS (
  SELECT 1 FROM prompt_seed_library older
  WHERE older.text = psl.text
    AND older.id < psl.id
);

-- 2. Mirror seed_library into prompt_templates as ACTIVE templates with
--    high priority_boost. Tier 0 (universal warm) = boost 50; tier 4
--    (deep, rare) = boost 10. The legacy templates use boosts in the
--    0-20 range, so tier 0 entries naturally dominate shuffle picks.
INSERT INTO prompt_templates (prompt_text, type, category, is_active, priority_boost)
SELECT
  psl.text,
  'memory_prompt',
  psl.category,
  TRUE,
  GREATEST(10, 50 - psl.tier * 10)
FROM prompt_seed_library psl
WHERE NOT EXISTS (
  SELECT 1 FROM prompt_templates pt
  WHERE pt.prompt_text = psl.text
);

-- 3. Deactivate every pre-existing template missing the hints separator.
--    Generate_engagement_prompts filters on is_active = TRUE, so these
--    will quietly stop appearing in new prompt rows. The rows themselves
--    persist in the table for audit / revival.
UPDATE prompt_templates
SET is_active = FALSE
WHERE is_active = TRUE
  AND prompt_text NOT LIKE '%---%';

-- 4. Wipe each user's still-PENDING engagement_prompts where the
--    prompt_text doesn't have the hints separator. Those rows were
--    materialized from the now-inactive old templates and would
--    otherwise outlast the rest of this migration. Skipped for
--    answered/skipped rows so user history isn't touched.
DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND COALESCE(prompt_text, '') NOT LIKE '%---%'
  AND COALESCE(source, '') IN ('template', 'system');

COMMENT ON TABLE prompt_seed_library IS
  'Tier-aware curated prompt library (500 entries) with hints-format text. Bridge-mirrored to prompt_templates so the live generate_engagement_prompts RPC surfaces them.';
