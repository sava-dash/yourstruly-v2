-- Widget positions for draggable dashboard
-- Stores user's custom layout preferences

CREATE TABLE IF NOT EXISTS widget_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,  -- e.g., 'interests', 'skills', 'contacts'
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, widget_id)
);

-- Enable RLS
ALTER TABLE widget_positions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own widget positions
CREATE POLICY "Users can view own widget positions" ON widget_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget positions" ON widget_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget positions" ON widget_positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget positions" ON widget_positions
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX widget_positions_user_idx ON widget_positions(user_id);

-- Auto-update timestamp
CREATE TRIGGER widget_positions_updated_at 
  BEFORE UPDATE ON widget_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
