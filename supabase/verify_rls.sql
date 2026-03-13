-- ============================================================================
-- RLS Verification and Fix Script
-- ============================================================================

-- Check which tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'engagement_prompts',
    'knowledge_entries', 
    'prompt_templates',
    'engagement_stats',
    'memories',
    'memory_media',
    'contacts',
    'profiles',
    'postscripts',
    'wisdom_entries'
  )
ORDER BY tablename;

-- Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- FIX: Ensure RLS is enabled on all critical tables
-- ============================================================================

-- Re-enable RLS on engagement tables
ALTER TABLE engagement_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_stats ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own prompts" ON engagement_prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON engagement_prompts;
DROP POLICY IF EXISTS "System can insert prompts" ON engagement_prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON engagement_prompts;

CREATE POLICY "Users can view own prompts"
  ON engagement_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON engagement_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert prompts"
  ON engagement_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON engagement_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Knowledge entries
DROP POLICY IF EXISTS "Users can view own knowledge" ON knowledge_entries;
DROP POLICY IF EXISTS "Users can insert own knowledge" ON knowledge_entries;
DROP POLICY IF EXISTS "Users can update own knowledge" ON knowledge_entries;
DROP POLICY IF EXISTS "Users can delete own knowledge" ON knowledge_entries;

CREATE POLICY "Users can view own knowledge"
  ON knowledge_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge"
  ON knowledge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge"
  ON knowledge_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge"
  ON knowledge_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Engagement stats
DROP POLICY IF EXISTS "Users can view own stats" ON engagement_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON engagement_stats;
DROP POLICY IF EXISTS "System can insert stats" ON engagement_stats;

CREATE POLICY "Users can view own stats"
  ON engagement_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON engagement_stats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert stats"
  ON engagement_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Check other critical tables
-- ============================================================================

-- Memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- Memory media
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own media" ON memory_media;
DROP POLICY IF EXISTS "Users can insert own media" ON memory_media;
DROP POLICY IF EXISTS "Users can update own media" ON memory_media;
DROP POLICY IF EXISTS "Users can delete own media" ON memory_media;

CREATE POLICY "Users can view own media"
  ON memory_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON memory_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON memory_media FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON memory_media FOR DELETE
  USING (auth.uid() = user_id);

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Postscripts
ALTER TABLE postscripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own postscripts" ON postscripts;
DROP POLICY IF EXISTS "Users can insert own postscripts" ON postscripts;
DROP POLICY IF EXISTS "Users can update own postscripts" ON postscripts;
DROP POLICY IF EXISTS "Users can delete own postscripts" ON postscripts;

CREATE POLICY "Users can view own postscripts"
  ON postscripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own postscripts"
  ON postscripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own postscripts"
  ON postscripts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own postscripts"
  ON postscripts FOR DELETE
  USING (auth.uid() = user_id);

-- Wisdom entries (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wisdom_entries') THEN
    EXECUTE 'ALTER TABLE wisdom_entries ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own wisdom" ON wisdom_entries';
    EXECUTE 'CREATE POLICY "Users can view own wisdom" ON wisdom_entries FOR SELECT USING (auth.uid() = user_id)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own wisdom" ON wisdom_entries';
    EXECUTE 'CREATE POLICY "Users can insert own wisdom" ON wisdom_entries FOR INSERT WITH CHECK (auth.uid() = user_id)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own wisdom" ON wisdom_entries';
    EXECUTE 'CREATE POLICY "Users can update own wisdom" ON wisdom_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own wisdom" ON wisdom_entries';
    EXECUTE 'CREATE POLICY "Users can delete own wisdom" ON wisdom_entries FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================================
-- Verification output
-- ============================================================================

SELECT 'RLS policies have been refreshed. Run the first two queries again to verify.' as status;
