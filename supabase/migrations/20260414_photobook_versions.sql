-- ============================================================================
-- Migration: Photobook Cover Design + Version History
-- Created: 2026-04-14
-- Description:
--   1. Add `cover_design` JSONB column to photobook_projects so the cover
--      designer can persist front/spine/back choices alongside the project.
--   2. New `photobook_project_versions` table: user-triggered snapshots
--      (project metadata + pages) with RLS for owner-only SELECT/INSERT/DELETE
--      (no UPDATE — versions are immutable).
-- ============================================================================

-- 1. Cover design column -----------------------------------------------------
ALTER TABLE photobook_projects
  ADD COLUMN IF NOT EXISTS cover_design JSONB;

-- 2. Version history table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS photobook_project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES photobook_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Saved version',
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photobook_project_versions_project
  ON photobook_project_versions (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photobook_project_versions_user
  ON photobook_project_versions (user_id);

-- RLS ------------------------------------------------------------------------
ALTER TABLE photobook_project_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions: owner can select" ON photobook_project_versions;
CREATE POLICY "versions: owner can select"
  ON photobook_project_versions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "versions: owner can insert" ON photobook_project_versions;
CREATE POLICY "versions: owner can insert"
  ON photobook_project_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "versions: owner can delete" ON photobook_project_versions;
CREATE POLICY "versions: owner can delete"
  ON photobook_project_versions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- No UPDATE policy on purpose: snapshots are immutable by design.
