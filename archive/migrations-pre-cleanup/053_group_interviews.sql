-- Group Interviews: Multiple contacts answer the same question(s)
-- Responses aggregated into shared "Story Time" view

-- Main group interview record
CREATE TABLE IF NOT EXISTS group_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- The question(s) to ask
  questions JSONB NOT NULL DEFAULT '[]', -- Array of {id, text, order}
  
  -- Settings
  allow_video BOOLEAN DEFAULT true,
  allow_audio BOOLEAN DEFAULT true,
  allow_text BOOLEAN DEFAULT true,
  deadline TIMESTAMPTZ, -- Optional deadline for responses
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  
  -- Generated content
  cover_image_url TEXT,
  generated_video_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants invited to a group interview
CREATE TABLE IF NOT EXISTS group_interview_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_interview_id UUID NOT NULL REFERENCES group_interviews(id) ON DELETE CASCADE,
  
  -- Who is this participant?
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Access
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'in_progress', 'completed', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Notification tracking
  last_reminder_at TIMESTAMPTZ,
  reminder_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(group_interview_id, contact_id)
);

-- Individual responses from participants
CREATE TABLE IF NOT EXISTS group_interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_interview_id UUID NOT NULL REFERENCES group_interviews(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES group_interview_participants(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- References questions JSONB array id
  
  -- Response content
  response_type TEXT NOT NULL CHECK (response_type IN ('text', 'audio', 'video')),
  response_text TEXT,
  media_url TEXT,
  media_duration_seconds INT,
  
  -- Transcription (for audio/video)
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Reactions from other family members
  reactions JSONB DEFAULT '{}', -- {user_id: emoji}
  
  -- AI analysis
  ai_summary TEXT,
  ai_sentiment TEXT,
  ai_themes TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(participant_id, question_id)
);

-- Reactions table for group interview responses
CREATE TABLE IF NOT EXISTS group_interview_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES group_interview_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(response_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_interviews_user ON group_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_group_interviews_status ON group_interviews(status);
CREATE INDEX IF NOT EXISTS idx_group_interview_participants_interview ON group_interview_participants(group_interview_id);
CREATE INDEX IF NOT EXISTS idx_group_interview_participants_token ON group_interview_participants(access_token);
CREATE INDEX IF NOT EXISTS idx_group_interview_participants_status ON group_interview_participants(status);
CREATE INDEX IF NOT EXISTS idx_group_interview_responses_interview ON group_interview_responses(group_interview_id);
CREATE INDEX IF NOT EXISTS idx_group_interview_responses_participant ON group_interview_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_group_interview_responses_question ON group_interview_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_group_interview_reactions_response ON group_interview_reactions(response_id);

-- RLS Policies
ALTER TABLE group_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_interview_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_interview_reactions ENABLE ROW LEVEL SECURITY;

-- Group interviews: owner can do everything
DROP POLICY IF EXISTS "Users can manage their group interviews" ON group_interviews;
CREATE POLICY "Users can manage their group interviews"
  ON group_interviews FOR ALL
  USING (auth.uid() = user_id);

-- Participants: owner can manage, public can view via token (handled in API)
DROP POLICY IF EXISTS "Users can manage their group interview participants" ON group_interview_participants;
CREATE POLICY "Users can manage their group interview participants"
  ON group_interview_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_interviews gi 
      WHERE gi.id = group_interview_id AND gi.user_id = auth.uid()
    )
  );

-- Responses: owner can view all, participants can manage their own (via API)
DROP POLICY IF EXISTS "Users can view responses to their group interviews" ON group_interview_responses;
CREATE POLICY "Users can view responses to their group interviews"
  ON group_interview_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_interviews gi 
      WHERE gi.id = group_interview_id AND gi.user_id = auth.uid()
    )
  );

-- Reactions: users can manage their own
DROP POLICY IF EXISTS "Users can manage their reactions" ON group_interview_reactions;
CREATE POLICY "Users can manage their reactions"
  ON group_interview_reactions FOR ALL
  USING (auth.uid() = user_id);

-- Function to update group interview stats
CREATE OR REPLACE FUNCTION update_group_interview_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the group interview's updated_at
  UPDATE group_interviews 
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.group_interview_id, OLD.group_interview_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_participant_change ON group_interview_participants;
CREATE TRIGGER on_participant_change
  AFTER INSERT OR UPDATE OR DELETE ON group_interview_participants
  FOR EACH ROW EXECUTE FUNCTION update_group_interview_stats();

DROP TRIGGER IF EXISTS on_response_change ON group_interview_responses;
CREATE TRIGGER on_response_change
  AFTER INSERT OR UPDATE OR DELETE ON group_interview_responses
  FOR EACH ROW EXECUTE FUNCTION update_group_interview_stats();

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_group_interviews_updated_at ON group_interviews;
CREATE TRIGGER update_group_interviews_updated_at
  BEFORE UPDATE ON group_interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_interview_responses_updated_at ON group_interview_responses;
CREATE TRIGGER update_group_interview_responses_updated_at
  BEFORE UPDATE ON group_interview_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
