-- Migration: Postscript Credits System
-- Description: Enhanced postscript limits with purchase tracking
-- Date: 2026-02-27

-- =============================================================================
-- POSTSCRIPT CREDITS TABLE
-- Tracks credits separate from user_xp for better accounting
-- =============================================================================
CREATE TABLE IF NOT EXISTS postscript_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Credit source
  source TEXT NOT NULL CHECK (source IN ('initial', 'purchase', 'xp_trade', 'monthly_refresh', 'admin_grant', 'refund')),
  
  -- Amount (positive = credit, negative = usage)
  amount INTEGER NOT NULL,
  
  -- For purchases
  price_cents INTEGER,
  stripe_payment_id TEXT,
  bundle_type TEXT, -- '1_pack', '5_pack'
  
  -- For XP trades
  xp_spent INTEGER,
  
  -- Reference to postscript if this was a usage
  postscript_id UUID REFERENCES postscripts(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS postscript_credits_user_idx ON postscript_credits(user_id);
CREATE INDEX IF NOT EXISTS postscript_credits_created_idx ON postscript_credits(created_at DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE postscript_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view own credits" 
  ON postscript_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- System inserts via functions
CREATE POLICY "System can insert credits" 
  ON postscript_credits FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admin can manage all
CREATE POLICY "Admin can manage credits"
  ON postscript_credits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get user's current credit balance
CREATE OR REPLACE FUNCTION get_postscript_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_credits INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_credits
  FROM postscript_credits
  WHERE user_id = p_user_id;
  
  RETURN total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get detailed credit info (for subscription seats)
CREATE OR REPLACE FUNCTION get_postscript_credit_info(p_user_id UUID)
RETURNS TABLE(
  total_credits INTEGER,
  used_this_month INTEGER,
  is_premium BOOLEAN,
  seat_count INTEGER,
  monthly_allowance INTEGER,
  next_refresh_date DATE
) AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_seat_count INTEGER;
  v_subscription_id UUID;
  v_period_start DATE;
BEGIN
  -- Get subscription info
  SELECT 
    us.id,
    CASE WHEN sp.name = 'premium' AND us.status = 'active' THEN true ELSE false END,
    us.current_period_start::date
  INTO v_subscription_id, v_is_premium, v_period_start
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  LIMIT 1;
  
  -- Default period start to beginning of current month
  IF v_period_start IS NULL THEN
    v_period_start := date_trunc('month', CURRENT_DATE)::date;
  END IF;
  
  -- Count seats (including self)
  IF v_subscription_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_seat_count
    FROM subscription_seats
    WHERE subscription_id = v_subscription_id AND status = 'active';
    v_seat_count := GREATEST(v_seat_count, 1);
  ELSE
    v_seat_count := 1;
  END IF;
  
  RETURN QUERY SELECT
    get_postscript_credits(p_user_id),
    COALESCE((
      SELECT -SUM(amount) 
      FROM postscript_credits 
      WHERE user_id = p_user_id 
        AND amount < 0 
        AND created_at >= v_period_start
    )::INTEGER, 0),
    COALESCE(v_is_premium, false),
    v_seat_count,
    CASE WHEN COALESCE(v_is_premium, false) THEN v_seat_count * 3 ELSE 0 END,
    (v_period_start + INTERVAL '1 month')::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use a postscript credit
CREATE OR REPLACE FUNCTION use_postscript_credit(
  p_user_id UUID,
  p_postscript_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Created postscript'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Check balance
  SELECT get_postscript_credits(p_user_id) INTO current_credits;
  
  IF current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credit
  INSERT INTO postscript_credits (user_id, source, amount, postscript_id, description)
  VALUES (p_user_id, 'initial', -1, p_postscript_id, p_description);
  
  -- Also update user_xp for backwards compatibility
  UPDATE user_xp 
  SET postscripts_available = GREATEST(postscripts_available - 1, 0),
      postscripts_used = postscripts_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add purchased credits
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_price_cents INTEGER,
  p_bundle_type TEXT,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO postscript_credits (
    user_id, source, amount, price_cents, bundle_type, stripe_payment_id, description
  )
  VALUES (
    p_user_id, 'purchase', p_amount, p_price_cents, p_bundle_type, p_stripe_payment_id,
    format('Purchased %s postscript(s) - %s bundle', p_amount, p_bundle_type)
  );
  
  -- Update user_xp for backwards compatibility
  UPDATE user_xp 
  SET postscripts_available = postscripts_available + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trade XP for postscript credit
CREATE OR REPLACE FUNCTION trade_xp_for_postscript(
  p_user_id UUID,
  p_xp_cost INTEGER DEFAULT 200
)
RETURNS BOOLEAN AS $$
DECLARE
  current_xp INTEGER;
BEGIN
  -- Check XP balance
  SELECT available_xp INTO current_xp FROM user_xp WHERE user_id = p_user_id;
  
  IF current_xp IS NULL OR current_xp < p_xp_cost THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct XP
  UPDATE user_xp 
  SET available_xp = available_xp - p_xp_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description, balance_after)
  VALUES (p_user_id, -p_xp_cost, 'xp_trade_postscript', 'Traded XP for postscript credit', current_xp - p_xp_cost);
  
  -- Add credit
  INSERT INTO postscript_credits (user_id, source, amount, xp_spent, description)
  VALUES (p_user_id, 'xp_trade', 1, p_xp_cost, format('Traded %s XP for 1 postscript credit', p_xp_cost));
  
  -- Update user_xp for backwards compatibility
  UPDATE user_xp 
  SET postscripts_available = postscripts_available + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh monthly credits for premium users
CREATE OR REPLACE FUNCTION refresh_monthly_postscript_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_seat_count INTEGER;
  v_subscription_id UUID;
  v_credits_to_add INTEGER;
BEGIN
  -- Get subscription info
  SELECT 
    us.id,
    CASE WHEN sp.name = 'premium' AND us.status = 'active' THEN true ELSE false END
  INTO v_subscription_id, v_is_premium
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  LIMIT 1;
  
  IF NOT COALESCE(v_is_premium, false) THEN
    RETURN 0;
  END IF;
  
  -- Count seats
  SELECT COUNT(*) INTO v_seat_count
  FROM subscription_seats
  WHERE subscription_id = v_subscription_id AND status = 'active';
  v_seat_count := GREATEST(v_seat_count, 1);
  
  -- Calculate credits (3 per seat)
  v_credits_to_add := v_seat_count * 3;
  
  -- Add credits
  INSERT INTO postscript_credits (user_id, source, amount, description)
  VALUES (p_user_id, 'monthly_refresh', v_credits_to_add, 
          format('Monthly refresh: %s credits for %s seat(s)', v_credits_to_add, v_seat_count));
  
  -- Update user_xp
  UPDATE user_xp 
  SET postscripts_available = postscripts_available + v_credits_to_add,
      premium_refresh_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN v_credits_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATE EXISTING DATA
-- =============================================================================
-- Give initial credits to existing users who haven't used the new system
INSERT INTO postscript_credits (user_id, source, amount, description)
SELECT 
  user_id, 
  'initial', 
  GREATEST(postscripts_available, 0),
  'Initial credits from migration'
FROM user_xp
WHERE NOT EXISTS (
  SELECT 1 FROM postscript_credits pc WHERE pc.user_id = user_xp.user_id
)
AND postscripts_available > 0;

-- Record usage for existing users
INSERT INTO postscript_credits (user_id, source, amount, description)
SELECT 
  user_id, 
  'initial', 
  -postscripts_used,
  'Historical usage from migration'
FROM user_xp
WHERE NOT EXISTS (
  SELECT 1 FROM postscript_credits pc WHERE pc.user_id = user_xp.user_id AND pc.amount < 0
)
AND postscripts_used > 0;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE postscript_credits IS 'Ledger for postscript credits - tracks all credits/debits';
COMMENT ON FUNCTION get_postscript_credits IS 'Returns total available postscript credits for a user';
COMMENT ON FUNCTION get_postscript_credit_info IS 'Returns detailed credit info including subscription status';
COMMENT ON FUNCTION use_postscript_credit IS 'Deducts one credit when user creates a postscript';
COMMENT ON FUNCTION add_purchased_credits IS 'Adds credits from a purchase';
COMMENT ON FUNCTION trade_xp_for_postscript IS 'Trades XP for postscript credits (200 XP = 1 credit)';
COMMENT ON FUNCTION refresh_monthly_postscript_credits IS 'Adds monthly credits for premium users (3 per seat)';
