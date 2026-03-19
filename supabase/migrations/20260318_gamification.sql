-- Site Config (stores admin-editable JSON config)
CREATE TABLE IF NOT EXISTS site_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site config" ON site_config FOR SELECT USING (true);
CREATE POLICY "Admins can update site config" ON site_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Weekly Challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  challenge_type text NOT NULL,
  challenge_label text NOT NULL,
  challenge_emoji text NOT NULL DEFAULT '🎯',
  target_count int NOT NULL DEFAULT 3,
  current_count int NOT NULL DEFAULT 0,
  xp_reward int NOT NULL DEFAULT 50,
  week_start date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_user_week ON weekly_challenges(user_id, week_start);

ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON weekly_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON weekly_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON weekly_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_emoji text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
