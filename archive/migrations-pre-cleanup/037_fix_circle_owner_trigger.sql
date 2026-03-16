-- ============================================================================
-- Migration: Fix Circle Owner Membership Trigger
-- Created: 2026-02-22
-- Description: Ensure circle creator gets owner membership automatically
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_circle_owner_trigger ON circles;
DROP FUNCTION IF EXISTS create_circle_owner_membership();

-- Recreate function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_circle_owner_membership()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert owner membership for circle creator
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
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the circle creation
  RAISE WARNING 'Failed to create owner membership for circle %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER create_circle_owner_trigger
  AFTER INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION create_circle_owner_membership();

-- Also manually fix any existing circles without owner membership
INSERT INTO circle_members (circle_id, user_id, role, invited_by, invite_status, joined_at)
SELECT c.id, c.created_by, 'owner', c.created_by, 'accepted', c.created_at
FROM circles c
WHERE NOT EXISTS (
  SELECT 1 FROM circle_members cm 
  WHERE cm.circle_id = c.id AND cm.user_id = c.created_by
);
