-- ============================================================================
-- Migration: Family Knowledge Sharing Policy
-- Created: 2026-02-20
-- Description: Add RLS policy for family viewing knowledge (requires 019)
-- ============================================================================

-- Family members can view knowledge entries (for Digital Twin)
-- Requires: contacts.shared_with_user_id and contacts.can_view_knowledge from 019
CREATE POLICY "Family can view shared knowledge"
  ON knowledge_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.user_id = knowledge_entries.user_id
        AND c.shared_with_user_id = auth.uid()
        AND c.can_view_knowledge = TRUE
    )
  );
