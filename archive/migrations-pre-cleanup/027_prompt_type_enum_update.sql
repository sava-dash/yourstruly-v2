-- ============================================================================
-- Migration: Update prompt_type enum with missing values
-- Created: 2026-02-21
-- Description: Add missing prompt_type enum values for new engagement types
-- ============================================================================

-- Add missing enum values to prompt_type
-- Note: PostgreSQL allows adding values to existing enums, but not removing them

-- Add 'postscript' value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'postscript' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'prompt_type')
    ) THEN
        ALTER TYPE prompt_type ADD VALUE 'postscript';
    END IF;
END $$;

-- Add 'favorites_firsts' value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'favorites_firsts' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'prompt_type')
    ) THEN
        ALTER TYPE prompt_type ADD VALUE 'favorites_firsts';
    END IF;
END $$;

-- Add 'recipes_wisdom' value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'recipes_wisdom' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'prompt_type')
    ) THEN
        ALTER TYPE prompt_type ADD VALUE 'recipes_wisdom';
    END IF;
END $$;

-- ============================================================================
-- Verification (for manual checking)
-- ============================================================================
/*
-- Check all enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'prompt_type')
ORDER BY enumsortorder;

-- Expected output:
-- photo_backstory
-- tag_person
-- missing_info
-- memory_prompt
-- knowledge
-- connect_dots
-- highlight
-- quick_question
-- postscript
-- favorites_firsts
-- recipes_wisdom
*/

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TYPE prompt_type IS 'Types of engagement prompts including photo_backstory, tag_person, missing_info, memory_prompt, knowledge, connect_dots, highlight, quick_question, postscript, favorites_firsts, and recipes_wisdom';
