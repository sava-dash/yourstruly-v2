-- Add challenge streak tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS challenge_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_challenge_week TEXT;
