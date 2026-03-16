-- ============================================================================
-- Migration: Circles Feature
-- Created: 2026-02-22
-- Description: Trusted inner circles for collaborative memory sharing with
--              hard privacy boundaries. Supports admin voting, circle-scoped
--              content, and secure invite links.
-- ============================================================================

-- ============================================
-- ENUMS (with IF NOT EXISTS checks)
-- ============================================

DO $$ BEGIN
  CREATE TYPE circle_status AS ENUM ('active', 'hidden', 'deleted_soft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_invite_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_vote_type AS ENUM ('promote_admin', 'demote_admin', 'delete_circle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_vote_status AS ENUM ('open', 'passed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_vote_choice AS ENUM ('yes', 'no');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_content_type AS ENUM ('memory', 'knowledge', 'media', 'postscript');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE circle_postscript_status AS ENUM ('pending', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_scope_type AS ENUM ('private', 'circle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CIRCLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  
  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Privacy and status
  is_private BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CIRCLE MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role circle_member_role NOT NULL DEFAULT 'member',
  
  -- Invitation
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_status circle_invite_status NOT NULL DEFAULT 'pending',
  invite_link_token TEXT, -- For secure invite links
  
  -- Membership timestamps
  joined_at TIMESTAMPTZ, -- Set when invite accepted
  left_at TIMESTAMPTZ,   -- Null if still member
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(circle_id, user_id),
  UNIQUE(invite_link_token)
);

-- ============================================
-- CIRCLE VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  
  -- Who initiated the vote
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Vote details
  vote_type circle_vote_type NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For promote/demote
  
  -- Status
  status circle_vote_status NOT NULL DEFAULT 'open',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  -- For promote/demote, target is required
  CONSTRAINT vote_target_required CHECK (
    (vote_type = 'delete_circle' AND target_user_id IS NULL) OR
    (vote_type IN ('promote_admin', 'demote_admin') AND target_user_id IS NOT NULL)
  )
);

-- ============================================
-- CIRCLE VOTE RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES circle_votes(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- The vote
  vote circle_vote_choice NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per admin per vote
  UNIQUE(vote_id, admin_user_id)
);

-- ============================================
-- CIRCLE MESSAGES TABLE (Hard boundary from regular messages)
-- ============================================
CREATE TABLE IF NOT EXISTS circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  
  -- Reply threading
  reply_to_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,
  
  -- Soft delete and edit tracking
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either content or media required
  CONSTRAINT circle_message_content_required CHECK (
    content IS NOT NULL OR media_url IS NOT NULL
  )
);

-- ============================================
-- CIRCLE CONTENT TABLE (Links content to circles with hard boundary)
-- ============================================
CREATE TABLE IF NOT EXISTS circle_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  
  -- Content reference
  content_type circle_content_type NOT NULL,
  content_id UUID NOT NULL, -- References the original content
  
  -- Who shared it
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique content per circle
  UNIQUE(circle_id, content_type, content_id)
);

-- ============================================
-- CIRCLE POSTSCRIPTS TABLE (Postscripts targeting circles)
-- ============================================
CREATE TABLE IF NOT EXISTS circle_postscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  
  -- Delivery tracking
  delivery_status circle_postscript_status NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique postscript per circle
  UNIQUE(postscript_id, circle_id)
);

-- ============================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Memories: Add scope and optional circle reference
ALTER TABLE memories 
  ADD COLUMN IF NOT EXISTS scope_type content_scope_type DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS circle_id UUID REFERENCES circles(id) ON DELETE SET NULL;

-- Knowledge entries: Add scope and optional circle reference  
ALTER TABLE knowledge_entries
  ADD COLUMN IF NOT EXISTS scope_type content_scope_type DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS circle_id UUID REFERENCES circles(id) ON DELETE SET NULL;

-- Postscripts: Add ability to target circles
ALTER TABLE postscripts
  ADD COLUMN IF NOT EXISTS can_target_circles BOOLEAN DEFAULT TRUE;

-- ============================================
-- INDEXES
-- ============================================

-- Circles
CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by);
CREATE INDEX IF NOT EXISTS idx_circles_not_deleted ON circles(created_by) WHERE is_deleted = FALSE;

-- Circle members
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_status ON circle_members(invite_status);
CREATE INDEX IF NOT EXISTS idx_circle_members_role ON circle_members(circle_id, role);
CREATE INDEX IF NOT EXISTS idx_circle_members_active ON circle_members(circle_id, user_id) 
  WHERE invite_status = 'accepted' AND left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_circle_members_invite_token ON circle_members(invite_link_token) 
  WHERE invite_link_token IS NOT NULL;

-- Circle votes
CREATE INDEX IF NOT EXISTS idx_circle_votes_circle ON circle_votes(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_votes_initiated_by ON circle_votes(initiated_by);
CREATE INDEX IF NOT EXISTS idx_circle_votes_status ON circle_votes(status);
CREATE INDEX IF NOT EXISTS idx_circle_votes_open ON circle_votes(circle_id, status) WHERE status = 'open';

-- Circle vote responses
CREATE INDEX IF NOT EXISTS idx_circle_vote_responses_vote ON circle_vote_responses(vote_id);
CREATE INDEX IF NOT EXISTS idx_circle_vote_responses_admin ON circle_vote_responses(admin_user_id);

-- Circle messages
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_sender ON circle_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_recent ON circle_messages(circle_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- Circle content
CREATE INDEX IF NOT EXISTS idx_circle_content_circle ON circle_content(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_content_type ON circle_content(content_type);
CREATE INDEX IF NOT EXISTS idx_circle_content_shared_by ON circle_content(shared_by);
CREATE INDEX IF NOT EXISTS idx_circle_content_ref ON circle_content(content_type, content_id);

-- Circle postscripts
CREATE INDEX IF NOT EXISTS idx_circle_postscripts_postscript ON circle_postscripts(postscript_id);
CREATE INDEX IF NOT EXISTS idx_circle_postscripts_circle ON circle_postscripts(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_postscripts_status ON circle_postscripts(delivery_status);
CREATE INDEX IF NOT EXISTS idx_circle_postscripts_pending ON circle_postscripts(circle_id, delivery_status)
  WHERE delivery_status = 'pending';

-- Existing tables: circle scope
CREATE INDEX IF NOT EXISTS idx_memories_circle ON memories(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(user_id, scope_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_circle ON knowledge_entries(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_scope ON knowledge_entries(user_id, scope_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_postscripts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is an active member of a circle
CREATE OR REPLACE FUNCTION check_circle_membership(
  p_user_id UUID,
  p_circle_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
    AND invite_status = 'accepted'
    AND left_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is an admin (owner or admin role) of a circle
CREATE OR REPLACE FUNCTION check_circle_admin(
  p_user_id UUID,
  p_circle_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
    AND invite_status = 'accepted'
    AND left_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Count admin votes for a circle vote
CREATE OR REPLACE FUNCTION count_circle_admin_votes(p_vote_id UUID)
RETURNS TABLE (
  yes_count INTEGER,
  no_count INTEGER,
  total_admins INTEGER
) AS $$
DECLARE
  v_circle_id UUID;
BEGIN
  -- Get the circle for this vote
  SELECT circle_id INTO v_circle_id FROM circle_votes WHERE id = p_vote_id;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM circle_vote_responses 
     WHERE vote_id = p_vote_id AND vote = 'yes') as yes_count,
    (SELECT COUNT(*)::INTEGER FROM circle_vote_responses 
     WHERE vote_id = p_vote_id AND vote = 'no') as no_count,
    (SELECT COUNT(*)::INTEGER FROM circle_members 
     WHERE circle_id = v_circle_id 
     AND role IN ('owner', 'admin')
     AND invite_status = 'accepted'
     AND left_at IS NULL) as total_admins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role in a circle
CREATE OR REPLACE FUNCTION get_circle_member_role(
  p_user_id UUID,
  p_circle_id UUID
) RETURNS circle_member_role AS $$
  SELECT role FROM circle_members
  WHERE circle_id = p_circle_id
  AND user_id = p_user_id
  AND invite_status = 'accepted'
  AND left_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RLS POLICIES: CIRCLES
-- ============================================

-- Users can view circles they're members of
CREATE POLICY "Members can view their circles" ON circles
  FOR SELECT USING (
    check_circle_membership(auth.uid(), id) OR
    created_by = auth.uid()
  );

-- Users can create circles
CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only admins can update circle details
CREATE POLICY "Admins can update circles" ON circles
  FOR UPDATE USING (check_circle_admin(auth.uid(), id));

-- No direct deletes - must go through voting system
-- Soft delete via status change handled by update policy

-- ============================================
-- RLS POLICIES: CIRCLE MEMBERS
-- ============================================

-- Members can view other members in their circles
CREATE POLICY "Members can view circle members" ON circle_members
  FOR SELECT USING (
    check_circle_membership(auth.uid(), circle_id) OR
    user_id = auth.uid() -- Can see own pending invites
  );

-- Admins can invite new members
CREATE POLICY "Admins can add members" ON circle_members
  FOR INSERT WITH CHECK (
    check_circle_admin(auth.uid(), circle_id) OR
    -- Creator can add themselves as owner
    (auth.uid() = user_id AND auth.uid() = invited_by)
  );

-- Members can update their own membership (accept/decline invite, leave)
-- Admins can update other members (role changes via voting handled separately)
CREATE POLICY "Members can update membership" ON circle_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    check_circle_admin(auth.uid(), circle_id)
  );

-- ============================================
-- RLS POLICIES: CIRCLE VOTES
-- ============================================

-- Members can view votes in their circles
CREATE POLICY "Members can view circle votes" ON circle_votes
  FOR SELECT USING (check_circle_membership(auth.uid(), circle_id));

-- Only admins can initiate votes
CREATE POLICY "Admins can create votes" ON circle_votes
  FOR INSERT WITH CHECK (
    check_circle_admin(auth.uid(), circle_id) AND
    auth.uid() = initiated_by
  );

-- Only the initiator can cancel a vote
CREATE POLICY "Initiator can update vote" ON circle_votes
  FOR UPDATE USING (auth.uid() = initiated_by);

-- ============================================
-- RLS POLICIES: CIRCLE VOTE RESPONSES
-- ============================================

-- Members can view vote responses in their circles
CREATE POLICY "Members can view vote responses" ON circle_vote_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_votes cv
      WHERE cv.id = circle_vote_responses.vote_id
      AND check_circle_membership(auth.uid(), cv.circle_id)
    )
  );

-- Only admins can vote (and only once)
CREATE POLICY "Admins can vote" ON circle_vote_responses
  FOR INSERT WITH CHECK (
    auth.uid() = admin_user_id AND
    EXISTS (
      SELECT 1 FROM circle_votes cv
      WHERE cv.id = circle_vote_responses.vote_id
      AND cv.status = 'open'
      AND check_circle_admin(auth.uid(), cv.circle_id)
    )
  );

-- ============================================
-- RLS POLICIES: CIRCLE MESSAGES
-- ============================================

-- Members can view messages in their circles
CREATE POLICY "Members can view circle messages" ON circle_messages
  FOR SELECT USING (
    check_circle_membership(auth.uid(), circle_id) AND
    is_deleted = FALSE
  );

-- Members can send messages
CREATE POLICY "Members can send messages" ON circle_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    check_circle_membership(auth.uid(), circle_id)
  );

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete messages" ON circle_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- ============================================
-- RLS POLICIES: CIRCLE CONTENT
-- ============================================

-- Members can view shared content in their circles
CREATE POLICY "Members can view circle content" ON circle_content
  FOR SELECT USING (check_circle_membership(auth.uid(), circle_id));

-- Members can share content to their circles
CREATE POLICY "Members can share content" ON circle_content
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    check_circle_membership(auth.uid(), circle_id)
  );

-- Members can remove content they shared
CREATE POLICY "Sharers can remove content" ON circle_content
  FOR DELETE USING (auth.uid() = shared_by);

-- ============================================
-- RLS POLICIES: CIRCLE POSTSCRIPTS
-- ============================================

-- Members can view circle postscripts
CREATE POLICY "Members can view circle postscripts" ON circle_postscripts
  FOR SELECT USING (check_circle_membership(auth.uid(), circle_id));

-- Postscript owner can target circles they're in
CREATE POLICY "Owners can create circle postscripts" ON circle_postscripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM postscripts p
      WHERE p.id = circle_postscripts.postscript_id
      AND p.user_id = auth.uid()
    ) AND
    check_circle_membership(auth.uid(), circle_id)
  );

-- Postscript owner can update/cancel delivery
CREATE POLICY "Owners can update circle postscripts" ON circle_postscripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM postscripts p
      WHERE p.id = circle_postscripts.postscript_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- ADDITIONAL RLS FOR EXISTING TABLES (Circle scope)
-- ============================================

-- Update memories RLS to include circle and sharing visibility
-- The original policy "Users can manage own memories" was FOR ALL
-- We need to split it to allow shared/circle access for SELECT only

DROP POLICY IF EXISTS "Users can manage own memories" ON memories;
DROP POLICY IF EXISTS "Users can view own and shared memories" ON memories;
DROP POLICY IF EXISTS "Users can view own, shared, and circle memories" ON memories;

-- SELECT: Own memories + shared + circle
CREATE POLICY "Users can view own, shared, and circle memories" ON memories
  FOR SELECT USING (
    -- Own memories
    auth.uid() = user_id OR
    -- Shared memories (from 032)
    EXISTS (
      SELECT 1 FROM memory_shares ms
      WHERE ms.memory_id = memories.id
      AND ms.shared_with_user_id = auth.uid()
      AND ms.status = 'accepted'
    ) OR
    -- Circle memories
    (
      circle_id IS NOT NULL AND
      check_circle_membership(auth.uid(), circle_id)
    )
  );

-- INSERT: Own memories only
CREATE POLICY "Users can create own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Own memories only
CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Own memories only
CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Update knowledge_entries RLS to include circle visibility
DROP POLICY IF EXISTS "Users can view own knowledge" ON knowledge_entries;
DROP POLICY IF EXISTS "Users can view own and circle knowledge" ON knowledge_entries;

CREATE POLICY "Users can view own and circle knowledge" ON knowledge_entries
  FOR SELECT USING (
    auth.uid() = user_id OR
    (
      circle_id IS NOT NULL AND
      check_circle_membership(auth.uid(), circle_id)
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS circles_updated_at ON circles;
CREATE TRIGGER circles_updated_at 
  BEFORE UPDATE ON circles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create owner membership when circle is created
CREATE OR REPLACE FUNCTION create_circle_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO circle_members (
    circle_id,
    user_id,
    role,
    invited_by,
    invite_status,
    joined_at
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'owner',
    NEW.created_by,
    'accepted',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_circle_owner_trigger ON circles;
CREATE TRIGGER create_circle_owner_trigger
  AFTER INSERT ON circles
  FOR EACH ROW EXECUTE FUNCTION create_circle_owner_membership();

-- Auto-set joined_at when invite is accepted
CREATE OR REPLACE FUNCTION set_circle_joined_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.invite_status = 'pending' AND NEW.invite_status = 'accepted' THEN
    NEW.joined_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_circle_joined_at_trigger ON circle_members;
CREATE TRIGGER set_circle_joined_at_trigger
  BEFORE UPDATE ON circle_members
  FOR EACH ROW
  WHEN (OLD.invite_status = 'pending' AND NEW.invite_status = 'accepted')
  EXECUTE FUNCTION set_circle_joined_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE circles IS 'Trusted inner circles for collaborative memory sharing';
COMMENT ON TABLE circle_members IS 'Circle membership with roles and invite status';
COMMENT ON TABLE circle_votes IS 'Democratic voting system for admin actions and circle deletion';
COMMENT ON TABLE circle_vote_responses IS 'Individual admin votes on circle decisions';
COMMENT ON TABLE circle_messages IS 'Private messaging within circles (hard boundary from main messages)';
COMMENT ON TABLE circle_content IS 'Content explicitly shared to circles (hard boundary)';
COMMENT ON TABLE circle_postscripts IS 'Postscripts targeting entire circles for delivery';

COMMENT ON COLUMN circles.is_deleted IS 'Soft delete flag - when true, circle is pending permanent deletion';
COMMENT ON COLUMN circle_members.role IS 'owner: original creator; admin: can manage members; member: standard access';
COMMENT ON COLUMN circle_members.invite_link_token IS 'Secure token for invite links (e.g., yourstruly.love/circle/join/TOKEN)';
COMMENT ON COLUMN circle_votes.vote_type IS 'promote_admin: member → admin; demote_admin: admin → member; delete_circle: remove circle (requires vote)';
COMMENT ON COLUMN circle_content.content_id IS 'References memory.id, knowledge_entry.id, etc. based on content_type';

COMMENT ON FUNCTION check_circle_membership IS 'Returns true if user is an active, accepted member of the circle';
COMMENT ON FUNCTION check_circle_admin IS 'Returns true if user is an owner or admin of the circle';
COMMENT ON FUNCTION count_circle_admin_votes IS 'Returns vote counts for a circle vote: yes_count, no_count, total_admins';
