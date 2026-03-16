-- ============================================================================
-- Fix Contacts RLS Policies
-- Run in Supabase SQL Editor
-- ============================================================================

-- The contacts query is failing because RLS might be preventing the query
-- Let's ensure the policies are correct

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- Recreate with proper policies
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

-- ============================================================================
-- Fix memory_media to handle non-image files gracefully
-- ============================================================================

-- Add a column to track media type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memory_media' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE memory_media ADD COLUMN media_type TEXT;
  END IF;
END $$;

-- Update existing records to set media_type based on mime_type
UPDATE memory_media 
SET media_type = CASE
  WHEN mime_type LIKE 'image/%' THEN 'image'
  WHEN mime_type LIKE 'video/%' THEN 'video'
  WHEN mime_type LIKE 'audio/%' THEN 'audio'
  ELSE 'other'
END
WHERE media_type IS NULL;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  'Contacts RLS policies fixed!' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'contacts';
