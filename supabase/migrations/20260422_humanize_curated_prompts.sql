-- ============================================================================
-- Humanize the 11 remaining AI-word hits in curated prompts
--
-- A full audit of the 500 seed_library rows + 750 chapter-prompt rows
-- against the humanizer style guide turned up 11 cases where the curated
-- text used AI-flavored words (meaningful/profound/pivotal) as fillers.
-- Everything else was clean: zero em-dashes, zero curly quotes, zero
-- multi-part questions, zero length issues.
--
-- This migration hand-rewrites those 11 phrases into natural equivalents
-- across all three surfaces: prompt_seed_library (source of truth),
-- prompt_templates (bridged mirror), and pending engagement_prompts
-- (materialized user rows). Each rewrite is a simple REPLACE so re-running
-- is safe (old text is gone after the first run).
-- ============================================================================

-- Tiny helper: a (old, new) list replayed across every table that holds
-- user-facing prompt text. Applying each pair to each table keeps the
-- migration auditable.
DO $$
DECLARE
  r RECORD;
  rewrites TEXT[][] := ARRAY[
    -- seed_library / prompt_templates / engagement_prompts
    ['Vulnerability is part of meaningful work.',            'Vulnerability is part of any work worth doing.'],
    ['Buying something meaningful with your own money',      'Buying something you saved up for'],
    ['Not the most expensive, the most meaningful.',         'Not the most expensive, the one you would miss most.'],
    ['What trip turned out more meaningful than expected?',  'What trip turned out more memorable than expected?'],
    ['What''s the most meaningful thing you''ve inherited?', 'What''s the thing you inherited that you treasure most?'],
    ['Simple, profound, or accidentally brilliant',          'Simple, sharp, or accidentally brilliant'],
    ['Not profound, just perfectly right',                   'Not clever, just perfectly right'],
    ['Some pivotal moments nearly miss us.',                 'Some turning points nearly miss us.'],
    ['Which workday felt the most meaningful?',              'Which workday stayed with you?'],
    ['What was the last meaningful conversation you had with a friend?', 'What was the last real conversation you had with a friend?'],
    ['Which anniversary felt most meaningful?',              'Which anniversary stands out to you?']
  ];
  pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY rewrites LOOP
    UPDATE prompt_seed_library
    SET text = REPLACE(text, pair[1], pair[2])
    WHERE text LIKE '%' || pair[1] || '%';

    UPDATE prompt_templates
    SET prompt_text = REPLACE(prompt_text, pair[1], pair[2])
    WHERE prompt_text LIKE '%' || pair[1] || '%';

    UPDATE engagement_prompts
    SET prompt_text = REPLACE(prompt_text, pair[1], pair[2])
    WHERE status = 'pending'
      AND prompt_text LIKE '%' || pair[1] || '%';
  END LOOP;
END $$;
