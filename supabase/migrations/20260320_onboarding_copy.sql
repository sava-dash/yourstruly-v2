-- ============================================================================
-- Onboarding copy management — admin-editable text for onboarding flow
-- Created: 2026-03-20
-- Purpose: Allow admins to edit onboarding text in real-time via admin panel
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_copy (
  id TEXT PRIMARY KEY, -- e.g., 'globe.welcome.greeting', 'globe.places.title'
  value TEXT NOT NULL,
  description TEXT, -- admin hint about where this text appears
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: anyone can read (needed by onboarding), only admins can write
ALTER TABLE onboarding_copy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read onboarding copy"
  ON onboarding_copy FOR SELECT
  USING (true);

CREATE POLICY "Admins can update onboarding copy"
  ON onboarding_copy FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default copy values
INSERT INTO onboarding_copy (id, value, description) VALUES
  -- Globe welcome card
  ('globe.welcome.greeting', 'Hi {name} 👋', 'Welcome greeting on globe (supports {name} placeholder)'),
  ('globe.welcome.headline', 'We look forward to hearing more about this adventure.', 'Welcome headline below greeting'),
  ('globe.welcome.button', 'Let''s begin', 'Button text on welcome card'),
  
  -- Places lived
  ('globe.places.title_first', 'Have you lived anywhere else?', 'Places card title (first time)'),
  ('globe.places.title_more', 'Anywhere else?', 'Places card title (after adding a place)'),
  ('globe.places.greeting', 'Your life journey 🌍', 'Places card greeting label'),
  ('globe.places.input_placeholder', 'City or town name...', 'Location input placeholder'),
  ('globe.places.when_placeholder', 'When did you move there? (e.g. Summer 2015)', 'When input placeholder'),
  ('globe.places.button_first', 'Add Place', 'Button text (first place)'),
  ('globe.places.button_more', 'Add Another', 'Button text (subsequent places)'),
  ('globe.places.done', 'I''m done', 'Done button text'),
  ('globe.places.skip', 'Skip', 'Skip button text'),
  
  -- Adventure message
  ('globe.adventure.greeting', 'What a journey ✨', 'Adventure message greeting'),
  ('globe.adventure.headline', 'You''ve lived in so many amazing places, I can''t wait to hear more about your adventures.', 'Adventure message headline'),
  ('globe.adventure.button', 'Continue', 'Adventure message button'),
  
  -- Contacts
  ('globe.contacts.greeting', 'Your people 👨‍👩‍👧‍👦', 'Contacts card greeting'),
  ('globe.contacts.headline', 'Who are the important people in your life?', 'Contacts card headline'),
  ('globe.contacts.panel_title', 'Family, Friends & Loved Ones', 'Contacts panel title'),
  ('globe.contacts.panel_subtitle', 'Add the people who matter most', 'Contacts panel subtitle'),
  ('globe.contacts.name_placeholder', 'Name', 'Name input placeholder'),
  ('globe.contacts.relation_placeholder', 'Relationship...', 'Relationship dropdown placeholder'),
  ('globe.contacts.add_button', '+ Add Person', 'Add person button'),
  
  -- Interests
  ('globe.interests.greeting', 'Your interests 💡', 'Interests card greeting'),
  ('globe.interests.headline', 'What are you into?', 'Interests card headline'),
  ('globe.interests.panel_title', 'Your Interests', 'Interests panel title'),
  ('globe.interests.panel_subtitle', 'Pick what you''re into', 'Interests panel subtitle'),
  ('globe.interests.custom_placeholder', 'Add your own...', 'Custom interest input placeholder'),
  
  -- Why are you here
  ('globe.whyhere.panel_title', 'Why are you here? 💭', 'Why here panel title'),
  ('globe.whyhere.panel_subtitle', 'What brought you to YoursTruly? What do you hope to preserve?', 'Why here panel subtitle'),
  ('globe.whyhere.placeholder', 'I''m here because...', 'Why here textarea placeholder'),
  
  -- Progress bar labels
  ('globe.progress.map', 'Map', 'Progress bar: map step label'),
  ('globe.progress.places', 'Places', 'Progress bar: places step label'),
  ('globe.progress.contacts', 'People', 'Progress bar: contacts/people step label'),
  ('globe.progress.interests', 'Interests', 'Progress bar: interests step label'),
  ('globe.progress.whyhere', 'Why', 'Progress bar: why-here step label'),
  
  -- Buttons (shared)
  ('globe.button.continue', 'Continue', 'Default continue button text'),
  ('globe.button.skip', 'Skip', 'Default skip button text')
ON CONFLICT (id) DO NOTHING;
