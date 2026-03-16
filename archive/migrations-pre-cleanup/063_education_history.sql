-- Migration: Create education_history table for multiple schools support
-- Each user can have multiple education entries

CREATE TABLE IF NOT EXISTS education_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- School Info
  school_name TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  
  -- Dates
  start_year INTEGER,
  graduation_year INTEGER,
  is_current BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_education_history_user_id 
ON education_history(user_id);

-- Enable RLS
ALTER TABLE education_history ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own education history
CREATE POLICY "Users can view own education history" ON education_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own education history" ON education_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own education history" ON education_history
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own education history" ON education_history
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE education_history IS 'Multiple education entries per user (schools, degrees, etc.)';
