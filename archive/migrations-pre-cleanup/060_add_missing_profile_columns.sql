-- Migration 060: Ensure all profile columns exist for languages, education, emergency contacts
-- Run this in Supabase SQL Editor

-- Add education_level
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Add languages array
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';

-- Add emergency_contact_ids array
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_ids uuid[] DEFAULT '{}';

-- Add index for emergency contacts lookup
CREATE INDEX IF NOT EXISTS idx_profiles_emergency_contacts 
ON profiles USING gin(emergency_contact_ids);

-- Verify columns exist
DO $$
BEGIN
  RAISE NOTICE 'Profile columns check:';
  RAISE NOTICE '  education_level: %', (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'education_level');
  RAISE NOTICE '  languages: %', (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'languages');
  RAISE NOTICE '  emergency_contact_ids: %', (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'emergency_contact_ids');
END $$;
