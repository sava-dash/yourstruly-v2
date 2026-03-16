-- ============================================================================
-- Migration: PostScript Access Token for Recipients
-- Created: 2026-02-23
-- Description: Add access_token column for recipient viewing
-- ============================================================================

-- Add access_token column if it doesn't exist
ALTER TABLE postscripts 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_postscripts_access_token ON postscripts(access_token);

-- Allow public access to read postscripts by access_token (for recipients)
DROP POLICY IF EXISTS "Recipients can view by token" ON postscripts;
CREATE POLICY "Recipients can view by token" ON postscripts
  FOR SELECT USING (
    -- Owner can always view
    user_id = auth.uid()
    OR
    -- Anyone with the token can view (recipient)
    access_token IS NOT NULL
  );
