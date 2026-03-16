-- Add audio_url and tags columns to memories table
-- These are needed for engagement prompts to create voice memories

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for tag search
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN (tags);

COMMENT ON COLUMN memories.audio_url IS 'Voice recording URL from engagement prompts';
COMMENT ON COLUMN memories.tags IS 'User-defined tags (wisdom, photo story, etc.)';
