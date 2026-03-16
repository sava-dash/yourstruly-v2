-- ============================================
-- YoursTruly V2 Subscription System
-- ============================================
-- Free: 10GB limit, restricted features, full marketplace prices
-- Premium: $20/mo, unlimited features, membership prices, 1 free seat
-- Seats: 3-5 = $8/mo each, 6-10 = $6/mo each
-- ============================================

-- Subscription plans (admin-editable)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'premium'
  display_name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0, -- monthly price in cents
  storage_limit_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10GB default
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}', -- feature flags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seat pricing tiers (admin-editable)
CREATE TABLE IF NOT EXISTS seat_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_seat INTEGER NOT NULL, -- starting seat number
  max_seat INTEGER NOT NULL, -- ending seat number
  price_cents INTEGER NOT NULL, -- monthly price per seat
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_seat_range CHECK (min_seat <= max_seat)
);

-- Feature definitions (what can be toggled)
CREATE TABLE IF NOT EXISTS feature_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- 'ai_chat', 'video_memories', 'marketplace_discount', etc.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- 'core', 'ai', 'storage', 'marketplace', 'social'
  default_free BOOLEAN DEFAULT false,
  default_premium BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  storage_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subscription seats (for premium family sharing)
CREATE TABLE IF NOT EXISTS subscription_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL, -- 1 = owner, 2 = free included, 3-10 = paid
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT, -- for pending invites
  invite_token TEXT,
  invite_sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'removed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, seat_number),
  UNIQUE(subscription_id, email)
);

-- Storage tracking by content type
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'video', 'image', 'audio', 'document'
  file_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_key)
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_cents, storage_limit_bytes, features) VALUES
  ('free', 'Free', 'Get started with YoursTruly', 0, 10737418240, '{"ai_chat": false, "video_memories": true, "interview_requests": 3, "marketplace_discount": 0}'),
  ('premium', 'Premium', 'Full access to all features', 2000, 107374182400, '{"ai_chat": true, "video_memories": true, "interview_requests": -1, "marketplace_discount": 20}')
ON CONFLICT (name) DO NOTHING;

-- Insert seat pricing tiers
INSERT INTO seat_pricing (min_seat, max_seat, price_cents) VALUES
  (1, 2, 0),     -- Owner + 1 free seat
  (3, 5, 800),   -- $8/month each
  (6, 10, 600)   -- $6/month each
ON CONFLICT DO NOTHING;

-- Insert feature definitions
INSERT INTO feature_definitions (key, name, description, category, default_free, default_premium) VALUES
  ('ai_chat', 'AI Chat', 'Chat with digital essence', 'ai', false, true),
  ('ai_followups', 'AI Follow-up Questions', 'AI-generated interview follow-ups', 'ai', false, true),
  ('video_memories', 'Video Memories', 'Record and store video memories', 'core', true, true),
  ('audio_memories', 'Audio Memories', 'Record and store audio memories', 'core', true, true),
  ('image_memories', 'Photo Memories', 'Upload photos and images', 'core', true, true),
  ('interview_unlimited', 'Unlimited Interviews', 'Send unlimited interview requests', 'social', false, true),
  ('future_messages', 'Future Messages', 'Schedule messages for future delivery', 'core', true, true),
  ('future_gifts', 'Future Gifts', 'Schedule gifts for future delivery', 'marketplace', false, true),
  ('marketplace_discount', 'Marketplace Discount', 'Member pricing on marketplace items', 'marketplace', false, true),
  ('export_data', 'Export Data', 'Export all memories and data', 'core', false, true),
  ('priority_support', 'Priority Support', 'Priority customer support', 'general', false, true),
  ('custom_themes', 'Custom Themes', 'Customize appearance with themes', 'general', false, true),
  ('shared_memories', 'Shared Memories', 'Share memories with family seats', 'social', false, true),
  ('advanced_search', 'Advanced Search', 'Search across all memories', 'core', true, true),
  ('wisdom_categories', 'Wisdom Categories', 'Organize wisdom by category', 'core', true, true)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_seats_user ON subscription_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_seats_email ON subscription_seats(email);
CREATE INDEX IF NOT EXISTS idx_storage_usage_user ON storage_usage(user_id);

-- Function to calculate user's total storage
CREATE OR REPLACE FUNCTION get_user_storage_bytes(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(size_bytes) FROM storage_usage WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has feature access
CREATE OR REPLACE FUNCTION user_has_feature(p_user_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_features JSONB;
  v_plan_name TEXT;
BEGIN
  -- Get user's plan features
  SELECT sp.features, sp.name INTO v_plan_features, v_plan_name
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id AND us.status = 'active';
  
  -- If no subscription, check if they're a seat holder
  IF v_plan_features IS NULL THEN
    SELECT sp.features, sp.name INTO v_plan_features, v_plan_name
    FROM subscription_seats ss
    JOIN user_subscriptions us ON us.id = ss.subscription_id
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE ss.user_id = p_user_id AND ss.status = 'active' AND us.status = 'active';
  END IF;
  
  -- Still no subscription = free tier
  IF v_plan_features IS NULL THEN
    SELECT default_free INTO v_plan_features FROM feature_definitions WHERE key = p_feature_key;
    RETURN COALESCE((v_plan_features)::boolean, false);
  END IF;
  
  -- Check feature in plan
  RETURN COALESCE((v_plan_features->>p_feature_key)::boolean, false);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view seats for their subscription
DROP POLICY IF EXISTS "Users can view own seats" ON subscription_seats;
CREATE POLICY "Users can view own seats"
  ON subscription_seats FOR SELECT
  USING (
    subscription_id IN (SELECT id FROM user_subscriptions WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Users can view their storage usage
DROP POLICY IF EXISTS "Users can view own storage" ON storage_usage;
CREATE POLICY "Users can view own storage"
  ON storage_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger to update storage_used_bytes on user_subscriptions
CREATE OR REPLACE FUNCTION update_subscription_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_subscriptions 
    SET storage_used_bytes = storage_used_bytes + NEW.size_bytes,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_subscriptions 
    SET storage_used_bytes = storage_used_bytes - OLD.size_bytes,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storage_usage_update ON storage_usage;
CREATE TRIGGER storage_usage_update
AFTER INSERT OR DELETE ON storage_usage
FOR EACH ROW EXECUTE FUNCTION update_subscription_storage();

COMMENT ON TABLE subscription_plans IS 'Subscription tier definitions (admin-editable pricing)';
COMMENT ON TABLE seat_pricing IS 'Per-seat pricing tiers for premium plans';
COMMENT ON TABLE feature_definitions IS 'Feature flags that can be toggled per plan';
COMMENT ON TABLE user_subscriptions IS 'User subscription records with Stripe integration';
COMMENT ON TABLE subscription_seats IS 'Family seats for premium subscriptions';
COMMENT ON TABLE storage_usage IS 'Per-file storage tracking for usage limits';
