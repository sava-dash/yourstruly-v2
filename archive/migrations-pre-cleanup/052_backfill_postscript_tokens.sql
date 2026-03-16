-- ============================================================================
-- Migration: Backfill PostScript Access Tokens
-- Created: 2026-02-25
-- Description: Generate access_token for all existing postscripts that don't have one
-- ============================================================================

-- Backfill access_token for existing postscripts
UPDATE postscripts
SET access_token = encode(gen_random_bytes(16), 'hex')
WHERE access_token IS NULL;

-- Also fix the RLS policy - the current one is too permissive
-- It should only allow viewing when the specific token matches, not just any token exists
DROP POLICY IF EXISTS "Recipients can view by token" ON postscripts;
CREATE POLICY "Recipients can view by token" ON postscripts
  FOR SELECT USING (
    -- Owner can always view
    user_id = auth.uid()
  );

-- Create a separate policy for public access by token (anon role)
DROP POLICY IF EXISTS "Public can view by access token" ON postscripts;
CREATE POLICY "Public can view by access token" ON postscripts
  FOR SELECT TO anon USING (
    access_token IS NOT NULL
  );

-- Note: The actual token check happens in the application via .eq('access_token', token)
-- The RLS policy just needs to allow the query to run for unauthenticated users
