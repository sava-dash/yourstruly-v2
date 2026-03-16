-- Fix circle messages - ensure table and RLS policies exist
-- Run this in Supabase Dashboard SQL Editor

-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION check_circle_membership(p_user_id UUID, p_circle_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM circle_members
    WHERE user_id = p_user_id
    AND circle_id = p_circle_id
    AND invite_status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create circle_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  reply_to_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,
  
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT circle_message_content_required CHECK (
    content IS NOT NULL OR media_url IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_sender ON circle_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_recent ON circle_messages(circle_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- Enable RLS
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Members can view circle messages" ON circle_messages;
DROP POLICY IF EXISTS "Members can send messages" ON circle_messages;
DROP POLICY IF EXISTS "Senders can update messages" ON circle_messages;
DROP POLICY IF EXISTS "Senders can delete messages" ON circle_messages;

-- RLS Policies
CREATE POLICY "Members can view circle messages" ON circle_messages
  FOR SELECT USING (
    check_circle_membership(auth.uid(), circle_id) AND
    is_deleted = FALSE
  );

CREATE POLICY "Members can send messages" ON circle_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    check_circle_membership(auth.uid(), circle_id)
  );

CREATE POLICY "Senders can update messages" ON circle_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON circle_messages TO authenticated;
