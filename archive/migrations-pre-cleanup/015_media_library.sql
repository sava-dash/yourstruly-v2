-- Media Library & Smart Albums
-- Organize photos automatically, add context for XP

-- ============================================
-- MEDIA ITEMS (raw uploads, separate from memories)
-- ============================================
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File info
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  mime_type TEXT,
  file_size INTEGER,  -- bytes
  width INTEGER,
  height INTEGER,
  duration INTEGER,   -- seconds, for video
  
  -- Extracted metadata
  taken_at TIMESTAMPTZ,  -- From EXIF or upload time
  location_lat FLOAT,
  location_lng FLOAT,
  location_name TEXT,    -- Reverse geocoded
  exif_data JSONB,       -- Raw EXIF
  
  -- AI analysis (populated async)
  scene_tags TEXT[],     -- e.g., ['beach', 'sunset', 'group photo']
  detected_objects TEXT[],
  dominant_colors TEXT[],
  
  -- Processing
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  processing_error TEXT,
  
  -- Context (user-provided)
  has_backstory BOOLEAN DEFAULT false,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, file_key)
);

-- ============================================
-- MEDIA FACES (detected faces in photos)
-- ============================================
CREATE TABLE IF NOT EXISTS media_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Face data
  bounding_box JSONB NOT NULL,  -- {x, y, width, height} as percentages
  confidence FLOAT,             -- Detection confidence 0-1
  
  -- For face matching (embedding vector)
  face_embedding vector(128),   -- AWS Rekognition uses 128-dim
  
  -- Identification
  face_cluster_id UUID,         -- Links to face_clusters
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  confirmed_by_user BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FACE CLUSTERS (grouped similar faces)
-- ============================================
CREATE TABLE IF NOT EXISTS face_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identification
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT,  -- User-provided name or from contact
  
  -- Stats
  face_count INTEGER DEFAULT 0,
  representative_face_id UUID,  -- Best face to show as avatar
  
  -- Cluster quality
  avg_confidence FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key after table exists
ALTER TABLE media_faces 
  ADD CONSTRAINT media_faces_cluster_fk 
  FOREIGN KEY (face_cluster_id) REFERENCES face_clusters(id) ON DELETE SET NULL;

-- ============================================
-- SMART ALBUMS (auto-generated collections)
-- ============================================
CREATE TABLE IF NOT EXISTS smart_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Album info
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  
  -- Type and criteria
  album_type TEXT NOT NULL CHECK (album_type IN ('time', 'location', 'people', 'event', 'uncategorized', 'custom')),
  auto_generated BOOLEAN DEFAULT true,
  criteria JSONB,  -- { date_start, date_end, location_bounds, face_cluster_ids, etc. }
  
  -- Stats
  media_count INTEGER DEFAULT 0,
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SMART ALBUM ITEMS (photos in albums)
-- ============================================
CREATE TABLE IF NOT EXISTS smart_album_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES smart_albums(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  
  -- For manual ordering in custom albums
  sort_order INTEGER DEFAULT 0,
  
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(album_id, media_id)
);

-- ============================================
-- MEDIA BACKSTORIES (user-provided context)
-- ============================================
CREATE TABLE IF NOT EXISTS media_backstories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  caption TEXT,           -- Short (tweet-length)
  backstory TEXT,         -- Full story
  mood TEXT,              -- How they felt
  significance TEXT,      -- Why it matters
  
  -- Who's in it (beyond face detection)
  people_mentioned TEXT[],
  
  -- XP tracking
  xp_awarded INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACT COMPLETION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS contact_completion (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Completion flags
  has_name BOOLEAN DEFAULT false,
  has_contact_info BOOLEAN DEFAULT false,  -- email OR phone
  has_relationship BOOLEAN DEFAULT false,
  has_dob BOOLEAN DEFAULT false,
  has_address BOOLEAN DEFAULT false,
  
  -- Bonus awarded
  completion_bonus_awarded BOOLEAN DEFAULT false,
  bonus_awarded_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS media_items_user_idx ON media_items(user_id);
CREATE INDEX IF NOT EXISTS media_items_taken_at_idx ON media_items(taken_at DESC);
CREATE INDEX IF NOT EXISTS media_items_processing_idx ON media_items(processing_status);
CREATE INDEX IF NOT EXISTS media_items_location_idx ON media_items(location_lat, location_lng);

CREATE INDEX IF NOT EXISTS media_faces_media_idx ON media_faces(media_id);
CREATE INDEX IF NOT EXISTS media_faces_cluster_idx ON media_faces(face_cluster_id);
CREATE INDEX IF NOT EXISTS media_faces_contact_idx ON media_faces(contact_id);

CREATE INDEX IF NOT EXISTS face_clusters_user_idx ON face_clusters(user_id);
CREATE INDEX IF NOT EXISTS face_clusters_contact_idx ON face_clusters(contact_id);

CREATE INDEX IF NOT EXISTS smart_albums_user_idx ON smart_albums(user_id);
CREATE INDEX IF NOT EXISTS smart_albums_type_idx ON smart_albums(album_type);

CREATE INDEX IF NOT EXISTS smart_album_items_album_idx ON smart_album_items(album_id);
CREATE INDEX IF NOT EXISTS smart_album_items_media_idx ON smart_album_items(media_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_album_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_backstories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_completion ENABLE ROW LEVEL SECURITY;

-- Media items - own only
CREATE POLICY "Users can manage own media" ON media_items FOR ALL USING (auth.uid() = user_id);

-- Faces - own only
CREATE POLICY "Users can manage own faces" ON media_faces FOR ALL USING (auth.uid() = user_id);

-- Face clusters - own only
CREATE POLICY "Users can manage own clusters" ON face_clusters FOR ALL USING (auth.uid() = user_id);

-- Smart albums - own only
CREATE POLICY "Users can manage own albums" ON smart_albums FOR ALL USING (auth.uid() = user_id);

-- Album items - through album ownership
CREATE POLICY "Users can manage own album items" ON smart_album_items FOR ALL
  USING (album_id IN (SELECT id FROM smart_albums WHERE user_id = auth.uid()));

-- Backstories - own only
CREATE POLICY "Users can manage own backstories" ON media_backstories FOR ALL USING (auth.uid() = user_id);

-- Contact completion - own only
CREATE POLICY "Users can manage own contact completion" ON contact_completion FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Check and award contact completion bonus
CREATE OR REPLACE FUNCTION check_contact_completion(p_contact_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_complete BOOLEAN;
  v_already_awarded BOOLEAN;
BEGIN
  -- Get contact owner
  SELECT user_id INTO v_user_id FROM contacts WHERE id = p_contact_id;
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Check if already awarded
  SELECT completion_bonus_awarded INTO v_already_awarded 
  FROM contact_completion WHERE contact_id = p_contact_id;
  
  IF v_already_awarded THEN RETURN FALSE; END IF;
  
  -- Check completion criteria
  SELECT 
    (full_name IS NOT NULL AND full_name != '') AND
    (email IS NOT NULL OR phone IS NOT NULL) AND
    (relationship_type IS NOT NULL AND relationship_type != '') AND
    (date_of_birth IS NOT NULL) AND
    (city IS NOT NULL OR state IS NOT NULL OR country IS NOT NULL)
  INTO v_complete
  FROM contacts WHERE id = p_contact_id;
  
  IF NOT v_complete THEN RETURN FALSE; END IF;
  
  -- Update or insert completion record
  INSERT INTO contact_completion (contact_id, user_id, has_name, has_contact_info, has_relationship, has_dob, has_address, completion_bonus_awarded, bonus_awarded_at)
  VALUES (p_contact_id, v_user_id, true, true, true, true, true, true, NOW())
  ON CONFLICT (contact_id) DO UPDATE SET
    completion_bonus_awarded = true,
    bonus_awarded_at = NOW(),
    updated_at = NOW();
  
  -- Award XP (50 for complete contact)
  PERFORM award_xp(v_user_id, 50, 'contact_complete', 'Complete contact profile bonus');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award backstory XP
CREATE OR REPLACE FUNCTION award_backstory_xp(p_media_id UUID, p_has_caption BOOLEAN, p_has_backstory BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_existing_xp INTEGER;
  v_new_xp INTEGER := 0;
BEGIN
  -- Get owner and existing XP
  SELECT m.user_id, COALESCE(b.xp_awarded, 0) 
  INTO v_user_id, v_existing_xp
  FROM media_items m
  LEFT JOIN media_backstories b ON b.media_id = m.id
  WHERE m.id = p_media_id;
  
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  
  -- Calculate new XP to award
  IF p_has_caption AND v_existing_xp < 5 THEN
    v_new_xp := 5 - v_existing_xp;
  END IF;
  
  IF p_has_backstory AND v_existing_xp < 15 THEN
    v_new_xp := 15 - v_existing_xp;
  END IF;
  
  IF v_new_xp > 0 THEN
    PERFORM award_xp(v_user_id, v_new_xp, 'photo_backstory', 'Added context to photo');
    
    UPDATE media_backstories 
    SET xp_awarded = GREATEST(xp_awarded, CASE WHEN p_has_backstory THEN 15 ELSE 5 END)
    WHERE media_id = p_media_id;
  END IF;
  
  RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update smart album counts
CREATE OR REPLACE FUNCTION update_smart_album_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE smart_albums SET media_count = media_count + 1, updated_at = NOW()
    WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE smart_albums SET media_count = media_count - 1, updated_at = NOW()
    WHERE id = OLD.album_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER smart_album_count_trigger
  AFTER INSERT OR DELETE ON smart_album_items
  FOR EACH ROW EXECUTE FUNCTION update_smart_album_count();

-- Update face cluster counts
CREATE OR REPLACE FUNCTION update_face_cluster_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.face_cluster_id IS NOT NULL THEN
      UPDATE face_clusters 
      SET face_count = (SELECT COUNT(*) FROM media_faces WHERE face_cluster_id = NEW.face_cluster_id),
          updated_at = NOW()
      WHERE id = NEW.face_cluster_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.face_cluster_id IS NOT NULL THEN
      UPDATE face_clusters 
      SET face_count = (SELECT COUNT(*) FROM media_faces WHERE face_cluster_id = OLD.face_cluster_id),
          updated_at = NOW()
      WHERE id = OLD.face_cluster_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER face_cluster_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON media_faces
  FOR EACH ROW EXECUTE FUNCTION update_face_cluster_count();
