-- ============================================================================
-- Migration: Engagement Prompts System
-- Created: 2026-02-20
-- Description: Tables for the micro-interaction bubble system
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Prompt types
CREATE TYPE prompt_type AS ENUM (
  'photo_backstory',
  'tag_person',
  'missing_info',
  'memory_prompt',
  'knowledge',
  'connect_dots',
  'highlight',
  'quick_question'
);

-- Prompt status
CREATE TYPE prompt_status AS ENUM (
  'pending',
  'shown',
  'answered',
  'skipped',
  'dismissed'
);

-- Response types
CREATE TYPE response_type AS ENUM (
  'voice',
  'text',
  'selection',
  'photo',
  'date',
  'contact'
);

-- Knowledge categories
CREATE TYPE knowledge_category AS ENUM (
  'life_lessons',
  'values',
  'relationships',
  'parenting',
  'career',
  'health',
  'practical',
  'legacy',
  'faith',
  'interests',
  'skills',
  'hobbies',
  'goals'
);

-- ============================================================================
-- ENGAGEMENT PROMPTS TABLE
-- ============================================================================

CREATE TABLE engagement_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Prompt definition
  type prompt_type NOT NULL,
  category TEXT, -- Sub-category or knowledge_category
  prompt_text TEXT NOT NULL,
  prompt_template_id TEXT, -- Reference to template used
  
  -- Related entities (nullable based on type)
  photo_id UUID REFERENCES memory_media(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  
  -- For connect_dots type - second entity to compare
  compare_photo_id UUID REFERENCES memory_media(id) ON DELETE SET NULL,
  compare_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  compare_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  
  -- For missing_info type
  missing_field TEXT, -- 'birth_date', 'relationship_type', 'email', etc.
  
  -- State
  status prompt_status DEFAULT 'pending',
  priority INTEGER DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Don't show again until this date (for skipped prompts)
  cooldown_until TIMESTAMPTZ,
  
  -- Response
  response_type response_type,
  response_text TEXT,
  response_audio_url TEXT,
  response_data JSONB, -- Flexible storage for different response types
  
  -- What was created/updated from this response
  result_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  result_knowledge_id UUID, -- Will reference knowledge_entries
  
  -- Metadata
  source TEXT DEFAULT 'system', -- 'system', 'ai_generated', 'scheduled', 'profile_based'
  personalization_context JSONB, -- { interest: 'golf', skill: 'leadership', religion: 'hindu' }
  metadata JSONB,
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prompts_user_status ON engagement_prompts(user_id, status);
CREATE INDEX idx_prompts_user_pending ON engagement_prompts(user_id, status, priority DESC) 
  WHERE status = 'pending';
CREATE INDEX idx_prompts_type ON engagement_prompts(user_id, type);
CREATE INDEX idx_prompts_photo ON engagement_prompts(photo_id) WHERE photo_id IS NOT NULL;
CREATE INDEX idx_prompts_contact ON engagement_prompts(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_prompts_memory ON engagement_prompts(memory_id) WHERE memory_id IS NOT NULL;
CREATE INDEX idx_prompts_created ON engagement_prompts(user_id, created_at DESC);
CREATE INDEX idx_prompts_cooldown ON engagement_prompts(user_id, cooldown_until) 
  WHERE cooldown_until IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_engagement_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_prompts_updated_at
  BEFORE UPDATE ON engagement_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_prompts_updated_at();

-- ============================================================================
-- KNOWLEDGE ENTRIES TABLE
-- ============================================================================

CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  category knowledge_category NOT NULL,
  subcategory TEXT, -- More specific: 'cooking_recipes', 'golf_lessons', etc.
  prompt_text TEXT NOT NULL, -- The question that was asked
  
  -- Response content
  response_text TEXT, -- Transcribed or written response
  audio_url TEXT, -- Original voice recording URL
  video_url TEXT, -- If answered via video
  
  -- Personalization context
  related_interest TEXT, -- 'cooking', 'golf', etc.
  related_skill TEXT,
  related_hobby TEXT,
  related_religion TEXT,
  
  -- Metadata
  word_count INTEGER,
  duration_seconds INTEGER, -- For audio/video
  language TEXT DEFAULT 'en',
  
  -- For Digital Twin RAG
  embedding VECTOR(1536), -- OpenAI embedding for semantic search
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  
  -- Quality & featuring
  is_featured BOOLEAN DEFAULT FALSE,
  quality_score FLOAT, -- AI-assessed quality (0-1)
  
  -- Linking to other content
  related_contacts UUID[], -- Contacts mentioned in response
  related_memories UUID[], -- Memories referenced
  tags TEXT[],
  
  -- Source tracking
  source_prompt_id UUID REFERENCES engagement_prompts(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key back to engagement_prompts
ALTER TABLE engagement_prompts 
  ADD CONSTRAINT fk_result_knowledge 
  FOREIGN KEY (result_knowledge_id) 
  REFERENCES knowledge_entries(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_knowledge_user ON knowledge_entries(user_id);
CREATE INDEX idx_knowledge_category ON knowledge_entries(user_id, category);
CREATE INDEX idx_knowledge_featured ON knowledge_entries(user_id, is_featured) 
  WHERE is_featured = TRUE;
CREATE INDEX idx_knowledge_interest ON knowledge_entries(user_id, related_interest) 
  WHERE related_interest IS NOT NULL;
CREATE INDEX idx_knowledge_created ON knowledge_entries(user_id, created_at DESC);

-- Vector similarity search index (requires pgvector extension)
-- CREATE INDEX idx_knowledge_embedding ON knowledge_entries 
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Note: Uncomment above after enabling pgvector and having enough rows

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_knowledge_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-calculate word count
  IF NEW.response_text IS NOT NULL THEN
    NEW.word_count = array_length(regexp_split_to_array(trim(NEW.response_text), '\s+'), 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_entries_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_entries_updated_at();

-- Also calculate word count on insert
CREATE TRIGGER knowledge_entries_word_count
  BEFORE INSERT ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_entries_updated_at();

-- ============================================================================
-- PROMPT TEMPLATES TABLE
-- ============================================================================

CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY, -- e.g., 'memory_cooking_001', 'knowledge_faith_hindu_001'
  
  -- Classification
  type prompt_type NOT NULL,
  category TEXT, -- knowledge_category or other grouping
  subcategory TEXT,
  
  -- Template content
  prompt_text TEXT NOT NULL,
  prompt_variations TEXT[], -- Alternative phrasings
  
  -- Targeting
  target_interest TEXT, -- Only show if user has this interest
  target_skill TEXT,
  target_hobby TEXT,
  target_religion TEXT,
  target_personality TEXT,
  
  -- For missing_info type
  target_field TEXT, -- Which field this asks about
  
  -- Behavior
  is_active BOOLEAN DEFAULT TRUE,
  priority_boost INTEGER DEFAULT 0, -- Add to base priority
  cooldown_days INTEGER DEFAULT 30, -- Days before reshowing after skip
  
  -- Seasonal/time-based
  seasonal_months INTEGER[], -- [11, 12] for Nov-Dec holiday prompts
  anniversary_based BOOLEAN DEFAULT FALSE, -- Show on memory anniversaries
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_type ON prompt_templates(type, is_active);
CREATE INDEX idx_templates_interest ON prompt_templates(target_interest) 
  WHERE target_interest IS NOT NULL;
CREATE INDEX idx_templates_religion ON prompt_templates(target_religion) 
  WHERE target_religion IS NOT NULL;

-- ============================================================================
-- USER ENGAGEMENT STATS TABLE
-- ============================================================================

CREATE TABLE engagement_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Counts
  total_prompts_shown INTEGER DEFAULT 0,
  total_prompts_answered INTEGER DEFAULT 0,
  total_prompts_skipped INTEGER DEFAULT 0,
  total_knowledge_entries INTEGER DEFAULT 0,
  
  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_engagement_date DATE,
  
  -- Preferences (learned)
  preferred_input_type response_type, -- voice or text
  avg_response_length INTEGER,
  most_engaged_category TEXT,
  
  -- By type counts
  photo_backstory_count INTEGER DEFAULT 0,
  tag_person_count INTEGER DEFAULT 0,
  missing_info_count INTEGER DEFAULT 0,
  memory_prompt_count INTEGER DEFAULT 0,
  knowledge_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE engagement_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_stats ENABLE ROW LEVEL SECURITY;

-- Policies for engagement_prompts
CREATE POLICY "Users can view own prompts"
  ON engagement_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON engagement_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert prompts"
  ON engagement_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON engagement_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for knowledge_entries
CREATE POLICY "Users can view own knowledge"
  ON knowledge_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge"
  ON knowledge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge"
  ON knowledge_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge"
  ON knowledge_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Family members can view knowledge (for Digital Twin)
-- NOTE: This policy requires contacts.shared_with_user_id from migration 019
-- Run this after 019_contacts_extension.sql:
/*
CREATE POLICY "Family can view shared knowledge"
  ON knowledge_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.user_id = knowledge_entries.user_id
        AND c.shared_with_user_id = auth.uid()
        AND c.can_view_knowledge = TRUE
    )
  );
*/

-- Policies for prompt_templates (read-only for users)
CREATE POLICY "Anyone can view active templates"
  ON prompt_templates FOR SELECT
  USING (is_active = TRUE);

-- Policies for engagement_stats
CREATE POLICY "Users can view own stats"
  ON engagement_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON engagement_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats"
  ON engagement_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get personalized prompts for a user
CREATE OR REPLACE FUNCTION get_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 5
)
RETURNS SETOF engagement_prompts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY priority DESC, created_at DESC
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark prompt as answered and update stats
CREATE OR REPLACE FUNCTION answer_prompt(
  p_prompt_id UUID,
  p_response_type response_type,
  p_response_text TEXT DEFAULT NULL,
  p_response_audio_url TEXT DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL
)
RETURNS engagement_prompts AS $$
DECLARE
  v_prompt engagement_prompts;
  v_user_id UUID;
BEGIN
  -- Update the prompt
  UPDATE engagement_prompts
  SET 
    status = 'answered',
    answered_at = NOW(),
    response_type = p_response_type,
    response_text = p_response_text,
    response_audio_url = p_response_audio_url,
    response_data = p_response_data
  WHERE id = p_prompt_id
  RETURNING * INTO v_prompt;
  
  v_user_id := v_prompt.user_id;
  
  -- Update engagement stats
  INSERT INTO engagement_stats (user_id, total_prompts_answered, last_engagement_date)
  VALUES (v_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_prompts_answered = engagement_stats.total_prompts_answered + 1,
    last_engagement_date = CURRENT_DATE,
    current_streak_days = CASE 
      WHEN engagement_stats.last_engagement_date = CURRENT_DATE - INTERVAL '1 day' 
      THEN engagement_stats.current_streak_days + 1
      WHEN engagement_stats.last_engagement_date = CURRENT_DATE
      THEN engagement_stats.current_streak_days
      ELSE 1
    END,
    longest_streak_days = GREATEST(
      engagement_stats.longest_streak_days,
      CASE 
        WHEN engagement_stats.last_engagement_date = CURRENT_DATE - INTERVAL '1 day' 
        THEN engagement_stats.current_streak_days + 1
        ELSE 1
      END
    ),
    updated_at = NOW();
  
  -- Update type-specific count
  EXECUTE format(
    'UPDATE engagement_stats SET %I = %I + 1 WHERE user_id = $1',
    v_prompt.type || '_count',
    v_prompt.type || '_count'
  ) USING v_user_id;
  
  RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to skip a prompt with cooldown
CREATE OR REPLACE FUNCTION skip_prompt(
  p_prompt_id UUID,
  p_cooldown_days INTEGER DEFAULT 7
)
RETURNS engagement_prompts AS $$
DECLARE
  v_prompt engagement_prompts;
BEGIN
  UPDATE engagement_prompts
  SET 
    status = 'skipped',
    skipped_at = NOW(),
    cooldown_until = NOW() + (p_cooldown_days || ' days')::INTERVAL
  WHERE id = p_prompt_id
  RETURNING * INTO v_prompt;
  
  -- Update stats
  UPDATE engagement_stats
  SET 
    total_prompts_skipped = total_prompts_skipped + 1,
    updated_at = NOW()
  WHERE user_id = v_prompt.user_id;
  
  RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss a prompt permanently
CREATE OR REPLACE FUNCTION dismiss_prompt(p_prompt_id UUID)
RETURNS engagement_prompts AS $$
DECLARE
  v_prompt engagement_prompts;
BEGIN
  UPDATE engagement_prompts
  SET status = 'dismissed'
  WHERE id = p_prompt_id
  RETURNING * INTO v_prompt;
  
  RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE engagement_prompts IS 'Micro-interaction prompts shown as floating bubbles on dashboard';
COMMENT ON TABLE knowledge_entries IS 'Captured wisdom, advice, and life lessons for Digital Twin';
COMMENT ON TABLE prompt_templates IS 'Template library for generating personalized prompts';
COMMENT ON TABLE engagement_stats IS 'User engagement statistics and streaks';

COMMENT ON COLUMN engagement_prompts.priority IS 'Priority score 1-100, higher = shown first';
COMMENT ON COLUMN engagement_prompts.cooldown_until IS 'Do not show again until this timestamp (for skipped prompts)';
COMMENT ON COLUMN knowledge_entries.embedding IS 'Vector embedding for semantic search (RAG)';
COMMENT ON COLUMN knowledge_entries.quality_score IS 'AI-assessed response quality 0-1';
