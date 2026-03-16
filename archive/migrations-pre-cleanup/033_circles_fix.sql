-- Quick fix for existing policies/indexes - run this first if you got errors

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view their circles" ON circles;
DROP POLICY IF EXISTS "Users can create circles" ON circles;
DROP POLICY IF EXISTS "Admins can update circles" ON circles;
DROP POLICY IF EXISTS "Members can view circle members" ON circle_members;
DROP POLICY IF EXISTS "Admins can add members" ON circle_members;
DROP POLICY IF EXISTS "Members can update membership" ON circle_members;
DROP POLICY IF EXISTS "Members can view circle votes" ON circle_votes;
DROP POLICY IF EXISTS "Admins can create votes" ON circle_votes;
DROP POLICY IF EXISTS "Initiator can update vote" ON circle_votes;
DROP POLICY IF EXISTS "Members can view vote responses" ON circle_vote_responses;
DROP POLICY IF EXISTS "Admins can vote" ON circle_vote_responses;
DROP POLICY IF EXISTS "Members can view circle messages" ON circle_messages;
DROP POLICY IF EXISTS "Members can send messages" ON circle_messages;
DROP POLICY IF EXISTS "Senders can delete messages" ON circle_messages;
DROP POLICY IF EXISTS "Members can view circle content" ON circle_content;
DROP POLICY IF EXISTS "Members can share content" ON circle_content;
DROP POLICY IF EXISTS "Sharers can remove content" ON circle_content;
DROP POLICY IF EXISTS "Members can view circle postscripts" ON circle_postscripts;
DROP POLICY IF EXISTS "Owners can create circle postscripts" ON circle_postscripts;
DROP POLICY IF EXISTS "Owners can update circle postscripts" ON circle_postscripts;
DROP POLICY IF EXISTS "Users can view own, shared, and circle memories" ON memories;
DROP POLICY IF EXISTS "Users can create own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;
DROP POLICY IF EXISTS "Users can view own and circle knowledge" ON knowledge_entries;

-- Drop existing indexes (they'll be recreated)
DROP INDEX IF EXISTS idx_circles_created_by;
DROP INDEX IF EXISTS idx_circles_not_deleted;
DROP INDEX IF EXISTS idx_circle_members_circle;
DROP INDEX IF EXISTS idx_circle_members_user;
DROP INDEX IF EXISTS idx_circle_members_status;
DROP INDEX IF EXISTS idx_circle_members_role;
DROP INDEX IF EXISTS idx_circle_members_active;
DROP INDEX IF EXISTS idx_circle_members_invite_token;
DROP INDEX IF EXISTS idx_circle_votes_circle;
DROP INDEX IF EXISTS idx_circle_votes_initiated_by;
DROP INDEX IF EXISTS idx_circle_votes_status;
DROP INDEX IF EXISTS idx_circle_votes_open;
DROP INDEX IF EXISTS idx_circle_vote_responses_vote;
DROP INDEX IF EXISTS idx_circle_vote_responses_admin;
DROP INDEX IF EXISTS idx_circle_messages_circle;
DROP INDEX IF EXISTS idx_circle_messages_sender;
DROP INDEX IF EXISTS idx_circle_messages_recent;
DROP INDEX IF EXISTS idx_circle_content_circle;
DROP INDEX IF EXISTS idx_circle_content_type;
DROP INDEX IF EXISTS idx_circle_content_shared_by;
DROP INDEX IF EXISTS idx_circle_content_ref;
DROP INDEX IF EXISTS idx_circle_postscripts_postscript;
DROP INDEX IF EXISTS idx_circle_postscripts_circle;
DROP INDEX IF EXISTS idx_circle_postscripts_status;
DROP INDEX IF EXISTS idx_circle_postscripts_pending;
DROP INDEX IF EXISTS idx_memories_circle;
DROP INDEX IF EXISTS idx_memories_scope;
DROP INDEX IF EXISTS idx_knowledge_circle;
DROP INDEX IF EXISTS idx_knowledge_scope;

-- Now you can run 033_circles.sql again
