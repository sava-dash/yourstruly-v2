-- ============================================================================
-- Restore chapter-specific prompt_templates deactivated by the bridge sweep
--
-- 20260410_seed_chapter_prompts.sql inserted 750 hand-written templates (50
-- per life chapter across 15 chapters: childhood, teenage, high_school,
-- college, jobs_career, relationships, travel, spirituality, wisdom_legacy,
-- life_moments, family, marriage, hobbies, firsts, life_lessons). They all
-- land with life_chapter populated.
--
-- 20260420_bridge_seed_library_to_templates.sql then ran an unconditional
-- deactivate on every template whose prompt_text lacked the `---` hints
-- separator. That filter was intended to silence legacy templates but
-- incidentally killed the entire chapter-specific set, leaving most life
-- chapters with zero active prompts. The dashboard chapter filter therefore
-- fell through to AI generation (once per mount) and then the legacy
-- shuffle RPC, surfacing only the sparse seed_library rows that happened to
-- map into that chapter via map_category_to_life_chapter. For high_school,
-- college, teenage, spirituality, and jobs_career that was effectively zero,
-- which is why scrolling to the end of the column reloaded the same tiny
-- handful of cards.
--
-- Fix: re-activate every template row that carries a life_chapter tag.
-- These are the explicitly authored chapter prompts. Legacy untagged
-- templates stay deactivated — the bridge's broader intent is preserved.
--
-- Idempotent: re-running is a no-op because the UPDATE filter only matches
-- currently-inactive rows.
-- ============================================================================

UPDATE prompt_templates
SET is_active = TRUE
WHERE is_active = FALSE
  AND life_chapter IS NOT NULL
  AND life_chapter <> '';

COMMENT ON TABLE prompt_templates IS
  'Hand-curated engagement prompts. 750+ chapter-tagged questions (50/chapter x 15 chapters from 20260410) restored in 20260422 after an over-broad bridge sweep deactivated them. Legacy untagged templates remain inactive.';
