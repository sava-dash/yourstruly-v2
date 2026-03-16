-- Voice Clone Storage
-- Stores ElevenLabs voice IDs and consent info for AI Twin feature

CREATE TABLE IF NOT EXISTS voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Voice clone status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, failed
  
  -- ElevenLabs voice ID (stored after cloning)
  elevenlabs_voice_id VARCHAR(255),
  
  -- Voice quality info
  total_audio_duration_seconds INTEGER DEFAULT 0, -- Total voice samples submitted
  sample_count INTEGER DEFAULT 0,
  
  -- Privacy consent
  consent_given_at TIMESTAMPTZ,
  consent_ip VARCHAR(45),
  consent_user_agent TEXT,
  
  -- Metadata
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cloned_at TIMESTAMPTZ -- When voice was successfully cloned
);

-- Track which audio samples were used for cloning
CREATE TABLE IF NOT EXISTS voice_clone_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_clone_id UUID NOT NULL REFERENCES voice_clones(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_clones_user ON voice_clones(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_clones_status ON voice_clones(status);
CREATE INDEX IF NOT EXISTS idx_voice_clone_samples_clone ON voice_clone_samples(voice_clone_id);

-- RLS
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_clone_samples ENABLE ROW LEVEL SECURITY;

-- Users can only see their own voice clone
DROP POLICY IF EXISTS "Users can view own voice clone" ON voice_clones;
CREATE POLICY "Users can view own voice clone" ON voice_clones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own voice clone" ON voice_clones;
CREATE POLICY "Users can create own voice clone" ON voice_clones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own voice clone" ON voice_clones;
CREATE POLICY "Users can update own voice clone" ON voice_clones
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own samples" ON voice_clone_samples;
CREATE POLICY "Users can view own samples" ON voice_clone_samples
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM voice_clones vc WHERE vc.id = voice_clone_id AND vc.user_id = auth.uid())
  );

-- Updated_at trigger
DROP TRIGGER IF EXISTS voice_clones_updated_at ON voice_clones;
CREATE TRIGGER voice_clones_updated_at
  BEFORE UPDATE ON voice_clones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON voice_clones TO authenticated;
GRANT SELECT, INSERT ON voice_clone_samples TO authenticated;

-- Function to calculate user's total voice duration from memories
CREATE OR REPLACE FUNCTION get_user_voice_duration(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_duration INTEGER;
BEGIN
  -- Count memories with audio_url (each assumed ~30 seconds average)
  -- In production, store actual duration in memories table
  SELECT COALESCE(COUNT(*) * 30, 0) INTO total_duration
  FROM memories
  WHERE user_id = p_user_id
  AND audio_url IS NOT NULL;
  
  RETURN total_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
