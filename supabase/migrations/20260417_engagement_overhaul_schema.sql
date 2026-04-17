-- Migration: Progressive engagement prompt system schema
-- Part of PR 1: Schema + Seed Library for journalist-style prompt overhaul

-- =============================================================
-- 1. Add columns to engagement_prompts
-- =============================================================

ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS tier INT DEFAULT 0;
ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS angle TEXT;
ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS anti_repeat_group TEXT;
ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS snowball_hooks TEXT[] DEFAULT '{}';
ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS parent_prompt_id UUID REFERENCES engagement_prompts(id);
ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT false;

-- =============================================================
-- 2. Add columns to profiles
-- =============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompt_tier INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompts_answered_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompt_themes TEXT[] DEFAULT '{}';

-- =============================================================
-- 3. Create prompt_seed_library table
-- =============================================================

CREATE TABLE IF NOT EXISTS prompt_seed_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier INT NOT NULL,
  text TEXT NOT NULL,
  anchor TEXT,
  placeholders TEXT[] DEFAULT '{}',
  category TEXT,
  angle TEXT NOT NULL,
  requires TEXT[] DEFAULT '{}',
  anti_repeat_group TEXT,
  snowball_hooks TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_seed_tier ON prompt_seed_library (tier, is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_seed_anchor ON prompt_seed_library (anchor) WHERE anchor IS NOT NULL;

ALTER TABLE prompt_seed_library ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to read the seed library
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'prompt_seed_public_read' AND tablename = 'prompt_seed_library'
  ) THEN
    CREATE POLICY prompt_seed_public_read ON prompt_seed_library FOR SELECT USING (true);
  END IF;
END
$$;

-- =============================================================
-- 4. Notify PostgREST to reload schema cache
-- =============================================================

NOTIFY pgrst, 'reload schema';
