-- Interview Feature Redesign - Database Migration
-- YoursTruly V2 - Enhanced Interview System with Shared Memory Storage
-- Created: 2026-02-24

-- ============================================
-- EXTENDED INTERVIEW SESSIONS
-- ============================================

-- Add new columns to interview_sessions for enhanced tracking
ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS allow_followup_questions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true}'::jsonb,
ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_conversation_thread BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES interview_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_text_answers BOOLEAN DEFAULT false;

-- ============================================
-- CUSTOM USER QUESTIONS
-- ============================================

-- Add columns to interview_questions for custom question management
ALTER TABLE interview_questions
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prompt_variations TEXT[],
ADD COLUMN IF NOT EXISTS suggested_followups TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ============================================
-- INTERVIEW NOTIFICATIONS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS interview_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    session_question_id UUID REFERENCES session_questions(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL, -- 'email', 'sms', 'push'
    recipient_type TEXT NOT NULL, -- 'interviewee', 'interviewer'
    recipient_contact TEXT NOT NULL, -- email or phone number
    
    -- Content
    subject TEXT,
    message_body TEXT,
    action_url TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, opened
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Provider response
    provider_message_id TEXT,
    provider_response JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_interview_notifications_session ON interview_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_notifications_status ON interview_notifications(status);
CREATE INDEX IF NOT EXISTS idx_interview_notifications_type ON interview_notifications(notification_type);

-- ============================================
-- SHARED MEMORY STORAGE
-- ============================================

-- Link video responses to memories (shared between users)
CREATE TABLE IF NOT EXISTS memory_video_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The memory record (owned by interviewer)
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    
    -- The video response (from interviewee)
    video_response_id UUID NOT NULL REFERENCES video_responses(id) ON DELETE CASCADE,
    
    -- Both users connected to this memory
    interviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interviewee_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Permissions
    interviewee_can_view BOOLEAN DEFAULT true,
    interviewee_can_edit BOOLEAN DEFAULT false,
    
    -- Metadata
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(memory_id, video_response_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_memory_video_links_memory ON memory_video_links(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_video_links_video ON memory_video_links(video_response_id);
CREATE INDEX IF NOT EXISTS idx_memory_video_links_interviewer ON memory_video_links(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_memory_video_links_interviewee ON memory_video_links(interviewee_contact_id);

-- ============================================
-- INTERVIEW SESSION ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS interview_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL, -- 'question_added', 'question_answered', 'followup_sent', 'link_opened', 'recording_started', 'completed'
    session_question_id UUID REFERENCES session_questions(id) ON DELETE SET NULL,
    
    -- Actor
    actor_type TEXT NOT NULL, -- 'interviewer', 'interviewee', 'system'
    actor_id UUID, -- user_id or contact reference
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_activity_session ON interview_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_activity_type ON interview_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_interview_activity_created ON interview_activity_log(created_at DESC);

-- ============================================
-- VOICE ANSWER TRANSCRIPTS
-- ============================================

-- Enhance video_responses with voice-specific features
ALTER TABLE video_responses
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'video', -- 'video', 'voice', 'text'
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_key TEXT,
ADD COLUMN IF NOT EXISTS text_response TEXT,
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS voice_transcript_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS language_detected TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'; -- pending, processing, completed, failed

-- ============================================
-- INTERVIEW TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS interview_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Template details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'custom', -- family, friends, legacy, custom
    
    -- Questions in this template
    question_ids UUID[] DEFAULT '{}',
    
    -- Settings
    settings JSONB DEFAULT '{"allow_followups": true, "voice_enabled": true}'::jsonb,
    
    -- Usage
    is_system BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some default templates
INSERT INTO interview_templates (name, description, category, question_ids, is_system, settings) VALUES
('Life Story Starter', 'Essential questions to capture someone''s life journey', 'legacy', 
    ARRAY[
        (SELECT id FROM interview_questions WHERE question_text = 'What is your earliest childhood memory?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'What was your favorite thing to do as a child?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'What is the most important lesson life has taught you?' LIMIT 1)
    ],
    true,
    '{"allow_followups": true, "voice_enabled": true}'::jsonb
),
('Family Traditions', 'Questions about family traditions and relationships', 'family',
    ARRAY[
        (SELECT id FROM interview_questions WHERE question_text = 'What is your favorite family tradition?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'How did you meet your spouse/partner?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'What do you love most about your children?' LIMIT 1)
    ],
    true,
    '{"allow_followups": true, "voice_enabled": true}'::jsonb
),
('Wisdom & Values', 'Deep questions about beliefs and life lessons', 'legacy',
    ARRAY[
        (SELECT id FROM interview_questions WHERE question_text = 'What advice would you give your younger self?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'What do you hope people remember about you?' LIMIT 1),
        (SELECT id FROM interview_questions WHERE question_text = 'What brings you the most joy in life?' LIMIT 1)
    ],
    true,
    '{"allow_followups": true, "voice_enabled": true}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE interview_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_templates ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can view their own session notifications
DROP POLICY IF EXISTS "Users can view own interview notifications" ON interview_notifications;
CREATE POLICY "Users can view own interview notifications" ON interview_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Memory video links: Both interviewer and linked contact (via interviewer) can view
DROP POLICY IF EXISTS "Users can view own memory video links" ON memory_video_links;
CREATE POLICY "Users can view own memory video links" ON memory_video_links
    FOR ALL USING (interviewer_id = auth.uid());

-- Activity log: Users can view their own session activity
DROP POLICY IF EXISTS "Users can view own interview activity" ON interview_activity_log;
CREATE POLICY "Users can view own interview activity" ON interview_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Templates: Users can view system templates and their own
DROP POLICY IF EXISTS "Users can view templates" ON interview_templates;
CREATE POLICY "Users can view templates" ON interview_templates
    FOR SELECT USING (is_system = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own templates" ON interview_templates;
CREATE POLICY "Users can manage own templates" ON interview_templates
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create shared memory from video response
CREATE OR REPLACE FUNCTION create_shared_memory_from_response(
    p_video_response_id UUID,
    p_interviewer_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_contact_id UUID;
    v_question_text TEXT;
    v_video_url TEXT;
    v_transcript TEXT;
    v_ai_summary TEXT;
    v_memory_id UUID;
BEGIN
    -- Get video response details
    SELECT 
        vr.session_id,
        vs.contact_id,
        sq.question_text,
        vr.video_url,
        vr.transcript,
        vr.ai_summary
    INTO 
        v_session_id,
        v_contact_id,
        v_question_text,
        v_video_url,
        v_transcript,
        v_ai_summary
    FROM video_responses vr
    JOIN interview_sessions vs ON vs.id = vr.session_id
    JOIN session_questions sq ON sq.id = vr.session_question_id
    WHERE vr.id = p_video_response_id;

    -- Create a memory record
    INSERT INTO memories (
        user_id,
        title,
        description,
        memory_type,
        ai_summary
    ) VALUES (
        p_interviewer_id,
        'Interview Response: ' || v_question_text,
        COALESCE(v_transcript, v_ai_summary, 'Video response captured via interview'),
        'interview',
        v_ai_summary
    )
    RETURNING id INTO v_memory_id;

    -- Create memory media for the video
    INSERT INTO memory_media (
        memory_id,
        user_id,
        file_url,
        file_key,
        file_type,
        is_cover
    ) VALUES (
        v_memory_id,
        p_interviewer_id,
        v_video_url,
        'interview-' || p_video_response_id,
        'video',
        true
    );

    -- Create the shared link
    INSERT INTO memory_video_links (
        memory_id,
        video_response_id,
        interviewer_id,
        interviewee_contact_id,
        shared_by
    ) VALUES (
        v_memory_id,
        p_video_response_id,
        p_interviewer_id,
        v_contact_id,
        p_interviewer_id
    );

    RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log interview activity
CREATE OR REPLACE FUNCTION log_interview_activity(
    p_session_id UUID,
    p_activity_type TEXT,
    p_session_question_id UUID DEFAULT NULL,
    p_actor_type TEXT DEFAULT 'system',
    p_actor_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO interview_activity_log (
        session_id,
        activity_type,
        session_question_id,
        actor_type,
        actor_id,
        metadata
    ) VALUES (
        p_session_id,
        p_activity_type,
        p_session_question_id,
        p_actor_type,
        p_actor_id,
        p_metadata
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment question usage
CREATE OR REPLACE FUNCTION increment_question_usage(p_question_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE interview_questions 
    SET use_count = use_count + 1,
        last_used_at = NOW()
    WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-update interview_templates updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interview_templates_updated_at ON interview_templates;
CREATE TRIGGER interview_templates_updated_at 
    BEFORE UPDATE ON interview_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to log when a video response is created
CREATE OR REPLACE FUNCTION on_video_response_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the activity
    PERFORM log_interview_activity(
        NEW.session_id,
        'question_answered',
        NEW.session_question_id,
        'interviewee',
        NEW.contact_id,
        jsonb_build_object('duration', NEW.duration, 'answer_type', NEW.answer_type)
    );

    -- Create shared memory
    PERFORM create_shared_memory_from_response(NEW.id, NEW.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_response_created_trigger ON video_responses;
CREATE TRIGGER video_response_created_trigger
    AFTER INSERT ON video_responses
    FOR EACH ROW EXECUTE FUNCTION on_video_response_created();
