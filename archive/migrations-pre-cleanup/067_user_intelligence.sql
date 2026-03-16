-- ============================================================================
-- Migration: User Intelligence System
-- Created: 2026-03-04
-- Description: Stores computed personality profiles for RAG and digital twin
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- AI-computed personality profile
  personality_summary TEXT,           -- 2-3 paragraph "who this person is"
  communication_style JSONB,          -- {formality, verbosity, emotional_tone, vocabulary_level}
  core_values TEXT[],                 -- Top 5-7 values extracted from content
  
  -- Topic interests with scores (0-1)
  topic_interests JSONB,              -- {cooking: 0.8, travel: 0.6, family: 0.95}
  expertise_areas TEXT[],             -- Things they clearly know a lot about
  
  -- Relationship graph
  important_people JSONB,             -- [{name, aliases[], relationship, importance_score, mention_count}]
  
  -- Life context
  life_chapters JSONB,                -- [{era, year_range, summary, key_events[]}]
  key_life_events TEXT[],             -- Major milestones mentioned
  
  -- Voice/communication profile for digital twin
  common_phrases TEXT[],              -- Phrases they use often
  storytelling_style TEXT,            -- How they tell stories
  humor_style TEXT,                   -- Type of humor if any
  
  -- Embeddings
  profile_embedding vector(1536),     -- Full personality embedding
  
  -- Refresh tracking
  last_computed_at TIMESTAMPTZ,
  content_hash TEXT,                  -- Hash of source content to detect changes
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_intelligence_user ON user_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_updated ON user_intelligence(last_computed_at);

-- RLS
ALTER TABLE user_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intelligence" ON user_intelligence 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own intelligence" ON user_intelligence 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intelligence" ON user_intelligence 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS user_intelligence_updated_at ON user_intelligence;
CREATE TRIGGER user_intelligence_updated_at
  BEFORE UPDATE ON user_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE user_intelligence IS 'AI-computed personality profiles for RAG context and digital twin features';
