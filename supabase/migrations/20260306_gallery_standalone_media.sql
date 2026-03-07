-- Allow memory_media to exist without a memory (standalone gallery items)
-- This supports onboarding photo uploads, imported photos, etc.
ALTER TABLE memory_media 
  ALTER COLUMN memory_id DROP NOT NULL;

-- Add source column to track where media came from
ALTER TABLE memory_media 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload';
-- source values: 'upload', 'onboarding', 'import', 'voice', 'video_frame'

-- Index for fast gallery queries
CREATE INDEX IF NOT EXISTS idx_memory_media_user_created 
  ON memory_media(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_media_source
  ON memory_media(user_id, source) WHERE source IS NOT NULL;

-- Add photo_id to engagement_prompts to link prompt directly to a photo
ALTER TABLE engagement_prompts
  ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES memory_media(id) ON DELETE SET NULL;
