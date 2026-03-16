-- ============================================================================
-- Migration: Fix Circles RLS Policies
-- Created: 2026-02-22
-- Description: Fix INSERT policy for circles table
-- ============================================================================

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Members can view their circles" ON circles;
DROP POLICY IF EXISTS "Users can create circles" ON circles;
DROP POLICY IF EXISTS "Admins can update circles" ON circles;

-- Recreate policies with proper conditions
-- SELECT: Users can view circles they created OR are members of
CREATE POLICY "Users can view their circles" ON circles
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.invite_status = 'accepted'
    )
  );

-- INSERT: Any authenticated user can create a circle (they become owner)
CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = created_by
  );

-- UPDATE: Only admins (owner/admin role) can update
CREATE POLICY "Admins can update circles" ON circles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.role IN ('owner', 'admin')
      AND circle_members.invite_status = 'accepted'
    )
  );

-- Also fix circle_members INSERT policy to allow the trigger to work
-- and allow users to accept their own invites
DROP POLICY IF EXISTS "Admins can add members" ON circle_members;

CREATE POLICY "Users can add members or accept invites" ON circle_members
  FOR INSERT WITH CHECK (
    -- User can insert their own owner record (via trigger)
    (auth.uid() = user_id AND auth.uid() = invited_by) OR
    -- Admins can invite others
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.invite_status = 'accepted'
    )
  );
