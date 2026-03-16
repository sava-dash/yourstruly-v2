-- ============================================================================
-- Migration: Circle Events, Polls, Likes, Comments
-- Created: 2026-03-04
-- Description: Adds events/scheduling, polls, content likes and comments
--              to the circles feature.
-- ============================================================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE circle_event_rsvp_status AS ENUM ('going', 'maybe', 'not_going');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CIRCLE EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Time slots (JSONB array of {date, startTime, endTime})
  proposed_slots JSONB NOT NULL DEFAULT '[]',
  final_slot JSONB, -- The confirmed slot

  -- Status
  status TEXT NOT NULL DEFAULT 'voting' CHECK (status IN ('voting', 'confirmed', 'cancelled')),

  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CIRCLE EVENT RSVPs TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES circle_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RSVP status
  status circle_event_rsvp_status NOT NULL DEFAULT 'going',

  -- Slot availability votes (JSONB array of {slotIndex, available})
  slot_votes JSONB NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One RSVP per user per event
  UNIQUE(event_id, user_id)
);

-- ============================================
-- CIRCLE POLLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

  -- Poll details
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- Array of {id, text}
  multiple_choice BOOLEAN DEFAULT FALSE,
  anonymous BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  ends_at TIMESTAMPTZ,

  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CIRCLE POLL VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES circle_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The selected option ID (matches options JSONB)
  option_id TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For single-choice polls, enforce one vote per user via application logic
  -- For multiple-choice, one vote per option per user
  UNIQUE(poll_id, user_id, option_id)
);

-- ============================================
-- CIRCLE CONTENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_content_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES circle_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One like per user per content
  UNIQUE(content_id, user_id)
);

-- ============================================
-- CIRCLE CONTENT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circle_content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES circle_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Events
CREATE INDEX IF NOT EXISTS idx_circle_events_circle ON circle_events(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_events_created_by ON circle_events(created_by);
CREATE INDEX IF NOT EXISTS idx_circle_events_status ON circle_events(circle_id, status);

-- Event RSVPs
CREATE INDEX IF NOT EXISTS idx_circle_event_rsvps_event ON circle_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_circle_event_rsvps_user ON circle_event_rsvps(user_id);

-- Polls
CREATE INDEX IF NOT EXISTS idx_circle_polls_circle ON circle_polls(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_polls_created_by ON circle_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_circle_polls_active ON circle_polls(circle_id, status) WHERE status = 'active';

-- Poll Votes
CREATE INDEX IF NOT EXISTS idx_circle_poll_votes_poll ON circle_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_circle_poll_votes_user ON circle_poll_votes(user_id);

-- Content Likes
CREATE INDEX IF NOT EXISTS idx_circle_content_likes_content ON circle_content_likes(content_id);
CREATE INDEX IF NOT EXISTS idx_circle_content_likes_user ON circle_content_likes(user_id);

-- Content Comments
CREATE INDEX IF NOT EXISTS idx_circle_content_comments_content ON circle_content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_circle_content_comments_user ON circle_content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_content_comments_recent ON circle_content_comments(content_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE circle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_content_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: CIRCLE EVENTS
-- ============================================

CREATE POLICY "Members can view circle events" ON circle_events
  FOR SELECT USING (check_circle_membership(auth.uid(), circle_id));

CREATE POLICY "Members can create events" ON circle_events
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    check_circle_membership(auth.uid(), circle_id)
  );

CREATE POLICY "Creator or admin can update events" ON circle_events
  FOR UPDATE USING (
    auth.uid() = created_by OR
    check_circle_admin(auth.uid(), circle_id)
  );

CREATE POLICY "Creator or admin can delete events" ON circle_events
  FOR DELETE USING (
    auth.uid() = created_by OR
    check_circle_admin(auth.uid(), circle_id)
  );

-- ============================================
-- RLS POLICIES: CIRCLE EVENT RSVPs
-- ============================================

CREATE POLICY "Members can view event rsvps" ON circle_event_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_events ce
      WHERE ce.id = circle_event_rsvps.event_id
      AND check_circle_membership(auth.uid(), ce.circle_id)
    )
  );

CREATE POLICY "Members can rsvp to events" ON circle_event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM circle_events ce
      WHERE ce.id = circle_event_rsvps.event_id
      AND check_circle_membership(auth.uid(), ce.circle_id)
    )
  );

CREATE POLICY "Users can update own rsvp" ON circle_event_rsvps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rsvp" ON circle_event_rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: CIRCLE POLLS
-- ============================================

CREATE POLICY "Members can view circle polls" ON circle_polls
  FOR SELECT USING (check_circle_membership(auth.uid(), circle_id));

CREATE POLICY "Members can create polls" ON circle_polls
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    check_circle_membership(auth.uid(), circle_id)
  );

CREATE POLICY "Creator or admin can update polls" ON circle_polls
  FOR UPDATE USING (
    auth.uid() = created_by OR
    check_circle_admin(auth.uid(), circle_id)
  );

CREATE POLICY "Creator or admin can delete polls" ON circle_polls
  FOR DELETE USING (
    auth.uid() = created_by OR
    check_circle_admin(auth.uid(), circle_id)
  );

-- ============================================
-- RLS POLICIES: CIRCLE POLL VOTES
-- ============================================

CREATE POLICY "Members can view poll votes" ON circle_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_polls cp
      WHERE cp.id = circle_poll_votes.poll_id
      AND check_circle_membership(auth.uid(), cp.circle_id)
    )
  );

CREATE POLICY "Members can vote on polls" ON circle_poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM circle_polls cp
      WHERE cp.id = circle_poll_votes.poll_id
      AND cp.status = 'active'
      AND check_circle_membership(auth.uid(), cp.circle_id)
    )
  );

CREATE POLICY "Users can delete own poll votes" ON circle_poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: CIRCLE CONTENT LIKES
-- ============================================

CREATE POLICY "Members can view content likes" ON circle_content_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_content cc
      WHERE cc.id = circle_content_likes.content_id
      AND check_circle_membership(auth.uid(), cc.circle_id)
    )
  );

CREATE POLICY "Members can like content" ON circle_content_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM circle_content cc
      WHERE cc.id = circle_content_likes.content_id
      AND check_circle_membership(auth.uid(), cc.circle_id)
    )
  );

CREATE POLICY "Users can unlike content" ON circle_content_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: CIRCLE CONTENT COMMENTS
-- ============================================

CREATE POLICY "Members can view content comments" ON circle_content_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_content cc
      WHERE cc.id = circle_content_comments.content_id
      AND check_circle_membership(auth.uid(), cc.circle_id)
    )
  );

CREATE POLICY "Members can comment on content" ON circle_content_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM circle_content cc
      WHERE cc.id = circle_content_comments.content_id
      AND check_circle_membership(auth.uid(), cc.circle_id)
    )
  );

CREATE POLICY "Users can delete own comments" ON circle_content_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS circle_events_updated_at ON circle_events;
CREATE TRIGGER circle_events_updated_at
  BEFORE UPDATE ON circle_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS circle_event_rsvps_updated_at ON circle_event_rsvps;
CREATE TRIGGER circle_event_rsvps_updated_at
  BEFORE UPDATE ON circle_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE circle_events IS 'Scheduled events within circles with time slot voting';
COMMENT ON TABLE circle_event_rsvps IS 'RSVPs and slot availability votes for circle events';
COMMENT ON TABLE circle_polls IS 'Polls within circles for group decisions';
COMMENT ON TABLE circle_poll_votes IS 'Individual votes on poll options';
COMMENT ON TABLE circle_content_likes IS 'Likes on shared circle content';
COMMENT ON TABLE circle_content_comments IS 'Comments on shared circle content';
