-- Migration: Fix admin_users RLS infinite recursion
-- Description: The "Super admins can manage all admin records" policy references
--              admin_users within its own USING clause, causing infinite recursion.
-- Date: 2026-03-02

-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can manage all admin records" ON admin_users;

-- Recreate with a non-recursive approach using a security definer function
-- This function runs with elevated privileges and doesn't trigger RLS
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  );
$$;

-- Recreate the policy using the function
CREATE POLICY "Super admins can manage all admin records" ON admin_users
  FOR ALL USING (is_super_admin());

-- Also create a general is_admin helper for other policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
$$;

COMMENT ON FUNCTION is_super_admin() IS 'Check if current user is a super admin (security definer to avoid RLS recursion)';
COMMENT ON FUNCTION is_admin() IS 'Check if current user is any active admin (security definer to avoid RLS recursion)';
