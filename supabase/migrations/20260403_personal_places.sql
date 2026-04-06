CREATE TABLE IF NOT EXISTS personal_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  aliases text[] DEFAULT '{}',
  address text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  linked_contact_id uuid,
  use_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_places_user ON personal_places(user_id);
ALTER TABLE personal_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own places" ON personal_places FOR ALL USING (auth.uid() = user_id);
