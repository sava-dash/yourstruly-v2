-- Migration: Add background column to profiles
-- Used in onboarding to capture why the user is here

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background TEXT;

COMMENT ON COLUMN profiles.background IS 'User-provided background/context about why they joined YoursTruly';
