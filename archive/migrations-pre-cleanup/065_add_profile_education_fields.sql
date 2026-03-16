-- Migration 065: Add missing education fields to profiles
-- These are for the "primary" or "current" education, while education_history stores the full list

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS degree TEXT;

COMMENT ON COLUMN profiles.school_name IS 'Primary/current school name for quick display';
COMMENT ON COLUMN profiles.degree IS 'Primary/current degree for quick display';
