-- ============================================================================
-- Purge pre-humanizer AI prompts from the pending queue
--
-- The generate-ai-prompts and follow-up-engine system prompts were rewritten
-- in 2026-04-22 to require short, open-ended questions with zero recitation
-- of prior stories. But rows created BEFORE that change are still in the
-- queue with status='pending', and with the shown_at-advance fix the feed
-- is now surfacing them one after another (e.g. "You mentioned it was a
-- joyous occasion when you got that bear for Jaya in Detroit...").
--
-- The scrub migration only normalises punctuation; it does not delete
-- long/story-reciting prompts. This migration does:
--   1. Delete every pending AI-sourced row (source in ai_generated /
--      ai_follow_up). The generator will naturally re-create a fresh batch
--      under the new rules the next time the pool runs low.
--   2. Delete pending rows whose prompt_text is longer than 260 chars AND
--      sourced from AI lanes. Curated seed_library / template rows are
--      never deleted by this migration.
--
-- Hand-curated seed_library and template rows are untouched.
--
-- Idempotent: re-running is a no-op once the offending rows are gone.
-- ============================================================================

DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND source IN ('ai_generated', 'ai_follow_up');

-- Belt-and-suspenders: any lingering pending row of unusual length that
-- was inserted by a non-AI source but still carries the old bloated style.
-- Threshold is generous so seed_library hints (~200 chars typical) aren't
-- caught. Anything over 260 chars is almost certainly an AI paragraph.
DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND LENGTH(prompt_text) > 260
  AND source NOT IN ('seed_library');

COMMENT ON COLUMN engagement_prompts.source IS
  'Origin of the prompt row. Known values: seed_library, template, system, ai_generated, ai_follow_up. 2026-04-22 purge cleared pre-humanizer ai_generated/ai_follow_up pending rows.';
