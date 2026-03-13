-- ============================================================================
-- URGENT: RLS Security Fix
-- Run this in Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/ffgetlejrwhpwvwtviqm/sql/new
-- ============================================================================

-- Re-enable RLS on all critical tables
ALTER TABLE engagement_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE postscripts ENABLE ROW LEVEL SECURITY;

-- Fix engagement_prompts policies (add WITH CHECK to UPDATE)
DROP POLICY IF EXISTS "Users can update own prompts" ON engagement_prompts;
CREATE POLICY "Users can update own prompts"
  ON engagement_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix knowledge_entries policies
DROP POLICY IF EXISTS "Users can update own knowledge" ON knowledge_entries;
CREATE POLICY "Users can update own knowledge"
  ON knowledge_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix memories policies (if missing)
DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON memories;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix memory_media policies
DROP POLICY IF EXISTS "Users can view own media" ON memory_media;
DROP POLICY IF EXISTS "Users can update own media" ON memory_media;
DROP POLICY IF EXISTS "Users can insert own media" ON memory_media;

CREATE POLICY "Users can view own media"
  ON memory_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON memory_media FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON memory_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix contacts policies
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix postscripts policies
DROP POLICY IF EXISTS "Users can view own postscripts" ON postscripts;
DROP POLICY IF EXISTS "Users can update own postscripts" ON postscripts;
DROP POLICY IF EXISTS "Users can insert own postscripts" ON postscripts;

CREATE POLICY "Users can view own postscripts"
  ON postscripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own postscripts"
  ON postscripts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own postscripts"
  ON postscripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

SELECT 'RLS policies fixed! Test the app now.' as status;
