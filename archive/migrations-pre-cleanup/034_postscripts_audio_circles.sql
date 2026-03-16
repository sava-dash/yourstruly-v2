-- ============================================================================
-- Migration: PostScripts Audio & Circle Support
-- Created: 2026-02-22
-- Description: Adds audio_url column for voice messages and circle_id for
--              sending PostScripts to entire circles
-- ============================================================================

-- Add audio_url column for voice messages
ALTER TABLE postscripts ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add circle_id for circle-targeted PostScripts
ALTER TABLE postscripts ADD COLUMN IF NOT EXISTS circle_id UUID REFERENCES circles(id) ON DELETE SET NULL;

-- Index for circle lookups
CREATE INDEX IF NOT EXISTS idx_postscripts_circle ON postscripts(circle_id) WHERE circle_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN postscripts.audio_url IS 'URL to voice message recording';
COMMENT ON COLUMN postscripts.circle_id IS 'If set, PostScript is for entire circle instead of individual contact';
