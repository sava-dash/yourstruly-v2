-- ============================================================================
-- PHOTOBOOKS STORAGE BUCKET
-- ============================================================================
-- Holds rendered 300 DPI print-ready page PNGs that Prodigi fetches at
-- print time. Public-read (Prodigi needs to pull without auth), but writes
-- are restricted to the authenticated owner's own {user_id}/... prefix.
--
-- Mirrors the 'memories' bucket pattern but with tighter per-user write RLS
-- and an explicit 50MB cap + image/* mime allowlist.
-- ============================================================================

-- Create the photobooks bucket (public read, 50MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photobooks',
  'photobooks',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- ----------------------------------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------------------------------

-- Authenticated users can upload only under their own {user_id}/... prefix.
DROP POLICY IF EXISTS "Users can upload own photobook assets" ON storage.objects;
CREATE POLICY "Users can upload own photobook assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photobooks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update only their own files.
DROP POLICY IF EXISTS "Users can update own photobook assets" ON storage.objects;
CREATE POLICY "Users can update own photobook assets" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'photobooks'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'photobooks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete only their own files.
DROP POLICY IF EXISTS "Users can delete own photobook assets" ON storage.objects;
CREATE POLICY "Users can delete own photobook assets" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'photobooks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read: Prodigi's asset fetcher has no auth token, so SELECT must be
-- available anonymously. Files live at stable public URLs.
DROP POLICY IF EXISTS "Public photobook asset access" ON storage.objects;
CREATE POLICY "Public photobook asset access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'photobooks');
