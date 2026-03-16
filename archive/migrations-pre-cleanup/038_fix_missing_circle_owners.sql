-- ============================================================================
-- Migration: Fix Missing Circle Owners
-- Created: 2026-02-23
-- Description: Ensure all circles have their creator as owner member,
--              and fix RLS policy to allow API-driven owner creation
-- ============================================================================

-- Fix any existing circles without owner membership
INSERT INTO circle_members (circle_id, user_id, role, invited_by, invite_status, joined_at, created_at)
SELECT 
  c.id, 
  c.created_by, 
  'owner'::circle_member_role, 
  c.created_by, 
  'accepted'::circle_invite_status, 
  c.created_at,
  c.created_at
FROM circles c
WHERE c.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM circle_members cm 
    WHERE cm.circle_id = c.id 
    AND cm.user_id = c.created_by
  )
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- Update RLS policy to allow circle creators to add themselves as owner
DROP POLICY IF EXISTS "Users can add members or accept invites" ON circle_members;

CREATE POLICY "Users can manage circle membership" ON circle_members
  FOR INSERT WITH CHECK (
    -- Circle creator can add themselves as owner
    (
      auth.uid() = user_id 
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM circles c 
        WHERE c.id = circle_members.circle_id 
        AND c.created_by = auth.uid()
      )
    )
    OR
    -- Admins can invite others
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.invite_status = 'accepted'
    )
    OR
    -- Users can accept their own pending invites (for future use)
    (
      auth.uid() = user_id 
      AND invite_status = 'pending'
    )
  );

-- Verify the trigger still exists (backup mechanism)
DROP TRIGGER IF EXISTS create_circle_owner_trigger ON circles;
DROP FUNCTION IF EXISTS create_circle_owner_membership();

CREATE OR REPLACE FUNCTION create_circle_owner_membership()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert owner membership for circle creator
  -- Use ON CONFLICT in case API already created it
  INSERT INTO circle_members (
    circle_id,
    user_id,
    role,
    invited_by,
    invite_status,
    joined_at
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'owner',
    NEW.created_by,
    'accepted',
    NOW()
  )
  ON CONFLICT (circle_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_circle_owner_trigger
  AFTER INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION create_circle_owner_membership();
