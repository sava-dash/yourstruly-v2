-- Migration 057: Add emergency contact IDs to profiles
-- Emergency contacts can verify user's passing with death certificate/obituary

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS emergency_contact_ids uuid[] DEFAULT '{}';

-- Add index for lookup
CREATE INDEX IF NOT EXISTS idx_profiles_emergency_contacts 
ON profiles USING gin(emergency_contact_ids);

COMMENT ON COLUMN profiles.emergency_contact_ids IS 
  'Contact IDs who can verify user passing with death certificate or obituary';
