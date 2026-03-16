-- Quick fix: Drop existing policies before 051 runs
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own seats" ON subscription_seats;
DROP POLICY IF EXISTS "Users can view own storage" ON storage_usage;
