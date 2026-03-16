-- XP & Gamification System
-- Duolingo-inspired engagement mechanics

-- ============================================
-- USER XP STATS
-- ============================================
CREATE TABLE IF NOT EXISTS user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- XP Balance
  total_xp INTEGER DEFAULT 0,
  available_xp INTEGER DEFAULT 0,  -- Spendable (total minus spent)
  
  -- Level (calculated from total_xp)
  level INTEGER DEFAULT 1,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_freezes INTEGER DEFAULT 0,  -- Available freezes
  
  -- PostScript balance
  postscripts_available INTEGER DEFAULT 3,  -- Free users start with 3
  postscripts_used INTEGER DEFAULT 0,
  
  -- Subscription (simple flag for now)
  is_premium BOOLEAN DEFAULT false,
  premium_refresh_date DATE,  -- When monthly PostScripts refresh
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- XP TRANSACTIONS (ledger)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount INTEGER NOT NULL,  -- Positive = earned, negative = spent
  action TEXT NOT NULL,     -- 'daily_login', 'add_memory', 'buy_postscript', etc.
  description TEXT,
  
  -- Reference to related entity (optional)
  reference_type TEXT,      -- 'memory', 'contact', 'postscript', etc.
  reference_id UUID,
  
  -- Balance after transaction
  balance_after INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STREAK HISTORY (daily log)
-- ============================================
CREATE TABLE IF NOT EXISTS streak_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL,  -- What counted for this day
  streak_day INTEGER NOT NULL,   -- Which day of streak this was
  freeze_used BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, activity_date)
);

-- ============================================
-- LEAGUES (weekly competition groups)
-- ============================================
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Type: 'public' (auto-assigned) or 'private' (friend groups)
  league_type TEXT DEFAULT 'public' CHECK (league_type IN ('public', 'private')),
  
  -- Private league settings
  invite_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Weekly stats (reset every Sunday)
  weekly_xp INTEGER DEFAULT 0,
  week_start DATE NOT NULL,  -- Start of current tracking week
  
  -- Ranking
  rank INTEGER,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(league_id, user_id)
);

-- ============================================
-- PROFILE COMPLETION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS profile_completion_xp (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,  -- 'interests', 'skills', 'bio', etc.
  xp_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, section)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS xp_transactions_user_idx ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS xp_transactions_created_idx ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS streak_log_user_date_idx ON streak_log(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS league_members_league_idx ON league_members(league_id);
CREATE INDEX IF NOT EXISTS league_members_weekly_idx ON league_members(league_id, weekly_xp DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_completion_xp ENABLE ROW LEVEL SECURITY;

-- User XP - own data only
CREATE POLICY "Users can view own xp" ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own xp" ON user_xp FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert xp" ON user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions - own only
CREATE POLICY "Users can view own transactions" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streak log - own only
CREATE POLICY "Users can view own streaks" ON streak_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert streaks" ON streak_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leagues - members can see their leagues
CREATE POLICY "Users can view leagues they belong to" ON leagues FOR SELECT 
  USING (
    league_type = 'public' OR 
    id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create private leagues" ON leagues FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- League members - can see members of own leagues
CREATE POLICY "Users can view league members" ON league_members FOR SELECT
  USING (league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can join leagues" ON league_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave leagues" ON league_members FOR DELETE
  USING (auth.uid() = user_id);

-- Profile completion - own only
CREATE POLICY "Users can view own completion" ON profile_completion_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert completion" ON profile_completion_xp FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate level from total XP (every 1000 XP = 1 level)
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(xp / 1000) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Award XP to user
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
  new_available INTEGER;
BEGIN
  -- Update user_xp
  INSERT INTO user_xp (user_id, total_xp, available_xp)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_xp.total_xp + p_amount,
    available_xp = user_xp.available_xp + p_amount,
    level = calculate_level(user_xp.total_xp + p_amount),
    updated_at = NOW()
  RETURNING available_xp INTO new_available;
  
  -- Get new total
  SELECT total_xp INTO new_total FROM user_xp WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO xp_transactions (user_id, amount, action, description, reference_type, reference_id, balance_after)
  VALUES (p_user_id, p_amount, p_action, p_description, p_reference_type, p_reference_id, new_available);
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Spend XP
CREATE OR REPLACE FUNCTION spend_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_available INTEGER;
BEGIN
  -- Check balance
  SELECT available_xp INTO current_available FROM user_xp WHERE user_id = p_user_id;
  
  IF current_available IS NULL OR current_available < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct XP
  UPDATE user_xp 
  SET available_xp = available_xp - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction (negative amount)
  INSERT INTO xp_transactions (user_id, amount, action, description, balance_after)
  VALUES (p_user_id, -p_amount, p_action, p_description, current_available - p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record daily activity and update streak
CREATE OR REPLACE FUNCTION record_daily_activity(
  p_user_id UUID,
  p_activity_type TEXT
)
RETURNS TABLE(streak INTEGER, xp_earned INTEGER) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_xp_earned INTEGER := 0;
  v_already_logged BOOLEAN;
BEGIN
  -- Check if already logged today
  SELECT EXISTS(SELECT 1 FROM streak_log WHERE user_id = p_user_id AND activity_date = v_today)
  INTO v_already_logged;
  
  IF v_already_logged THEN
    -- Return current streak, no new XP
    SELECT current_streak INTO v_current_streak FROM user_xp WHERE user_id = p_user_id;
    RETURN QUERY SELECT COALESCE(v_current_streak, 0), 0;
    RETURN;
  END IF;
  
  -- Get current streak info
  SELECT last_activity_date, current_streak 
  INTO v_last_activity, v_current_streak
  FROM user_xp WHERE user_id = p_user_id;
  
  -- Calculate new streak
  IF v_last_activity IS NULL OR v_last_activity < v_today - INTERVAL '1 day' THEN
    -- Streak broken or first activity
    v_new_streak := 1;
  ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Streak continues
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    -- Same day (shouldn't happen due to check above)
    v_new_streak := v_current_streak;
  END IF;
  
  -- Update user_xp
  INSERT INTO user_xp (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, v_new_streak, v_new_streak, v_today)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(user_xp.longest_streak, v_new_streak),
    last_activity_date = v_today,
    updated_at = NOW();
  
  -- Log streak
  INSERT INTO streak_log (user_id, activity_date, activity_type, streak_day)
  VALUES (p_user_id, v_today, p_activity_type, v_new_streak);
  
  -- Award daily XP (10 base + 5 streak bonus)
  v_xp_earned := 10 + 5;
  PERFORM award_xp(p_user_id, v_xp_earned, 'daily_activity', 'Daily activity + streak bonus');
  
  -- Check for streak milestones
  IF v_new_streak = 7 THEN
    PERFORM award_xp(p_user_id, 50, 'streak_milestone', '7-day streak bonus!');
    v_xp_earned := v_xp_earned + 50;
  ELSIF v_new_streak = 30 THEN
    PERFORM award_xp(p_user_id, 200, 'streak_milestone', '30-day streak bonus!');
    v_xp_earned := v_xp_earned + 200;
  ELSIF v_new_streak = 100 THEN
    PERFORM award_xp(p_user_id, 500, 'streak_milestone', '100-day streak bonus!');
    v_xp_earned := v_xp_earned + 500;
  ELSIF v_new_streak = 365 THEN
    PERFORM award_xp(p_user_id, 2000, 'streak_milestone', '365-day streak bonus!');
    v_xp_earned := v_xp_earned + 2000;
  END IF;
  
  RETURN QUERY SELECT v_new_streak, v_xp_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize user_xp on profile creation
CREATE OR REPLACE FUNCTION init_user_xp()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_xp (user_id, postscripts_available)
  VALUES (NEW.id, 3)  -- Free users start with 3 PostScripts
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_init_xp
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION init_user_xp();
