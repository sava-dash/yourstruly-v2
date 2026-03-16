-- PostScripts Schema for YoursTruly V2
-- Scheduled messages and gifts for future delivery

-- ============================================
-- POSTSCRIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS postscripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Recipient
    recipient_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    
    -- Content
    title TEXT NOT NULL,
    message TEXT,
    video_url TEXT,
    
    -- Delivery settings
    delivery_type TEXT NOT NULL DEFAULT 'date', -- date, event, passing
    delivery_date DATE,  -- For 'date' type
    delivery_event TEXT, -- birthday, anniversary, christmas, etc.
    delivery_recurring BOOLEAN DEFAULT FALSE,
    
    -- For 'passing' type (delivered after user passes)
    requires_confirmation BOOLEAN DEFAULT FALSE,
    confirmation_contacts UUID[], -- Contacts who must confirm passing
    
    -- Gift attachment
    has_gift BOOLEAN DEFAULT FALSE,
    gift_type TEXT,  -- physical, digital, donation
    gift_details JSONB, -- Product info, links, amounts
    gift_budget DECIMAL(10, 2),
    
    -- Status
    status TEXT DEFAULT 'scheduled', -- scheduled, sent, cancelled, failed
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTSCRIPT ATTACHMENTS (photos, files)
-- ============================================
CREATE TABLE IF NOT EXISTS postscript_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    
    file_url TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_type TEXT NOT NULL, -- image, video, document
    file_name TEXT,
    file_size INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_postscripts_user ON postscripts(user_id);
CREATE INDEX idx_postscripts_status ON postscripts(status);
CREATE INDEX idx_postscripts_delivery ON postscripts(delivery_date) WHERE status = 'scheduled';
CREATE INDEX idx_postscripts_recipient ON postscripts(recipient_contact_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE postscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE postscript_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own postscripts" ON postscripts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own postscript attachments" ON postscript_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM postscripts 
            WHERE id = postscript_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER postscripts_updated_at
    BEFORE UPDATE ON postscripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Add settings column to profiles if not exists
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
