-- Add video_url column to memories table for video responses from engagement cards
ALTER TABLE memories ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

COMMENT ON COLUMN memories.video_url IS 'URL of video recording attached to this memory (from engagement card video input)';
