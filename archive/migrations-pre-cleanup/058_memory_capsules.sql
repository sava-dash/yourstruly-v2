-- Memory Capsules Schema for YoursTruly V2
-- Curated collections of memories with themes and reorderable content

-- ============================================
-- MEMORY CAPSULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS memory_capsules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core fields
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    -- Memories (array of memory UUIDs in order)
    memory_ids UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Theme
    theme TEXT DEFAULT 'custom', -- travel, milestone, relationship, custom
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_memory_capsules_user ON memory_capsules(user_id);
CREATE INDEX idx_memory_capsules_theme ON memory_capsules(theme);
CREATE INDEX idx_memory_capsules_created ON memory_capsules(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE memory_capsules ENABLE ROW LEVEL SECURITY;

-- Users can only access their own capsules
CREATE POLICY "Users can manage own capsules" ON memory_capsules
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER memory_capsules_updated_at
    BEFORE UPDATE ON memory_capsules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
