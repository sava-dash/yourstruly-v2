-- Memory Sharing Schema for YoursTruly V2
-- Allows users to share memories with contacts who can comment and contribute media

-- ============================================
-- MEMORY SHARES (who has access to a memory)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Who it's shared with
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Contact's access details (for viewing without login)
    share_token UUID DEFAULT gen_random_uuid(),
    
    -- Permissions
    can_comment BOOLEAN DEFAULT TRUE,
    can_add_media BOOLEAN DEFAULT TRUE,
    
    -- Notification settings
    notify_email TEXT,
    notify_phone TEXT,
    
    -- Status
    invitation_sent_at TIMESTAMPTZ,
    first_viewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(memory_id, contact_id)
);

-- ============================================
-- MEMORY COMMENTS (from shared contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    
    -- Who left the comment (contact, not auth user)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    contact_name TEXT, -- Cached in case contact is deleted
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- Moderation (owner can hide comments)
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHARED MEDIA (media added by contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_shared_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    
    -- Who uploaded (contact, not auth user)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    contact_name TEXT, -- Cached in case contact is deleted
    
    -- File info
    file_url TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_type TEXT NOT NULL, -- image, video
    mime_type TEXT,
    file_size INTEGER,
    
    -- Caption
    caption TEXT,
    
    -- Moderation (owner can hide or approve)
    is_approved BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_memory_shares_memory ON memory_shares(memory_id);
CREATE INDEX idx_memory_shares_contact ON memory_shares(contact_id);
CREATE INDEX idx_memory_shares_token ON memory_shares(share_token);
CREATE INDEX idx_memory_shares_owner ON memory_shares(owner_id);

CREATE INDEX idx_memory_comments_memory ON memory_comments(memory_id);
CREATE INDEX idx_memory_comments_contact ON memory_comments(contact_id);

CREATE INDEX idx_memory_shared_media_memory ON memory_shared_media(memory_id);
CREATE INDEX idx_memory_shared_media_contact ON memory_shared_media(contact_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE memory_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_shared_media ENABLE ROW LEVEL SECURITY;

-- Memory shares: owners can manage
CREATE POLICY "Owners can manage memory shares" ON memory_shares
    FOR ALL USING (auth.uid() = owner_id);

-- Memory comments: owners of the memory can view all
CREATE POLICY "Memory owners can manage comments" ON memory_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM memories 
            WHERE id = memory_id AND user_id = auth.uid()
        )
    );

-- Shared media: owners of the memory can manage
CREATE POLICY "Memory owners can manage shared media" ON memory_shared_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM memories 
            WHERE id = memory_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER memory_comments_updated_at
    BEFORE UPDATE ON memory_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Add shared count to memories for quick display
-- ============================================
ALTER TABLE memories 
    ADD COLUMN IF NOT EXISTS shared_with_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shared_media_count INTEGER DEFAULT 0;

-- Function to update share counts
CREATE OR REPLACE FUNCTION update_memory_share_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'memory_shares' THEN
        UPDATE memories SET shared_with_count = (
            SELECT COUNT(*) FROM memory_shares WHERE memory_id = COALESCE(NEW.memory_id, OLD.memory_id)
        ) WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
    ELSIF TG_TABLE_NAME = 'memory_comments' THEN
        UPDATE memories SET comment_count = (
            SELECT COUNT(*) FROM memory_comments WHERE memory_id = COALESCE(NEW.memory_id, OLD.memory_id) AND NOT is_hidden
        ) WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
    ELSIF TG_TABLE_NAME = 'memory_shared_media' THEN
        UPDATE memories SET shared_media_count = (
            SELECT COUNT(*) FROM memory_shared_media WHERE memory_id = COALESCE(NEW.memory_id, OLD.memory_id) AND NOT is_hidden
        ) WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_share_count
    AFTER INSERT OR DELETE ON memory_shares
    FOR EACH ROW EXECUTE FUNCTION update_memory_share_counts();

CREATE TRIGGER update_comment_count
    AFTER INSERT OR DELETE OR UPDATE OF is_hidden ON memory_comments
    FOR EACH ROW EXECUTE FUNCTION update_memory_share_counts();

CREATE TRIGGER update_shared_media_count
    AFTER INSERT OR DELETE OR UPDATE OF is_hidden ON memory_shared_media
    FOR EACH ROW EXECUTE FUNCTION update_memory_share_counts();
