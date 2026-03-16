-- PostScript Memory and Wisdom Attachments
-- Add ability to attach memories and wisdom entries to PostScripts

-- ============================================
-- POSTSCRIPT MEMORY ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS postscript_memory_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata about the memory at time of attachment
    memory_title TEXT,
    memory_date DATE,
    memory_image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTSCRIPT WISDOM ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS postscript_wisdom_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    wisdom_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE, -- wisdom stored in memories table with type='wisdom'
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata about the wisdom at time of attachment
    wisdom_title TEXT,
    wisdom_category TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_postscript_memories_postscript ON postscript_memory_attachments(postscript_id);
CREATE INDEX IF NOT EXISTS idx_postscript_memories_memory ON postscript_memory_attachments(memory_id);
CREATE INDEX IF NOT EXISTS idx_postscript_wisdom_postscript ON postscript_wisdom_attachments(postscript_id);
CREATE INDEX IF NOT EXISTS idx_postscript_wisdom_wisdom ON postscript_wisdom_attachments(wisdom_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE postscript_memory_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE postscript_wisdom_attachments ENABLE ROW LEVEL SECURITY;

-- Users can only manage memory attachments for their own postscripts
DROP POLICY IF EXISTS "Users can manage own postscript memory attachments" ON postscript_memory_attachments;
CREATE POLICY "Users can manage own postscript memory attachments" ON postscript_memory_attachments
    FOR ALL USING (user_id = auth.uid());

-- Users can only manage wisdom attachments for their own postscripts
DROP POLICY IF EXISTS "Users can manage own postscript wisdom attachments" ON postscript_wisdom_attachments;
CREATE POLICY "Users can manage own postscript wisdom attachments" ON postscript_wisdom_attachments
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- UPDATE POSTSCRIPT GET API TO INCLUDE ATTACHMENTS
-- ============================================

-- Add a view to get postscripts with their memory and wisdom attachments
CREATE OR REPLACE VIEW postscripts_with_attachments AS
SELECT 
    p.*,
    COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object(
            'id', m.id,
            'memory_id', m.memory_id,
            'title', m.memory_title,
            'memory_date', m.memory_date,
            'image_url', m.memory_image_url
        )) FILTER (WHERE m.id IS NOT NULL),
        '[]'::jsonb
    ) as attached_memories,
    COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object(
            'id', w.id,
            'wisdom_id', w.wisdom_id,
            'title', w.wisdom_title,
            'category', w.wisdom_category
        )) FILTER (WHERE w.id IS NOT NULL),
        '[]'::jsonb
    ) as attached_wisdom
FROM postscripts p
LEFT JOIN postscript_memory_attachments m ON m.postscript_id = p.id
LEFT JOIN postscript_wisdom_attachments w ON w.postscript_id = p.id
GROUP BY p.id;
