-- ============================================================================
-- Scrub AI-slop punctuation from pending engagement_prompts.prompt_text
--
-- Problem: Haiku sometimes emits em-dashes, en-dashes, curly quotes, and
-- horizontal ellipsis despite being told not to. Those characters persist in
-- the queue until the user answers/skips them, so the fix applied to the
-- generator doesn't retroactively clean rows already materialized.
--
-- This migration runs once over every pending row and normalises to ASCII:
--   —  (U+2014 em-dash)           -> ", "
--   –  (U+2013 en-dash)           -> "-"
--   …  (U+2026 horizontal ellipsis) -> "..."
--   “ ” (U+201C/U+201D curly dbl)  -> "\""
--   ‘ ’ (U+2018/U+2019 curly sgl)  -> "'"
--   -- (double-hyphen)             -> ", "
--
-- The seed-library hints separator `\n---\n` is preserved via a sentinel swap
-- so the triple-hyphen isn't caught by the "--" regex.
--
-- Idempotent: re-running is a no-op because the final text has none of the
-- scrubbed characters left.
-- ============================================================================

UPDATE engagement_prompts
SET prompt_text = REPLACE(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    -- Step 1: swap hints separator out
                    REPLACE(prompt_text, E'\n---\n', '__HINTS_SENT__'),
                    -- Step 2: en-dash
                    E'–', '-'
                  ),
                  -- Step 3: ellipsis
                  E'…', '...'
                ),
                -- Step 4: curly quotes
                E'“', '"'
              ),
              E'”', '"'
            ),
            E'‘', ''''
          ),
          E'’', ''''
        ),
        -- Step 5: em-dash with flanking whitespace -> ", "
        E'\\s*—\\s*', ', ', 'g'
      ),
      -- Step 6: double-hyphen with flanking whitespace -> ", "
      E'\\s*--+\\s*', ', ', 'g'
    ),
    -- Step 7: collapse ", ,"
    ',\\s*,', ',', 'g'
  ),
  -- Step 8: restore hints separator
  '__HINTS_SENT__', E'\n---\n'
)
WHERE status = 'pending'
  AND (
    prompt_text LIKE '%' || E'—' || '%'
    OR prompt_text LIKE '%' || E'–' || '%'
    OR prompt_text LIKE '%' || E'…' || '%'
    OR prompt_text LIKE '%' || E'“' || '%'
    OR prompt_text LIKE '%' || E'”' || '%'
    OR prompt_text LIKE '%' || E'‘' || '%'
    OR prompt_text LIKE '%' || E'’' || '%'
    OR prompt_text ~ E'[^-]--[^-]'
  );
