-- PR C: Branching question sets for interviews
--
-- Adds a JSONB `branch_rules` column on session_questions. When a recipient
-- answers a question whose rules match (case-insensitive substring on
-- `if_answer_contains`), the next exchange uses the matched `then_ask`
-- string instead of an AI-generated follow-up. Empty / missing rules
-- behave exactly as today.
--
-- Shape:
--   [
--     { "if_answer_contains": ["yes","yeah","of course"],
--       "then_ask": "Tell me more about that — what made it special?" }
--   ]
--
-- No RLS changes — existing session policies cover this column.

ALTER TABLE session_questions
  ADD COLUMN IF NOT EXISTS branch_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN session_questions.branch_rules IS
  'Optional branching follow-ups: array of {if_answer_contains: string[], then_ask: string}. Evaluated by src/lib/interviews/branching.ts before the AI fallback.';
