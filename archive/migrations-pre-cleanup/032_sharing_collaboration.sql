-- ============================================================================
-- Migration: Sharing & Collaboration System
-- Created: 2026-02-22
-- Description: User-to-user memory sharing, contributions, conversations, and notifications
-- 
-- NOTE: This replaces the old contact-based sharing system from 005_memory_sharing.sql
-- with a new user-to-user system. The old tables are dropped and recreated.
-- ============================================================================

-- ============================================
-- CLEANUP OLD SHARING SYSTEM (from 005_memory_sharing.sql)
-- ============================================

-- Drop old triggers first
DROP TRIGGER IF EXISTS update_share_count ON memory_shares;
DROP TRIGGER IF EXISTS update_comment_count ON memory_comments;
DROP TRIGGER IF EXISTS update_shared_media_count ON memory_shared_media;
DROP TRIGGER IF EXISTS memory_comments_updated_at ON memory_comments;

-- Drop old function
DROP FUNCTION IF EXISTS update_memory_share_counts();

-- Drop old tables (CASCADE removes dependent policies and indexes)
DROP TABLE IF EXISTS memory_shared_media CASCADE;
DROP TABLE IF EXISTS memory_comments CASCADE;
DROP TABLE IF EXISTS memory_shares CASCADE;

-- ============================================
-- MEMORY SHARES (who has access to what memory)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- null for email invites
  
  -- Permission level
  permission_level TEXT NOT NULL DEFAULT 'contributor' 
    CHECK (permission_level IN ('viewer', 'contributor')),
  
  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  
  -- How was this shared
  shared_via TEXT NOT NULL DEFAULT 'internal'
    CHECK (shared_via IN ('internal', 'email')),
  
  -- For email invites (external users who haven't signed up)
  email TEXT,
  invite_token UUID DEFAULT gen_random_uuid(),
  invite_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(memory_id, shared_with_user_id),
  UNIQUE(memory_id, email),
  
  -- Either shared_with_user_id OR email must be set
  CONSTRAINT share_target_required CHECK (
    (shared_with_user_id IS NOT NULL) OR 
    (email IS NOT NULL AND shared_via = 'email')
  )
);

-- ============================================
-- MEMORY CONTRIBUTIONS (comments/additions to shared memories)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contribution type
  contribution_type TEXT NOT NULL
    CHECK (contribution_type IN ('comment', 'photo', 'video', 'quote', 'moment')),
  
  -- Content (for text-based contributions)
  content TEXT,
  
  -- Media (for photo/video contributions)
  media_url TEXT,
  media_key TEXT,       -- Storage key
  mime_type TEXT,
  file_size INTEGER,
  thumbnail_url TEXT,   -- For videos
  
  -- Moderation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Content validation
  CONSTRAINT contribution_content_required CHECK (
    (contribution_type IN ('comment', 'quote', 'moment') AND content IS NOT NULL) OR
    (contribution_type IN ('photo', 'video') AND media_url IS NOT NULL)
  )
);

-- ============================================
-- CONTRIBUTION REACTIONS (emoji reactions)
-- ============================================
CREATE TABLE IF NOT EXISTS contribution_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES memory_contributions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Emoji (stored as Unicode emoji or shortcode)
  emoji TEXT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One reaction type per user per contribution
  UNIQUE(contribution_id, user_id, emoji)
);

-- ============================================
-- CONVERSATIONS (DMs and memory-linked threads)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conversation type
  type TEXT NOT NULL DEFAULT 'direct'
    CHECK (type IN ('direct', 'memory_thread')),
  
  -- For memory threads
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  
  -- Title (auto-generated for memory threads, optional for DMs)
  title TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  
  -- Stats for quick display
  message_count INTEGER DEFAULT 0
);

-- ============================================
-- CONVERSATION PARTICIPANTS (who's in each conversation)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  
  -- Notification preferences for this conversation
  muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMPTZ,
  
  -- Soft leave (can rejoin for memory threads)
  left_at TIMESTAMPTZ,
  
  -- Unique participant per conversation
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- MESSAGES (actual chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT,
  
  -- Optional media attachment
  media_url TEXT,
  media_type TEXT, -- image, video, audio
  
  -- Reply to another message
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Soft delete for moderation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Edit tracking
  edited_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either content or media required
  CONSTRAINT message_content_required CHECK (
    content IS NOT NULL OR media_url IS NOT NULL
  )
);

-- ============================================
-- NOTIFICATIONS (for batched digests)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification type
  type TEXT NOT NULL,
  -- Types: 'share_invite', 'share_accepted', 'new_contribution', 
  --        'contribution_reaction', 'new_message', 'mention', 
  --        'memory_updated', 'invite_reminder'
  
  -- Reference to related entity
  reference_id UUID,
  reference_type TEXT, -- 'memory_share', 'contribution', 'message', 'conversation'
  
  -- Actor (who triggered this notification)
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Display content
  title TEXT NOT NULL,
  body TEXT,
  
  -- Deep link
  action_url TEXT,
  
  -- State
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Email digest tracking
  included_in_digest BOOLEAN DEFAULT FALSE,
  digest_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for custom rendering
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- INDEXES
-- ============================================

-- Memory shares
CREATE INDEX idx_memory_shares_memory ON memory_shares(memory_id);
CREATE INDEX idx_memory_shares_shared_by ON memory_shares(shared_by_user_id);
CREATE INDEX idx_memory_shares_shared_with ON memory_shares(shared_with_user_id);
CREATE INDEX idx_memory_shares_status ON memory_shares(status);
CREATE INDEX idx_memory_shares_email ON memory_shares(email) WHERE email IS NOT NULL;
CREATE INDEX idx_memory_shares_invite_token ON memory_shares(invite_token);
CREATE INDEX idx_memory_shares_pending ON memory_shares(shared_with_user_id, status) 
  WHERE status = 'pending';

-- Memory contributions
CREATE INDEX idx_contributions_memory ON memory_contributions(memory_id);
CREATE INDEX idx_contributions_user ON memory_contributions(user_id);
CREATE INDEX idx_contributions_type ON memory_contributions(contribution_type);
CREATE INDEX idx_contributions_active ON memory_contributions(memory_id, created_at DESC) 
  WHERE is_deleted = FALSE;

-- Contribution reactions
CREATE INDEX idx_reactions_contribution ON contribution_reactions(contribution_id);
CREATE INDEX idx_reactions_user ON contribution_reactions(user_id);

-- Conversations
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_memory ON conversations(memory_id) WHERE memory_id IS NOT NULL;
CREATE INDEX idx_conversations_recent ON conversations(last_message_at DESC NULLS LAST);

-- Conversation participants
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_active ON conversation_participants(user_id, left_at) 
  WHERE left_at IS NULL;

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recent ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_active ON messages(conversation_id, created_at DESC) 
  WHERE is_deleted = FALSE;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);
CREATE INDEX idx_notifications_digest ON notifications(user_id, included_in_digest) 
  WHERE included_in_digest = FALSE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE memory_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- MEMORY SHARES POLICIES
-- --------------------------------------------

-- Users can see shares they created or received
CREATE POLICY "Users can view relevant shares" ON memory_shares
  FOR SELECT USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

-- Users can create shares for memories they own
CREATE POLICY "Users can create shares for own memories" ON memory_shares
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (SELECT 1 FROM memories WHERE id = memory_id AND user_id = auth.uid())
  );

-- Users can update shares they created or received
CREATE POLICY "Users can update relevant shares" ON memory_shares
  FOR UPDATE USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

-- Users can delete shares they created
CREATE POLICY "Users can delete own shares" ON memory_shares
  FOR DELETE USING (auth.uid() = shared_by_user_id);

-- --------------------------------------------
-- MEMORY CONTRIBUTIONS POLICIES
-- --------------------------------------------

-- Users can view contributions on memories they own or are shared on
CREATE POLICY "Users can view contributions on accessible memories" ON memory_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = memory_contributions.memory_id
      AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM memory_shares ms
          WHERE ms.memory_id = m.id 
          AND ms.shared_with_user_id = auth.uid()
          AND ms.status = 'accepted'
        )
      )
    )
  );

-- Users can create contributions on memories they're shared on (with contributor permission)
CREATE POLICY "Contributors can add to shared memories" ON memory_contributions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = memory_contributions.memory_id
      AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM memory_shares ms
          WHERE ms.memory_id = m.id 
          AND ms.shared_with_user_id = auth.uid()
          AND ms.status = 'accepted'
          AND ms.permission_level = 'contributor'
        )
      )
    )
  );

-- Users can update their own contributions
CREATE POLICY "Users can update own contributions" ON memory_contributions
  FOR UPDATE USING (auth.uid() = user_id);

-- Memory owners and contribution owners can soft-delete
CREATE POLICY "Users can delete contributions" ON memory_contributions
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = memory_contributions.memory_id AND m.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- CONTRIBUTION REACTIONS POLICIES
-- --------------------------------------------

-- Users can view reactions on contributions they can see
CREATE POLICY "Users can view reactions on visible contributions" ON contribution_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memory_contributions mc
      JOIN memories m ON m.id = mc.memory_id
      WHERE mc.id = contribution_reactions.contribution_id
      AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM memory_shares ms
          WHERE ms.memory_id = m.id 
          AND ms.shared_with_user_id = auth.uid()
          AND ms.status = 'accepted'
        )
      )
    )
  );

-- Users can react to visible contributions
CREATE POLICY "Users can add reactions" ON contribution_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM memory_contributions mc
      JOIN memories m ON m.id = mc.memory_id
      WHERE mc.id = contribution_reactions.contribution_id
      AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM memory_shares ms
          WHERE ms.memory_id = m.id 
          AND ms.shared_with_user_id = auth.uid()
          AND ms.status = 'accepted'
        )
      )
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON contribution_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------
-- CONVERSATIONS POLICIES
-- --------------------------------------------

-- Users can view conversations they're in
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (TRUE);

-- Participants can update conversation metadata
CREATE POLICY "Participants can update conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- --------------------------------------------
-- CONVERSATION PARTICIPANTS POLICIES
-- --------------------------------------------

-- Users can see participants in their conversations
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Users can add participants to conversations they're in
CREATE POLICY "Users can add participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Users can update their own participant record
CREATE POLICY "Users can update own participation" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- --------------------------------------------
-- MESSAGES POLICIES
-- --------------------------------------------

-- Users can view messages in conversations they're in
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Users can edit/delete their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- --------------------------------------------
-- NOTIFICATIONS POLICIES
-- --------------------------------------------

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System inserts notifications (service role)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER memory_shares_updated_at BEFORE UPDATE ON memory_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER memory_contributions_updated_at BEFORE UPDATE ON memory_contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update conversation last_message_at and message_count
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations 
    SET 
      last_message_at = NEW.created_at,
      message_count = message_count + 1,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations 
    SET 
      message_count = GREATEST(0, message_count - 1),
      updated_at = NOW()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Create notification on share invite
CREATE OR REPLACE FUNCTION notify_on_share_invite()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for internal shares (email shares handled separately)
  IF NEW.shared_via = 'internal' AND NEW.shared_with_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, 
      type, 
      reference_id, 
      reference_type, 
      actor_id,
      title, 
      body,
      metadata
    )
    SELECT 
      NEW.shared_with_user_id,
      'share_invite',
      NEW.id,
      'memory_share',
      NEW.shared_by_user_id,
      p.full_name || ' shared a memory with you',
      m.title,
      jsonb_build_object(
        'memory_id', NEW.memory_id,
        'memory_title', m.title,
        'sharer_name', p.full_name,
        'permission_level', NEW.permission_level
      )
    FROM profiles p
    JOIN memories m ON m.id = NEW.memory_id
    WHERE p.id = NEW.shared_by_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_share_invite_trigger
  AFTER INSERT ON memory_shares
  FOR EACH ROW EXECUTE FUNCTION notify_on_share_invite();

-- Create notification on share accepted
CREATE OR REPLACE FUNCTION notify_on_share_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Set accepted_at
    NEW.accepted_at := NOW();
    
    -- Notify the sharer
    INSERT INTO notifications (
      user_id, 
      type, 
      reference_id, 
      reference_type, 
      actor_id,
      title, 
      body,
      metadata
    )
    SELECT 
      NEW.shared_by_user_id,
      'share_accepted',
      NEW.id,
      'memory_share',
      NEW.shared_with_user_id,
      p.full_name || ' accepted your memory share',
      m.title,
      jsonb_build_object(
        'memory_id', NEW.memory_id,
        'memory_title', m.title,
        'accepter_name', p.full_name
      )
    FROM profiles p
    JOIN memories m ON m.id = NEW.memory_id
    WHERE p.id = NEW.shared_with_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_share_accepted_trigger
  BEFORE UPDATE ON memory_shares
  FOR EACH ROW 
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION notify_on_share_accepted();

-- Create notification on new contribution
CREATE OR REPLACE FUNCTION notify_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify memory owner (if not the contributor)
  INSERT INTO notifications (
    user_id, 
    type, 
    reference_id, 
    reference_type, 
    actor_id,
    title, 
    body,
    metadata
  )
  SELECT 
    m.user_id,
    'new_contribution',
    NEW.id,
    'contribution',
    NEW.user_id,
    p.full_name || ' added a ' || NEW.contribution_type || ' to your memory',
    COALESCE(NEW.content, m.title),
    jsonb_build_object(
      'memory_id', NEW.memory_id,
      'memory_title', m.title,
      'contributor_name', p.full_name,
      'contribution_type', NEW.contribution_type
    )
  FROM memories m
  JOIN profiles p ON p.id = NEW.user_id
  WHERE m.id = NEW.memory_id
  AND m.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_contribution_trigger
  AFTER INSERT ON memory_contributions
  FOR EACH ROW EXECUTE FUNCTION notify_on_contribution();

-- Helper: Get or create DM conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(
  p_user_1 UUID,
  p_user_2 UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find existing DM between these users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user_1 AND cp1.left_at IS NULL
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user_2 AND cp2.left_at IS NULL
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.left_at IS NULL
  ) = 2
  LIMIT 1;
  
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Create new DM conversation
  INSERT INTO conversations (type)
  VALUES ('direct')
  RETURNING id INTO v_conversation_id;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  VALUES 
    (v_conversation_id, p_user_1, NOW()),
    (v_conversation_id, p_user_2, NULL);
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM notifications 
  WHERE user_id = p_user_id AND is_read = FALSE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
  AND cp.left_at IS NULL
  AND m.sender_id != p_user_id
  AND m.is_deleted = FALSE
  AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Check if user has access to memory
CREATE OR REPLACE FUNCTION user_can_access_memory(
  p_user_id UUID,
  p_memory_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memories 
    WHERE id = p_memory_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM memory_shares 
    WHERE memory_id = p_memory_id 
    AND shared_with_user_id = p_user_id 
    AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- UPDATE MEMORIES TABLE COUNTS
-- ============================================

-- The old system added these columns - update them to work with new structure
-- shared_with_count, comment_count, shared_media_count already exist from 005

-- Add contribution_count for the new unified contributions
ALTER TABLE memories ADD COLUMN IF NOT EXISTS contribution_count INTEGER DEFAULT 0;

-- Function to update memory counts from new system
CREATE OR REPLACE FUNCTION update_memory_collaboration_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'memory_shares' THEN
    UPDATE memories SET shared_with_count = (
      SELECT COUNT(*) FROM memory_shares 
      WHERE memory_id = COALESCE(NEW.memory_id, OLD.memory_id)
      AND status = 'accepted'
    ) WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
  ELSIF TG_TABLE_NAME = 'memory_contributions' THEN
    UPDATE memories SET contribution_count = (
      SELECT COUNT(*) FROM memory_contributions 
      WHERE memory_id = COALESCE(NEW.memory_id, OLD.memory_id) 
      AND is_deleted = FALSE
    ) WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_memory_share_count_trigger
  AFTER INSERT OR DELETE OR UPDATE OF status ON memory_shares
  FOR EACH ROW EXECUTE FUNCTION update_memory_collaboration_counts();

CREATE TRIGGER update_memory_contribution_count_trigger
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON memory_contributions
  FOR EACH ROW EXECUTE FUNCTION update_memory_collaboration_counts();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE memory_shares IS 'Tracks which users have access to shared memories';
COMMENT ON TABLE memory_contributions IS 'User-generated content added to shared memories (comments, photos, quotes)';
COMMENT ON TABLE contribution_reactions IS 'Emoji reactions on contributions';
COMMENT ON TABLE conversations IS 'Chat threads - either direct messages or memory-linked discussions';
COMMENT ON TABLE conversation_participants IS 'Users participating in each conversation';
COMMENT ON TABLE messages IS 'Individual chat messages within conversations';
COMMENT ON TABLE notifications IS 'User notifications for async delivery and digest batching';

COMMENT ON COLUMN memory_shares.permission_level IS 'viewer: can only see; contributor: can add content';
COMMENT ON COLUMN memory_shares.invite_token IS 'Token for email invite links';
COMMENT ON COLUMN memory_contributions.contribution_type IS 'comment: text comment; photo/video: media; quote: memorable quote; moment: brief memory snippet';
COMMENT ON COLUMN conversations.type IS 'direct: 1:1 DM; memory_thread: discussion attached to a memory';
COMMENT ON COLUMN notifications.included_in_digest IS 'Whether this notification was included in an email digest';
