-- ============================================================================
-- Migration: Wisdom (Knowledge Entries) Sharing & Comments
-- Created: 2026-02-22
-- Description: Allow users to share wisdom entries with contacts and add comments
-- Follows the same pattern as memory_shares from 032_sharing_collaboration.sql
-- ============================================================================

-- ============================================
-- KNOWLEDGE SHARES (who has access to wisdom)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Who it's shared with (YT contact)
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- For link sharing (without auth)
  share_token UUID DEFAULT gen_random_uuid(),
  
  -- Permissions
  can_comment BOOLEAN DEFAULT TRUE,
  
  -- Notification settings (from contact)
  notify_email TEXT,
  notify_phone TEXT,
  
  -- Status tracking
  invitation_sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(knowledge_id, contact_id)
);

-- ============================================
-- KNOWLEDGE COMMENTS (from shared contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  
  -- Who left the comment
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL, -- Cached in case contact is deleted
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Moderation
  is_hidden BOOLEAN DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_knowledge_shares_knowledge ON knowledge_shares(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_shares_contact ON knowledge_shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_shares_owner ON knowledge_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_shares_token ON knowledge_shares(share_token);

CREATE INDEX IF NOT EXISTS idx_knowledge_comments_knowledge ON knowledge_comments(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_contact ON knowledge_comments(contact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_visible ON knowledge_comments(knowledge_id, created_at DESC) 
  WHERE is_hidden = FALSE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE knowledge_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_comments ENABLE ROW LEVEL SECURITY;

-- Knowledge shares: owners can manage
CREATE POLICY "Owners can manage knowledge shares" ON knowledge_shares
  FOR ALL USING (auth.uid() = owner_id);

-- Knowledge comments: knowledge owners can view and manage all
CREATE POLICY "Knowledge owners can manage comments" ON knowledge_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM knowledge_entries ke
      WHERE ke.id = knowledge_id AND ke.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for knowledge_shares
DROP TRIGGER IF EXISTS knowledge_shares_updated_at ON knowledge_shares;
CREATE TRIGGER knowledge_shares_updated_at
  BEFORE UPDATE ON knowledge_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at for knowledge_comments
DROP TRIGGER IF EXISTS knowledge_comments_updated_at ON knowledge_comments;
CREATE TRIGGER knowledge_comments_updated_at
  BEFORE UPDATE ON knowledge_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ADD COUNT COLUMNS TO KNOWLEDGE_ENTRIES
-- ============================================
ALTER TABLE knowledge_entries 
  ADD COLUMN IF NOT EXISTS shared_with_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Function to update counts
CREATE OR REPLACE FUNCTION update_knowledge_share_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'knowledge_shares' THEN
    UPDATE knowledge_entries SET shared_with_count = (
      SELECT COUNT(*) FROM knowledge_shares 
      WHERE knowledge_id = COALESCE(NEW.knowledge_id, OLD.knowledge_id)
    ) WHERE id = COALESCE(NEW.knowledge_id, OLD.knowledge_id);
  ELSIF TG_TABLE_NAME = 'knowledge_comments' THEN
    UPDATE knowledge_entries SET comment_count = (
      SELECT COUNT(*) FROM knowledge_comments 
      WHERE knowledge_id = COALESCE(NEW.knowledge_id, OLD.knowledge_id) 
      AND NOT is_hidden
    ) WHERE id = COALESCE(NEW.knowledge_id, OLD.knowledge_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_knowledge_share_count ON knowledge_shares;
CREATE TRIGGER update_knowledge_share_count
  AFTER INSERT OR DELETE ON knowledge_shares
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_share_counts();

DROP TRIGGER IF EXISTS update_knowledge_comment_count ON knowledge_comments;
CREATE TRIGGER update_knowledge_comment_count
  AFTER INSERT OR DELETE OR UPDATE OF is_hidden ON knowledge_comments
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_share_counts();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE knowledge_shares IS 'Tracks which contacts have access to shared wisdom entries';
COMMENT ON TABLE knowledge_comments IS 'Comments from shared contacts on wisdom entries';
COMMENT ON COLUMN knowledge_shares.share_token IS 'Token for sharing via link without requiring login';
COMMENT ON COLUMN knowledge_comments.contact_name IS 'Cached name in case contact is deleted';
