-- ============================================================================
-- Migration: Circle Invites & Notifications
-- Created: 2026-02-23
-- Description: Create circle_invites table and notification system for invites
-- ============================================================================

-- Circle Invites table (for link-based invites)
CREATE TABLE IF NOT EXISTS circle_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_circle_invites_token ON circle_invites(token);
CREATE INDEX IF NOT EXISTS idx_circle_invites_circle ON circle_invites(circle_id);

-- RLS
ALTER TABLE circle_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can view invites by token (for validation)
CREATE POLICY "Anyone can view invites by token" ON circle_invites
  FOR SELECT USING (true);

-- Circle admins can create invites
CREATE POLICY "Admins can create invites" ON circle_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_invites.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.invite_status = 'accepted'
    )
  );

-- Circle admins can update/deactivate invites
CREATE POLICY "Admins can update invites" ON circle_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_invites.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Notifications table (for in-app notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'circle_invite', 'circle_accepted', 'memory_shared', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}', -- Additional data (circle_id, inviter_name, etc.)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- System can create notifications (via service role or triggers)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Function to create notification when someone is invited to a circle
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_circle_invite()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  circle_name TEXT;
BEGIN
  -- Only notify for pending invites (not self-adds like owner)
  IF NEW.invite_status = 'pending' AND NEW.user_id != NEW.invited_by THEN
    -- Get inviter name
    SELECT full_name INTO inviter_name FROM profiles WHERE id = NEW.invited_by;
    
    -- Get circle name
    SELECT name INTO circle_name FROM circles WHERE id = NEW.circle_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'circle_invite',
      'Circle Invitation',
      inviter_name || ' invited you to join "' || circle_name || '"',
      jsonb_build_object(
        'circle_id', NEW.circle_id,
        'circle_name', circle_name,
        'inviter_id', NEW.invited_by,
        'inviter_name', inviter_name,
        'member_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for circle member invites
DROP TRIGGER IF EXISTS on_circle_member_invite ON circle_members;
CREATE TRIGGER on_circle_member_invite
  AFTER INSERT ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_circle_invite();
