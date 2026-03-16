-- ============================================================================
-- Migration: Pet Species + Profile Extensions
-- Created: 2026-02-20
-- Description: Fix pet species dropdown + add profile fields for personalization
-- ============================================================================

-- ============================================================================
-- PET SPECIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pet_species (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER DEFAULT 50
);

-- Seed pet species
INSERT INTO pet_species (id, label, emoji, sort_order) VALUES
  ('dog', 'Dog', '🐕', 1),
  ('cat', 'Cat', '🐈', 2),
  ('bird', 'Bird', '🐦', 3),
  ('fish', 'Fish', '🐟', 4),
  ('rabbit', 'Rabbit', '🐰', 5),
  ('hamster', 'Hamster', '🐹', 6),
  ('guinea_pig', 'Guinea Pig', '🐹', 7),
  ('turtle', 'Turtle', '🐢', 8),
  ('snake', 'Snake', '🐍', 9),
  ('lizard', 'Lizard', '🦎', 10),
  ('horse', 'Horse', '🐴', 11),
  ('chicken', 'Chicken', '🐔', 12),
  ('duck', 'Duck', '🦆', 13),
  ('goat', 'Goat', '🐐', 14),
  ('pig', 'Pig', '🐷', 15),
  ('cow', 'Cow', '🐄', 16),
  ('ferret', 'Ferret', '🦦', 17),
  ('hedgehog', 'Hedgehog', '🦔', 18),
  ('parrot', 'Parrot', '🦜', 19),
  ('other', 'Other', '🐾', 99)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- UPDATE PETS TABLE
-- ============================================================================

-- Ensure species column references pet_species
-- First check if constraint exists
DO $$
BEGIN
  -- Add species as text if needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pets' AND column_name = 'species'
  ) THEN
    ALTER TABLE pets ADD COLUMN species TEXT;
  END IF;
END $$;

-- ============================================================================
-- PROFILE EXTENSIONS FOR PERSONALIZATION
-- ============================================================================

-- Ensure these columns exist for engagement bubble personalization
-- (Some may already exist based on what we saw in the UI)

-- Interests array
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Skills array  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Hobbies array (may be separate from interests)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';

-- Personality traits array
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS personality TEXT[] DEFAULT '{}';

-- Religion (for faith-based prompts)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS religion TEXT;

-- Life goals array
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS life_goals TEXT[] DEFAULT '{}';

-- Personal credo/motto
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credo TEXT;

-- ============================================================================
-- PREDEFINED OPTIONS TABLES
-- ============================================================================

-- Interests options
CREATE TABLE IF NOT EXISTS interest_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT,
  category TEXT, -- 'creative', 'active', 'intellectual', etc.
  sort_order INTEGER DEFAULT 50
);

INSERT INTO interest_options (id, label, emoji, category, sort_order) VALUES
  -- Creative
  ('music', 'Music', '🎵', 'creative', 1),
  ('art', 'Art', '🎨', 'creative', 2),
  ('writing', 'Writing', '✍️', 'creative', 3),
  ('photography', 'Photography', '📷', 'creative', 4),
  ('crafts', 'Crafts', '🧶', 'creative', 5),
  ('theater', 'Theater', '🎭', 'creative', 6),
  ('dance', 'Dance', '💃', 'creative', 7),
  
  -- Active
  ('sports', 'Sports', '⚽', 'active', 10),
  ('fitness', 'Fitness', '💪', 'active', 11),
  ('hiking', 'Hiking', '🥾', 'active', 12),
  ('yoga', 'Yoga', '🧘', 'active', 13),
  ('swimming', 'Swimming', '🏊', 'active', 14),
  ('cycling', 'Cycling', '🚴', 'active', 15),
  
  -- Intellectual
  ('reading', 'Reading', '📚', 'intellectual', 20),
  ('history', 'History', '📜', 'intellectual', 21),
  ('science', 'Science', '🔬', 'intellectual', 22),
  ('technology', 'Technology', '💻', 'intellectual', 23),
  ('philosophy', 'Philosophy', '🤔', 'intellectual', 24),
  ('languages', 'Languages', '🗣️', 'intellectual', 25),
  
  -- Lifestyle
  ('cooking', 'Cooking', '👨‍🍳', 'lifestyle', 30),
  ('gardening', 'Gardening', '🌱', 'lifestyle', 31),
  ('travel', 'Travel', '✈️', 'lifestyle', 32),
  ('fashion', 'Fashion', '👗', 'lifestyle', 33),
  ('home_decor', 'Home Decor', '🏠', 'lifestyle', 34),
  
  -- Nature
  ('nature', 'Nature', '🌿', 'nature', 40),
  ('animals', 'Animals', '🐾', 'nature', 41),
  ('birdwatching', 'Birdwatching', '🦅', 'nature', 42),
  ('stargazing', 'Stargazing', '⭐', 'nature', 43),
  
  -- Games
  ('board_games', 'Board Games', '🎲', 'games', 50),
  ('video_games', 'Video Games', '🎮', 'games', 51),
  ('puzzles', 'Puzzles', '🧩', 'games', 52),
  ('cards', 'Card Games', '🃏', 'games', 53),
  
  -- Social
  ('volunteering', 'Volunteering', '🤝', 'social', 60),
  ('community', 'Community', '👥', 'social', 61),
  ('mentoring', 'Mentoring', '👨‍🏫', 'social', 62)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Skills options
CREATE TABLE IF NOT EXISTS skill_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 50
);

INSERT INTO skill_options (id, label, category, sort_order) VALUES
  ('leadership', 'Leadership', 'professional', 1),
  ('communication', 'Communication', 'professional', 2),
  ('problem_solving', 'Problem Solving', 'professional', 3),
  ('creativity', 'Creativity', 'professional', 4),
  ('teamwork', 'Teamwork', 'professional', 5),
  ('time_management', 'Time Management', 'professional', 6),
  ('public_speaking', 'Public Speaking', 'professional', 7),
  ('negotiation', 'Negotiation', 'professional', 8),
  ('teaching', 'Teaching', 'professional', 9),
  ('writing', 'Writing', 'professional', 10),
  ('technical', 'Technical Skills', 'professional', 11),
  ('analytical', 'Analytical Thinking', 'professional', 12),
  ('empathy', 'Empathy', 'personal', 20),
  ('patience', 'Patience', 'personal', 21),
  ('listening', 'Active Listening', 'personal', 22),
  ('adaptability', 'Adaptability', 'personal', 23),
  ('resilience', 'Resilience', 'personal', 24)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Religion options
CREATE TABLE IF NOT EXISTS religion_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 50
);

INSERT INTO religion_options (id, label, sort_order) VALUES
  ('christian', 'Christian', 1),
  ('catholic', 'Catholic', 2),
  ('protestant', 'Protestant', 3),
  ('jewish', 'Jewish', 4),
  ('muslim', 'Muslim', 5),
  ('hindu', 'Hindu', 6),
  ('buddhist', 'Buddhist', 7),
  ('sikh', 'Sikh', 8),
  ('spiritual', 'Spiritual but not religious', 9),
  ('agnostic', 'Agnostic', 10),
  ('atheist', 'Atheist', 11),
  ('other', 'Other', 98),
  ('prefer_not_to_say', 'Prefer not to say', 99)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Personality options
CREATE TABLE IF NOT EXISTS personality_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  opposite_id TEXT, -- For spectrum traits
  sort_order INTEGER DEFAULT 50
);

INSERT INTO personality_options (id, label, opposite_id, sort_order) VALUES
  ('introvert', 'Introvert', 'extrovert', 1),
  ('extrovert', 'Extrovert', 'introvert', 2),
  ('optimistic', 'Optimistic', 'realistic', 3),
  ('realistic', 'Realistic', 'optimistic', 4),
  ('analytical', 'Analytical', 'intuitive', 5),
  ('intuitive', 'Intuitive', 'analytical', 6),
  ('creative', 'Creative', NULL, 7),
  ('practical', 'Practical', NULL, 8),
  ('adventurous', 'Adventurous', 'cautious', 9),
  ('cautious', 'Cautious', 'adventurous', 10),
  ('empathetic', 'Empathetic', NULL, 11),
  ('energetic', 'Energetic', 'calm', 12),
  ('calm', 'Calm', 'energetic', 13),
  ('organized', 'Organized', 'spontaneous', 14),
  ('spontaneous', 'Spontaneous', 'organized', 15),
  ('curious', 'Curious', NULL, 16),
  ('patient', 'Patient', NULL, 17),
  ('determined', 'Determined', NULL, 18)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  opposite_id = EXCLUDED.opposite_id,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- RLS FOR NEW TABLES
-- ============================================================================

-- Pet species - public read
ALTER TABLE pet_species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pet species" ON pet_species FOR SELECT USING (TRUE);

-- Interest options - public read
ALTER TABLE interest_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view interest options" ON interest_options FOR SELECT USING (TRUE);

-- Skill options - public read
ALTER TABLE skill_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view skill options" ON skill_options FOR SELECT USING (TRUE);

-- Religion options - public read
ALTER TABLE religion_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view religion options" ON religion_options FOR SELECT USING (TRUE);

-- Personality options - public read
ALTER TABLE personality_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view personality options" ON personality_options FOR SELECT USING (TRUE);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_religion ON profiles(religion) WHERE religion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_profiles_hobbies ON profiles USING GIN(hobbies);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pet_species IS 'Predefined pet species for dropdown';
COMMENT ON TABLE interest_options IS 'Predefined interest options for profile';
COMMENT ON TABLE skill_options IS 'Predefined skill options for profile';
COMMENT ON TABLE religion_options IS 'Religion options for faith-based prompts';
COMMENT ON TABLE personality_options IS 'Personality trait options';
