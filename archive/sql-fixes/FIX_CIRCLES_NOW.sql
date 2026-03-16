-- ============================================================
-- RUN THIS IN SUPABASE DASHBOARD -> SQL EDITOR
-- Fixes circle membership RLS policies
-- ============================================================

-- 1. Drop all existing circle_members policies
DROP POLICY IF EXISTS "Users can add members or accept invites" ON circle_members;
DROP POLICY IF EXISTS "Users can manage circle membership" ON circle_members;
DROP POLICY IF EXISTS "Admins can add members" ON circle_members;
DROP POLICY IF EXISTS "Members can view circle members" ON circle_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON circle_members;

-- 2. Enable RLS if not already
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive SELECT policy
CREATE POLICY "Anyone can view circle memberships" ON circle_members
  FOR SELECT USING (true);

-- 4. Create INSERT policy that allows:
--    - Circle creators to add themselves as owner
--    - Existing admins to add new members
CREATE POLICY "Circle creators and admins can add members" ON circle_members
  FOR INSERT WITH CHECK (
    -- Circle creator adding themselves (check circles table)
    EXISTS (
      SELECT 1 FROM circles c 
      WHERE c.id = circle_id 
      AND c.created_by = auth.uid()
      AND auth.uid() = user_id
    )
    OR
    -- Existing admin adding others
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.invite_status = 'accepted'
    )
  );

-- 5. Create UPDATE policy
CREATE POLICY "Members can update own membership" ON circle_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- 6. Create DELETE policy
CREATE POLICY "Admins can remove members" ON circle_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- 7. Fix any existing orphaned circles
INSERT INTO circle_members (circle_id, user_id, role, invited_by, invite_status, joined_at)
SELECT c.id, c.created_by, 'owner', c.created_by, 'accepted', c.created_at
FROM circles c
WHERE NOT EXISTS (
  SELECT 1 FROM circle_members cm 
  WHERE cm.circle_id = c.id AND cm.user_id = c.created_by
)
ON CONFLICT (circle_id, user_id) DO UPDATE SET
  role = 'owner',
  invite_status = 'accepted';

-- 8. Add DELETE policy for circles table
DROP POLICY IF EXISTS "Owners can delete circles" ON circles;

CREATE POLICY "Owners can delete circles" ON circles
  FOR DELETE USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circles.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'owner'
    )
  );

-- Done! Try creating and deleting circles now.
