-- YoursTruly V2 - Phase 1 Schema
-- User Profiles, Contacts, Pets

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zipcode TEXT,
  
  -- Personality & Identity
  biography TEXT,
  personal_motto TEXT,  -- Their credo/life motto
  personality_type TEXT,  -- e.g., INTJ, Enneagram
  personality_traits TEXT[],  -- Array of traits
  
  -- Interests & Skills
  interests TEXT[],
  skills TEXT[],
  hobbies TEXT[],
  
  -- Life Goals
  life_goals TEXT[],
  bucket_list_summary TEXT,
  
  -- Beliefs
  religions TEXT[],
  political_views TEXT,
  values TEXT[],
  
  -- Career
  occupation TEXT,
  company TEXT,
  industry TEXT,
  career_history JSONB,  -- [{title, company, from, to}]
  
  -- Social
  social_links JSONB,  -- {instagram, twitter, linkedin, etc}
  
  -- Preferences
  favorite_quote TEXT,
  favorite_books TEXT[],
  favorite_movies TEXT[],
  favorite_music TEXT[],
  favorite_foods TEXT[],
  
  -- Avatar
  avatar_url TEXT,
  cover_image_url TEXT,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACTS (family, friends, colleagues)
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  
  -- Relationship
  relationship_type TEXT NOT NULL,  -- mother, father, friend, spouse, etc.
  relationship_details TEXT,  -- How you met, etc.
  
  -- Dates
  date_of_birth DATE,
  anniversary DATE,  -- Wedding anniversary, friendship anniversary, etc.
  
  -- Location
  city TEXT,
  state TEXT,
  country TEXT,
  
  -- Social
  social_links JSONB,
  
  -- Photo
  avatar_url TEXT,
  
  -- For Video Journalist feature (Phase 3)
  can_receive_questions BOOLEAN DEFAULT true,
  preferred_contact_method TEXT DEFAULT 'sms',  -- sms, email, call
  
  -- Metadata
  is_deceased BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PETS
-- ============================================
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  species TEXT NOT NULL,  -- dog, cat, bird, etc.
  breed TEXT,
  
  -- Dates
  date_of_birth DATE,
  adoption_date DATE,
  
  -- Details
  color TEXT,
  personality TEXT,
  favorite_things TEXT[],
  medical_notes TEXT,
  
  -- Photo
  avatar_url TEXT,
  
  -- Status
  is_deceased BOOLEAN DEFAULT false,
  date_of_passing DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RELATIONSHIP TYPES (reference data)
-- ============================================
CREATE TABLE relationship_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,  -- family, friend, professional, other
  sort_order INTEGER DEFAULT 0
);

-- Seed relationship types
INSERT INTO relationship_types (id, label, category, sort_order) VALUES
  ('mother', 'Mother', 'family', 1),
  ('father', 'Father', 'family', 2),
  ('spouse', 'Spouse', 'family', 3),
  ('partner', 'Partner', 'family', 4),
  ('son', 'Son', 'family', 5),
  ('daughter', 'Daughter', 'family', 6),
  ('brother', 'Brother', 'family', 7),
  ('sister', 'Sister', 'family', 8),
  ('grandmother', 'Grandmother', 'family', 9),
  ('grandfather', 'Grandfather', 'family', 10),
  ('grandson', 'Grandson', 'family', 11),
  ('granddaughter', 'Granddaughter', 'family', 12),
  ('aunt', 'Aunt', 'family', 13),
  ('uncle', 'Uncle', 'family', 14),
  ('cousin', 'Cousin', 'family', 15),
  ('niece', 'Niece', 'family', 16),
  ('nephew', 'Nephew', 'family', 17),
  ('in_law', 'In-Law', 'family', 18),
  ('step_parent', 'Step Parent', 'family', 19),
  ('step_child', 'Step Child', 'family', 20),
  ('best_friend', 'Best Friend', 'friend', 30),
  ('close_friend', 'Close Friend', 'friend', 31),
  ('friend', 'Friend', 'friend', 32),
  ('childhood_friend', 'Childhood Friend', 'friend', 33),
  ('colleague', 'Colleague', 'professional', 40),
  ('boss', 'Boss', 'professional', 41),
  ('mentor', 'Mentor', 'professional', 42),
  ('mentee', 'Mentee', 'professional', 43),
  ('business_partner', 'Business Partner', 'professional', 44),
  ('neighbor', 'Neighbor', 'other', 50),
  ('other', 'Other', 'other', 99);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Contacts: Users can only access their own contacts
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Pets: Users can only access their own pets
CREATE POLICY "Users can view own pets" ON pets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pets" ON pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON pets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON pets
  FOR DELETE USING (auth.uid() = user_id);

-- Relationship types: Public read
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read relationship types" ON relationship_types
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
