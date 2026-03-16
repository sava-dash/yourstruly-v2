-- Migration: RLS for Subscription Admin Tables
-- Description: Add RLS policies for subscription_plans, seat_pricing, feature_definitions
-- Date: 2026-02-27

-- =============================================================================
-- SUBSCRIPTION PLANS - Public Read
-- =============================================================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans (for pricing page)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Admin users can manage plans
CREATE POLICY "Admin users can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- =============================================================================
-- SEAT PRICING - Public Read
-- =============================================================================
ALTER TABLE seat_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can view seat pricing (for pricing calculator)
CREATE POLICY "Anyone can view seat pricing"
  ON seat_pricing
  FOR SELECT
  USING (true);

-- Admin users can manage seat pricing
CREATE POLICY "Admin users can manage seat pricing"
  ON seat_pricing
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- =============================================================================
-- FEATURE DEFINITIONS - Public Read
-- =============================================================================
ALTER TABLE feature_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone can view feature definitions (for feature comparison)
CREATE POLICY "Anyone can view feature definitions"
  ON feature_definitions
  FOR SELECT
  USING (true);

-- Admin users can manage feature definitions
CREATE POLICY "Admin users can manage feature definitions"
  ON feature_definitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON POLICY "Anyone can view active subscription plans" ON subscription_plans 
  IS 'Public can see active plans for pricing page';
COMMENT ON POLICY "Anyone can view seat pricing" ON seat_pricing 
  IS 'Public can see seat pricing for family plan calculator';
COMMENT ON POLICY "Anyone can view feature definitions" ON feature_definitions 
  IS 'Public can see features for plan comparison';
