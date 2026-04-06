-- Add total_xp column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp int NOT NULL DEFAULT 0;

-- Create xp_events table for audit trail
CREATE TABLE IF NOT EXISTS xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,          -- e.g. 'prompt_answered', 'challenge_completed', 'badge_earned'
  source_id text,                -- optional reference to the prompt/challenge/badge
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created ON xp_events(user_id, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own xp events" ON xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp events" ON xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to atomically add XP (prevents race conditions)
CREATE OR REPLACE FUNCTION add_user_xp(p_user_id uuid, p_amount int, p_reason text, p_source_id text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total int;
BEGIN
  -- Atomically increment xp on the profiles row
  UPDATE profiles
  SET total_xp = total_xp + p_amount
  WHERE id = p_user_id
  RETURNING total_xp INTO new_total;

  -- Log the event
  INSERT INTO xp_events (user_id, amount, reason, source_id)
  VALUES (p_user_id, p_amount, p_reason, p_source_id);

  RETURN COALESCE(new_total, 0);
END;
$$;
