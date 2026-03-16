-- YoursTruly V2 - Subscription System Schema
-- Stripe integration for billing and subscriptions

-- ============================================
-- PLANS (subscription tiers)
-- ============================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Plan Details
  name TEXT NOT NULL, -- Free, Pro, Family
  description TEXT,
  stripe_price_id TEXT UNIQUE, -- Stripe Price ID (nullable for free plan)
  
  -- Pricing (for display purposes, Stripe is source of truth)
  price_monthly INTEGER, -- in cents
  price_yearly INTEGER, -- in cents (null if no yearly option)
  currency TEXT DEFAULT 'usd',
  
  -- Features (stored as JSONB for flexibility)
  features JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "Memory Storage", "value": "Unlimited", "icon": "hard_drive"},
  --   {"name": "AI Interviews", "value": "10/month", "icon": "mic"},
  --   {"name": "Family Members", "value": "3", "icon": "users"},
  --   {"name": "Video Messages", "value": "25/year", "icon": "video"},
  --   {"name": "AI Chat Access", "value": "Basic", "icon": "message_circle"}
  -- ]
  
  -- Limits (enforced in application layer)
  limits JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "memories_per_month": -1, -- -1 means unlimited
  --   "storage_gb": 10,
  --   "ai_interviews": 10,
  --   "family_members": 3,
  --   "video_messages": 25,
  --   "postscripts": 5
  -- }
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS (user subscription status)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id), -- null if not on a plan
  
  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Subscription Status
  status TEXT NOT NULL DEFAULT 'incomplete', 
  -- possible values: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused
  
  -- Billing Details
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD STRIPE CUSTOMER ID TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES plans(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans: Public read for active plans
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

-- Subscriptions: Users can only access their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Only service role can insert/delete subscriptions (via webhooks)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to sync subscription status to profiles
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profile with current subscription info
  UPDATE profiles 
  SET 
    subscription_status = CASE 
      WHEN NEW.status IN ('active', 'trialing') THEN 'active'
      WHEN NEW.status = 'canceled' AND NEW.current_period_end > NOW() THEN 'active' -- Grace period
      WHEN NEW.status = 'past_due' THEN 'past_due'
      ELSE 'free'
    END,
    current_plan_id = NEW.plan_id,
    stripe_customer_id = NEW.stripe_customer_id
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_profile();

-- ============================================
-- SEED PLANS (Placeholder - update with real Stripe IDs later)
-- ============================================

INSERT INTO plans (name, description, price_monthly, price_yearly, features, limits, sort_order, is_popular) VALUES
(
  'Free',
  'Get started with basic memory capture',
  0,
  null,
  '[
    {"name": "Memory Storage", "value": "50 memories", "icon": "hard_drive"},
    {"name": "Storage", "value": "1 GB", "icon": "cloud"},
    {"name": "AI Interviews", "value": "3 total", "icon": "mic"},
    {"name": "Family Members", "value": "1 (you)", "icon": "user"},
    {"name": "AI Chat", "value": "Basic only", "icon": "message_circle"}
  ]'::jsonb,
  '{"memories_per_month": 50, "storage_gb": 1, "ai_interviews": 3, "family_members": 1, "video_messages": 0, "postscripts": 1}'::jsonb,
  1,
  false
),
(
  'Pro',
  'For individuals serious about preserving their legacy',
  999, -- $9.99/month
  9990, -- $99.90/year (2 months free)
  '[
    {"name": "Memory Storage", "value": "Unlimited", "icon": "hard_drive"},
    {"name": "Storage", "value": "50 GB", "icon": "cloud"},
    {"name": "AI Interviews", "value": "Unlimited", "icon": "mic"},
    {"name": "Family Members", "value": "3 people", "icon": "users"},
    {"name": "Video Messages", "value": "25/year", "icon": "video"},
    {"name": "AI Chat", "value": "Advanced", "icon": "message_circle"},
    {"name": "Export", "value": "PDF & Video", "icon": "download"},
    {"name": "Priority Support", "value": "Email", "icon": "mail"}
  ]'::jsonb,
  '{"memories_per_month": -1, "storage_gb": 50, "ai_interviews": -1, "family_members": 3, "video_messages": 25, "postscripts": 10}'::jsonb,
  2,
  true
),
(
  'Family',
  'Capture your entire family''s stories together',
  1999, -- $19.99/month
  19990, -- $199.90/year (2 months free)
  '[
    {"name": "Memory Storage", "value": "Unlimited", "icon": "hard_drive"},
    {"name": "Storage", "value": "200 GB", "icon": "cloud"},
    {"name": "AI Interviews", "value": "Unlimited", "icon": "mic"},
    {"name": "Family Members", "value": "10 people", "icon": "users"},
    {"name": "Video Messages", "value": "100/year", "icon": "video"},
    {"name": "AI Chat", "value": "Advanced", "icon": "message_circle"},
    {"name": "Export", "value": "PDF, Video & Family Tree", "icon": "download"},
    {"name": "Priority Support", "value": "Email & Chat", "icon": "mail"},
    {"name": "Shared Albums", "value": "Unlimited", "icon": "image"},
    {"name": "Legacy Planning", "value": "Full Access", "icon": "scroll"}
  ]'::jsonb,
  '{"memories_per_month": -1, "storage_gb": 200, "ai_interviews": -1, "family_members": 10, "video_messages": 100, "postscripts": 50}'::jsonb,
  3,
  false
);
