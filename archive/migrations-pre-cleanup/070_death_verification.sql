-- Migration: Death Verification System
-- Description: Tables and policies for death claim verification with manual admin review
-- Date: 2026-02-26

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE death_verification_status AS ENUM ('pending', 'approved', 'rejected', 'needs_more_info');
CREATE TYPE claimant_relationship AS ENUM ('spouse', 'child', 'sibling', 'parent', 'executor', 'other');
CREATE TYPE death_document_type AS ENUM ('death_certificate', 'obituary_link', 'both');

-- =============================================================================
-- DEATH VERIFICATIONS TABLE
-- =============================================================================
CREATE TABLE death_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- The deceased user's account
  claimed_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Claimant information
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  claimant_phone TEXT,
  claimant_relationship claimant_relationship NOT NULL,
  claimant_relationship_other TEXT, -- If relationship is 'other', specify
  
  -- Deceased information (as provided by claimant)
  deceased_name TEXT NOT NULL,
  deceased_dob DATE,
  deceased_date_of_death DATE NOT NULL,
  
  -- Documentation
  document_type death_document_type NOT NULL,
  document_url TEXT, -- Uploaded death certificate in storage
  obituary_url TEXT, -- External obituary link if provided
  
  -- AI Processing
  ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
  ai_extraction_data JSONB DEFAULT '{}',
  ai_processed_at TIMESTAMPTZ,
  
  -- Verification Status
  status death_verification_status NOT NULL DEFAULT 'pending',
  
  -- Admin Review
  reviewer_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- On Approval
  transfer_access_to_claimant BOOLEAN DEFAULT false,
  memorial_conversion_completed BOOLEAN DEFAULT false,
  
  -- Rate limiting / abuse prevention
  submission_ip TEXT,
  submission_user_agent TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_death_verifications_status ON death_verifications(status);
CREATE INDEX idx_death_verifications_created ON death_verifications(created_at DESC);
CREATE INDEX idx_death_verifications_claimed_user ON death_verifications(claimed_user_id);
CREATE INDEX idx_death_verifications_claimant_email ON death_verifications(claimant_email);
CREATE INDEX idx_death_verifications_reviewer ON death_verifications(reviewer_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE death_verifications ENABLE ROW LEVEL SECURITY;

-- Admin users can read all verifications
CREATE POLICY "Admin users can read death verifications"
  ON death_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admin users can update verifications (for review)
CREATE POLICY "Admin users can update death verifications"
  ON death_verifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Public can insert (for claim submission) - controlled via API
-- No direct insert policy for end users; API handles this with admin client

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_death_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER death_verifications_updated_at
  BEFORE UPDATE ON death_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_death_verifications_updated_at();

-- =============================================================================
-- ADD ACCOUNT STATUS TO PROFILES (if not exists)
-- =============================================================================
DO $$
BEGIN
  -- Add account_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_status TEXT DEFAULT 'active' 
      CHECK (account_status IN ('active', 'memorial', 'suspended', 'deleted'));
  END IF;
  
  -- Add memorial_since column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'memorial_since'
  ) THEN
    ALTER TABLE profiles ADD COLUMN memorial_since TIMESTAMPTZ;
  END IF;
  
  -- Add memorial_manager_id (claimant who manages the memorial)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'memorial_manager_email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN memorial_manager_email TEXT;
  END IF;
END $$;

-- =============================================================================
-- STORAGE BUCKET FOR VERIFICATION DOCUMENTS
-- =============================================================================
-- Note: Run this in Supabase Dashboard or via setup-storage.sql
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'verification-documents',
--   'verification-documents',
--   false,
--   10485760, -- 10MB limit
--   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HELPER VIEW FOR ADMIN DASHBOARD
-- =============================================================================
CREATE OR REPLACE VIEW v_death_verifications_admin AS
SELECT 
  dv.*,
  p.full_name AS profile_full_name,
  p.date_of_birth AS profile_dob,
  p.avatar_url AS profile_avatar,
  p.email AS profile_email,
  p.account_status AS profile_current_status,
  reviewer.email AS reviewer_email
FROM death_verifications dv
LEFT JOIN profiles p ON dv.claimed_user_id = p.id
LEFT JOIN profiles reviewer ON dv.reviewer_id = reviewer.id;

-- Grant access to the view
GRANT SELECT ON v_death_verifications_admin TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE death_verifications IS 'Death verification claims submitted for manual admin review';
COMMENT ON COLUMN death_verifications.ai_confidence_score IS 'AI-calculated confidence score (0-100) based on document extraction vs profile data match';
COMMENT ON COLUMN death_verifications.ai_extraction_data IS 'Extracted data from death certificate using Document AI/Gemini Vision';
COMMENT ON COLUMN death_verifications.transfer_access_to_claimant IS 'Whether to grant the claimant access to manage the memorial account';
