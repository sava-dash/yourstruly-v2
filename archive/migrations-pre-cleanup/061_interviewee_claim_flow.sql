-- Migration 061: Interviewee Account Claim Flow
-- Allow non-users who complete interviews to claim their content when they sign up

-- ============================================
-- INTERVIEWEE TRACKING TABLE
-- ============================================

-- Track interviewee identity separate from contact (interviewer's view)
CREATE TABLE IF NOT EXISTS interview_respondents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Interview context
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    
    -- Identity (as provided by respondent, not interviewer)
    email TEXT,
    phone TEXT,
    name_provided TEXT,
    
    -- Verification status
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    verification_code TEXT,
    verification_expires_at TIMESTAMPTZ,
    
    -- If they later create an account
    claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    
    -- Consent
    consent_to_save BOOLEAN DEFAULT false,  -- "Save a copy to your account?"
    consent_to_contact BOOLEAN DEFAULT false, -- "Can we email you about YoursTruly?"
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_respondents_session ON interview_respondents(session_id);
CREATE INDEX IF NOT EXISTS idx_respondents_email ON interview_respondents(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_respondents_phone ON interview_respondents(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_respondents_unclaimed ON interview_respondents(email, phone) WHERE claimed_by_user_id IS NULL;

-- RLS
ALTER TABLE interview_respondents ENABLE ROW LEVEL SECURITY;

-- Session owner can view respondents
DROP POLICY IF EXISTS "Session owner can view respondents" ON interview_respondents;
CREATE POLICY "Session owner can view respondents" ON interview_respondents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Users can view their own claimed responses
DROP POLICY IF EXISTS "Users can view own claimed responses" ON interview_respondents;
CREATE POLICY "Users can view own claimed responses" ON interview_respondents
    FOR SELECT USING (claimed_by_user_id = auth.uid());

-- ============================================
-- CLAIMED MEMORIES TABLE
-- ============================================

-- When an interviewee claims their content, copy memories to their account
CREATE TABLE IF NOT EXISTS claimed_interview_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Original (interviewer's copy)
    original_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    original_video_response_id UUID NOT NULL REFERENCES video_responses(id) ON DELETE CASCADE,
    
    -- Cloned (interviewee's copy)
    cloned_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    
    -- The user who claimed it
    claimed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, cloned, declined
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claimed_memories_user ON claimed_interview_memories(claimed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_memories_original ON claimed_interview_memories(original_memory_id);

ALTER TABLE claimed_interview_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own claimed memories" ON claimed_interview_memories;
CREATE POLICY "Users can view own claimed memories" ON claimed_interview_memories
    FOR ALL USING (claimed_by_user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Find claimable interviews for a new user
CREATE OR REPLACE FUNCTION find_claimable_interviews(
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
    session_id UUID,
    session_name TEXT,
    interviewer_name TEXT,
    response_count INT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        ir.session_id,
        COALESCE(ins.custom_name, 'Interview') as session_name,
        p.full_name as interviewer_name,
        (SELECT COUNT(*)::INT FROM video_responses vr WHERE vr.session_id = ir.session_id) as response_count,
        ir.created_at
    FROM interview_respondents ir
    JOIN interview_sessions ins ON ins.id = ir.session_id
    JOIN profiles p ON p.id = ins.user_id
    WHERE ir.claimed_by_user_id IS NULL
      AND ir.consent_to_save = true
      AND (
          (p_email IS NOT NULL AND LOWER(ir.email) = LOWER(p_email))
          OR (p_phone IS NOT NULL AND ir.phone = p_phone)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Claim interview responses for a user
CREATE OR REPLACE FUNCTION claim_interview_responses(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_response RECORD;
    v_new_memory_id UUID;
BEGIN
    -- Update respondent record
    UPDATE interview_respondents
    SET claimed_by_user_id = p_user_id,
        claimed_at = NOW()
    WHERE session_id = p_session_id
      AND claimed_by_user_id IS NULL
      AND consent_to_save = true;

    -- Clone each video response as a memory in the new user's account
    FOR v_response IN
        SELECT 
            vr.id as response_id,
            vr.video_url,
            vr.transcript,
            vr.ai_summary,
            sq.question_text,
            m.id as original_memory_id
        FROM video_responses vr
        JOIN session_questions sq ON sq.id = vr.session_question_id
        LEFT JOIN memory_video_links mvl ON mvl.video_response_id = vr.id
        LEFT JOIN memories m ON m.id = mvl.memory_id
        WHERE vr.session_id = p_session_id
    LOOP
        -- Create memory in new user's account
        INSERT INTO memories (
            user_id,
            title,
            description,
            memory_type,
            ai_summary
        ) VALUES (
            p_user_id,
            'My Interview: ' || v_response.question_text,
            COALESCE(v_response.transcript, 'Interview response'),
            'interview',
            v_response.ai_summary
        )
        RETURNING id INTO v_new_memory_id;

        -- Copy the media
        INSERT INTO memory_media (
            memory_id,
            user_id,
            file_url,
            file_type,
            is_cover
        ) VALUES (
            v_new_memory_id,
            p_user_id,
            v_response.video_url,
            'video',
            true
        );

        -- Track the claim
        INSERT INTO claimed_interview_memories (
            original_memory_id,
            original_video_response_id,
            cloned_memory_id,
            claimed_by_user_id,
            status
        ) VALUES (
            v_response.original_memory_id,
            v_response.response_id,
            v_new_memory_id,
            p_user_id,
            'cloned'
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Check for claimable content on user signup
-- ============================================

-- This would be called from your auth hook or onboarding flow
-- Example: SELECT * FROM find_claimable_interviews(NEW.email, NULL);

COMMENT ON TABLE interview_respondents IS 
    'Tracks interviewee identity for later account claiming. Email/phone stored here (not in contacts) to enable the interviewee to claim their content when they sign up.';

COMMENT ON FUNCTION find_claimable_interviews IS
    'Called during signup/onboarding to find any interview responses the new user can claim.';

COMMENT ON FUNCTION claim_interview_responses IS
    'Clones interview memories from interviewer account to interviewee account.';
