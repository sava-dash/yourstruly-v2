-- Add education_level column to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Also ensure all the other columns the generate function needs exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_traits TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_goals TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_books TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_movies TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_music TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_foods TEXT[] DEFAULT '{}';
