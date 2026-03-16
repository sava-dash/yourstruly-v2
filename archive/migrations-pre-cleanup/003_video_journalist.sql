-- Video Journalist Schema for YoursTruly V2
-- Async video interview system

-- ============================================
-- QUESTION BANK
-- ============================================
CREATE TABLE IF NOT EXISTS interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Question content
    question_text TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- life_story, childhood, career, relationships, wisdom, custom
    
    -- Suggested questions (null user_id = system questions)
    is_system BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTERVIEW SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Session info
    title TEXT,
    status TEXT DEFAULT 'pending', -- pending, sent, recording, completed, expired
    
    -- Access
    access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Delivery
    sent_via TEXT, -- sms, email, link
    sent_at TIMESTAMPTZ,
    phone_number TEXT,
    email_address TEXT,
    
    -- Tracking
    opened_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SESSION QUESTIONS (questions in a session)
-- ============================================
CREATE TABLE IF NOT EXISTS session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES interview_questions(id) ON DELETE SET NULL,
    
    -- Question (copied in case original deleted)
    question_text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    
    -- Response
    status TEXT DEFAULT 'pending', -- pending, skipped, answered
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIDEO RESPONSES
-- ============================================
CREATE TABLE IF NOT EXISTS video_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    session_question_id UUID REFERENCES session_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Video file
    video_url TEXT NOT NULL,
    video_key TEXT NOT NULL,
    duration INTEGER, -- seconds
    file_size INTEGER,
    thumbnail_url TEXT,
    
    -- Transcription
    transcript TEXT,
    transcript_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    transcript_language TEXT,
    
    -- AI Analysis
    ai_topics JSONB DEFAULT '[]',
    ai_summary TEXT,
    ai_sentiment TEXT,
    ai_keywords JSONB DEFAULT '[]',
    
    -- Recording metadata
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUGGESTED FOLLOW-UP QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS suggested_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_response_id UUID NOT NULL REFERENCES video_responses(id) ON DELETE CASCADE,
    
    question_text TEXT NOT NULL,
    relevance_score DECIMAL(3, 2),
    is_used BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSERT DEFAULT QUESTIONS
-- ============================================
INSERT INTO interview_questions (question_text, category, is_system, user_id) VALUES
-- Life Story
('What is your earliest childhood memory?', 'childhood', true, null),
('What was your favorite thing to do as a child?', 'childhood', true, null),
('Tell me about the house you grew up in.', 'childhood', true, null),
('What were your parents like when you were young?', 'childhood', true, null),
('What was school like for you?', 'childhood', true, null),

-- Career & Accomplishments  
('What was your first job?', 'career', true, null),
('What are you most proud of in your career?', 'career', true, null),
('What advice would you give someone starting in your field?', 'career', true, null),
('Tell me about a challenge you overcame at work.', 'career', true, null),

-- Relationships & Family
('How did you meet your spouse/partner?', 'relationships', true, null),
('What is your favorite family tradition?', 'relationships', true, null),
('What do you love most about your children?', 'relationships', true, null),
('Who has been the biggest influence in your life?', 'relationships', true, null),

-- Wisdom & Values
('What is the most important lesson life has taught you?', 'wisdom', true, null),
('What advice would you give your younger self?', 'wisdom', true, null),
('What do you hope people remember about you?', 'wisdom', true, null),
('What brings you the most joy in life?', 'wisdom', true, null),
('What are you grateful for?', 'wisdom', true, null),

-- Fun & Personal
('What is your favorite memory?', 'general', true, null),
('If you could relive one day, which would it be?', 'general', true, null),
('What is something most people don''t know about you?', 'general', true, null),
('What was the best trip you ever took?', 'general', true, null),
('What music or songs are meaningful to you?', 'general', true, null)

ON CONFLICT DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_interview_questions_user ON interview_questions(user_id);
CREATE INDEX idx_interview_questions_category ON interview_questions(category);

CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_contact ON interview_sessions(contact_id);
CREATE INDEX idx_interview_sessions_token ON interview_sessions(access_token);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);

CREATE INDEX idx_session_questions_session ON session_questions(session_id);

CREATE INDEX idx_video_responses_session ON video_responses(session_id);
CREATE INDEX idx_video_responses_contact ON video_responses(contact_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_followups ENABLE ROW LEVEL SECURITY;

-- Questions: users see their own + system questions
CREATE POLICY "Users can view own and system questions" ON interview_questions
    FOR SELECT USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "Users can manage own questions" ON interview_questions
    FOR ALL USING (user_id = auth.uid());

-- Sessions: users can manage their own
CREATE POLICY "Users can manage own sessions" ON interview_sessions
    FOR ALL USING (user_id = auth.uid());

-- Session questions: through session ownership
CREATE POLICY "Users can manage session questions" ON session_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Video responses: users can manage their own
CREATE POLICY "Users can manage own video responses" ON video_responses
    FOR ALL USING (user_id = auth.uid());

-- Suggested followups: through video response ownership
CREATE POLICY "Users can view suggested followups" ON suggested_followups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_responses 
            WHERE id = video_response_id AND user_id = auth.uid()
        )
    );
