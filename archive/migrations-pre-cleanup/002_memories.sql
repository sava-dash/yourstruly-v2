-- Memories & Media Schema for YoursTruly V2
-- Run after 001_initial_schema.sql

-- ============================================
-- MEMORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core fields
    title TEXT,
    description TEXT,
    memory_date DATE,
    memory_type TEXT DEFAULT 'moment', -- moment, milestone, trip, celebration, everyday
    
    -- Location
    location_name TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    
    -- AI Analysis (populated by Rekognition)
    ai_summary TEXT,              -- AI-generated description
    ai_mood TEXT,                 -- happy, nostalgic, adventurous, etc.
    ai_category TEXT,             -- travel, family, celebration, nature, etc.
    ai_labels JSONB DEFAULT '[]', -- Raw labels from Rekognition
    
    -- Metadata
    is_favorite BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORY MEDIA TABLE (photos/videos)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File info
    file_url TEXT NOT NULL,
    file_key TEXT NOT NULL,        -- S3/Supabase storage key
    file_type TEXT NOT NULL,       -- image, video
    mime_type TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    duration INTEGER,              -- For videos (seconds)
    
    -- AI Analysis
    ai_labels JSONB DEFAULT '[]',  -- Rekognition labels
    ai_faces JSONB DEFAULT '[]',   -- Detected face bounding boxes
    ai_text JSONB DEFAULT '[]',    -- Detected text (OCR)
    ai_moderation JSONB,           -- Content moderation
    ai_dominant_colors JSONB,      -- Color palette
    ai_processed BOOLEAN DEFAULT FALSE,
    
    -- EXIF data
    taken_at TIMESTAMPTZ,
    exif_lat DECIMAL(10, 8),
    exif_lng DECIMAL(11, 8),
    camera_make TEXT,
    camera_model TEXT,
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FACE TAGS (people in photos)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_face_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES memory_media(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Who is tagged
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Self tag
    
    -- Face position (bounding box as percentages)
    box_left DECIMAL(5, 4),
    box_top DECIMAL(5, 4),
    box_width DECIMAL(5, 4),
    box_height DECIMAL(5, 4),
    
    -- Rekognition face ID for matching
    aws_face_id TEXT,
    confidence DECIMAL(5, 2),
    
    -- Manual vs auto
    is_auto_detected BOOLEAN DEFAULT FALSE,
    is_confirmed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tagged_person CHECK (
        contact_id IS NOT NULL OR profile_id IS NOT NULL
    )
);

-- ============================================
-- FACE INDEX (for Rekognition collection)
-- ============================================
CREATE TABLE IF NOT EXISTS face_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- AWS Rekognition data
    aws_face_id TEXT NOT NULL,
    aws_collection_id TEXT NOT NULL,
    source_media_id UUID REFERENCES memory_media(id) ON DELETE SET NULL,
    
    -- Thumbnail of indexed face
    face_thumbnail_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, aws_face_id)
);

-- ============================================
-- MEMORY ALBUMS (smart & manual)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    cover_media_id UUID REFERENCES memory_media(id) ON DELETE SET NULL,
    
    -- Smart album criteria (if smart)
    is_smart BOOLEAN DEFAULT FALSE,
    smart_criteria JSONB,  -- { "type": "person", "contact_id": "..." }
                           -- { "type": "location", "location": "Paris" }
                           -- { "type": "year", "year": 2024 }
                           -- { "type": "category", "category": "travel" }
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALBUM MEMORIES (manual album assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS album_memories (
    album_id UUID NOT NULL REFERENCES memory_albums(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (album_id, memory_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_date ON memories(memory_date DESC);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_category ON memories(ai_category);
CREATE INDEX idx_memories_location ON memories(location_lat, location_lng) WHERE location_lat IS NOT NULL;

CREATE INDEX idx_memory_media_memory ON memory_media(memory_id);
CREATE INDEX idx_memory_media_user ON memory_media(user_id);
CREATE INDEX idx_memory_media_taken ON memory_media(taken_at DESC);

CREATE INDEX idx_face_tags_media ON memory_face_tags(media_id);
CREATE INDEX idx_face_tags_contact ON memory_face_tags(contact_id);

CREATE INDEX idx_face_index_user ON face_index(user_id);
CREATE INDEX idx_face_index_contact ON face_index(contact_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_face_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_memories ENABLE ROW LEVEL SECURITY;

-- Memories: users can only access their own
CREATE POLICY "Users can manage own memories" ON memories
    FOR ALL USING (auth.uid() = user_id);

-- Media: users can only access their own
CREATE POLICY "Users can manage own media" ON memory_media
    FOR ALL USING (auth.uid() = user_id);

-- Face tags: users can only access their own
CREATE POLICY "Users can manage own face tags" ON memory_face_tags
    FOR ALL USING (auth.uid() = user_id);

-- Face index: users can only access their own
CREATE POLICY "Users can manage own face index" ON face_index
    FOR ALL USING (auth.uid() = user_id);

-- Albums: users can only access their own
CREATE POLICY "Users can manage own albums" ON memory_albums
    FOR ALL USING (auth.uid() = user_id);

-- Album memories: users can only access their own albums
CREATE POLICY "Users can manage own album memories" ON album_memories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM memory_albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER albums_updated_at
    BEFORE UPDATE ON memory_albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
