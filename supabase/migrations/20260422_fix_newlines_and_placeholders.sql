-- ============================================================================
-- Rescue card prompts from two latent bugs
--
-- BUG A: literal backslash-n instead of newlines
--   20260417_engagement_seed_library.sql writes rows like
--     'question\n---\nhints...' (single-quoted, no E prefix). With
--   standard_conforming_strings=on (modern PG default) that string is stored
--   as the two ASCII characters \ n, not a newline. The dashboard renderer
--   splits on \n---\n expecting a real newline, so cards render the raw
--   backslash-n sequences mid-sentence. The bridge migration then copied
--   the broken text into prompt_templates and generate_engagement_prompts
--   materialized it into engagement_prompts.
--
-- BUG B: unresolved {person_name} / {place} / {interest} placeholders
--   20260420_bridge_seed_library_to_templates.sql mirrored every
--   prompt_seed_library row into prompt_templates, including anchored rows
--   whose text contains {token}. prompt_templates has no per-user
--   substitution path; only seed-first-session resolves placeholders. Those
--   template rows leaked into engagement_prompts as literal "{person_name}"
--   strings.
--
-- Fix (five safe steps):
--   A1. Rewrite literal \n to real newlines in prompt_seed_library.
--   A2. Rewrite literal \n to real newlines in prompt_templates.
--   B1. Deactivate prompt_templates rows carrying {token} placeholders.
--   B2. Delete pending engagement_prompts carrying {token} placeholders.
--   A3. Delete pending engagement_prompts whose post-fix text would collide
--       with an already-correct sibling (the idx_engagement_prompts_no_dupe
--       unique index blocks the UPDATE otherwise). Then rewrite literal
--       \n on the surviving rows.
--
-- Idempotent: each step's WHERE clause keys off the very thing the step
-- removes, so re-running is a no-op.
-- ============================================================================

-- ── A1 / A2: literal \n → real newline in curated tables ────────────────
UPDATE prompt_seed_library
SET text = REPLACE(text, E'\\n', E'\n')
WHERE POSITION(E'\\n' IN text) > 0;

UPDATE prompt_templates
SET prompt_text = REPLACE(prompt_text, E'\\n', E'\n')
WHERE POSITION(E'\\n' IN prompt_text) > 0;

-- ── B1: disable template rows that can never resolve ────────────────────
-- Any {lowercase_token} marker means this row belongs only in the
-- seed-first-session substitution path, not the generic generator.
UPDATE prompt_templates
SET is_active = FALSE
WHERE is_active = TRUE
  AND prompt_text ~ '\{[a-z_]+\}';

-- ── B2: drop placeholder-leaking pending prompts ────────────────────────
DELETE FROM engagement_prompts
WHERE status = 'pending'
  AND prompt_text ~ '\{[a-z_]+\}';

-- ── A3a: dedupe before we rewrite the remaining \n rows ─────────────────
-- The unique index on (user_id, prompt_text, photo_id, contact_id) means
-- a row with literal \n whose fixed twin already exists under real
-- newlines would break the UPDATE. Delete the bad twin first.
DELETE FROM engagement_prompts bad
WHERE bad.status = 'pending'
  AND POSITION(E'\\n' IN bad.prompt_text) > 0
  AND EXISTS (
    SELECT 1
    FROM engagement_prompts good
    WHERE good.user_id = bad.user_id
      AND good.prompt_text = REPLACE(bad.prompt_text, E'\\n', E'\n')
      AND COALESCE(good.photo_id::text, '') = COALESCE(bad.photo_id::text, '')
      AND COALESCE(good.contact_id::text, '') = COALESCE(bad.contact_id::text, '')
      AND good.id <> bad.id
  );

-- ── A3b: rewrite the surviving rows ─────────────────────────────────────
UPDATE engagement_prompts
SET prompt_text = REPLACE(prompt_text, E'\\n', E'\n')
WHERE status = 'pending'
  AND POSITION(E'\\n' IN prompt_text) > 0;

COMMENT ON TABLE prompt_seed_library IS
  'Curated prompt library (500+ entries) with hints-format text. Real newlines enforced 2026-04-22 after the original INSERTs lacked the E escape prefix.';
