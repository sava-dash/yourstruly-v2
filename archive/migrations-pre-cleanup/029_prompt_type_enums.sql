-- ============================================================================
-- Migration: Add new prompt type enum values
-- Created: 2026-02-22
-- Description: Add new enum values for prompt types
-- NOTE: Run this FIRST, then run 030_expanded_prompt_templates.sql
-- ============================================================================

-- Add new prompt type enum values (safe to run multiple times)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'postscript' AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'postscript';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'favorites_firsts' AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'favorites_firsts';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'recipes_wisdom' AND enumtypid = 'prompt_type'::regtype) THEN
    ALTER TYPE prompt_type ADD VALUE 'recipes_wisdom';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

COMMENT ON TYPE prompt_type IS 'Added postscript, favorites_firsts, recipes_wisdom types';
