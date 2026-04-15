-- ============================================================================
-- Migration: Photobook User Themes (F4 — "Save as my theme")
-- Created: 2026-04-14
-- Description:
--   New `photobook_user_themes` table that lets users persist a snapshot of
--   their current photobook design (page sequence, layouts, backgrounds,
--   cover_design, product_options) as a reusable theme. RLS is owner-only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS photobook_user_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photobook_user_themes_user
  ON photobook_user_themes (user_id, created_at DESC);

ALTER TABLE photobook_user_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_themes: owner can select" ON photobook_user_themes;
CREATE POLICY "user_themes: owner can select"
  ON photobook_user_themes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_themes: owner can insert" ON photobook_user_themes;
CREATE POLICY "user_themes: owner can insert"
  ON photobook_user_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_themes: owner can update" ON photobook_user_themes;
CREATE POLICY "user_themes: owner can update"
  ON photobook_user_themes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_themes: owner can delete" ON photobook_user_themes;
CREATE POLICY "user_themes: owner can delete"
  ON photobook_user_themes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
