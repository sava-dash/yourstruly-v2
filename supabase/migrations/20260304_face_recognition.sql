-- Face Recognition: Face clusters for automatic grouping
-- Allows grouping detected faces into named people clusters

-- ============================================
-- FACES TABLE (Person Clusters)
-- ============================================
CREATE TABLE IF NOT EXISTS faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identity
    name TEXT,                              -- User-assigned name (null if unnamed)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,  -- Link to contact
    
    -- Representative embedding (centroid of cluster)
    representative_embedding vector(128),
    
    -- Thumbnail (cropped face from best quality detection)
    thumbnail_url TEXT,
    thumbnail_media_id UUID REFERENCES memory_media(id) ON DELETE SET NULL,
    
    -- Stats
    face_count INTEGER DEFAULT 0,           -- Number of detected instances
    
    -- Metadata
    is_hidden BOOLEAN DEFAULT FALSE,        -- Hide from browse view
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add face_id to memory_face_tags for cluster membership
ALTER TABLE memory_face_tags
    ADD COLUMN IF NOT EXISTS face_id UUID REFERENCES faces(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_faces_user ON faces(user_id);
CREATE INDEX IF NOT EXISTS idx_faces_contact ON faces(contact_id);
CREATE INDEX IF NOT EXISTS idx_faces_embedding ON faces USING ivfflat (representative_embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_face_tags_face ON memory_face_tags(face_id);

-- RLS policies
ALTER TABLE faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own faces" ON faces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own faces" ON faces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own faces" ON faces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own faces" ON faces
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Find or create face cluster for a given embedding
CREATE OR REPLACE FUNCTION find_or_create_face_cluster(
    p_user_id UUID,
    p_embedding vector(128),
    p_media_id UUID,
    p_threshold FLOAT DEFAULT 0.55
)
RETURNS UUID AS $$
DECLARE
    v_face_id UUID;
    v_similarity FLOAT;
BEGIN
    -- Find best matching face cluster
    SELECT f.id, 1 - (f.representative_embedding <=> p_embedding) as sim
    INTO v_face_id, v_similarity
    FROM faces f
    WHERE f.user_id = p_user_id
      AND f.representative_embedding IS NOT NULL
    ORDER BY f.representative_embedding <=> p_embedding
    LIMIT 1;
    
    -- If no match above threshold, create new cluster
    IF v_face_id IS NULL OR v_similarity < p_threshold THEN
        INSERT INTO faces (user_id, representative_embedding, thumbnail_media_id, face_count)
        VALUES (p_user_id, p_embedding, p_media_id, 1)
        RETURNING id INTO v_face_id;
    ELSE
        -- Update face count
        UPDATE faces 
        SET face_count = face_count + 1,
            updated_at = NOW()
        WHERE id = v_face_id;
    END IF;
    
    RETURN v_face_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Merge two face clusters (combine into first)
CREATE OR REPLACE FUNCTION merge_face_clusters(
    p_user_id UUID,
    p_keep_face_id UUID,
    p_merge_face_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM faces WHERE id = p_keep_face_id AND user_id = p_user_id)
       OR NOT EXISTS (SELECT 1 FROM faces WHERE id = p_merge_face_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Face clusters not found or not owned by user';
    END IF;
    
    -- Update all face tags to point to kept cluster
    UPDATE memory_face_tags
    SET face_id = p_keep_face_id
    WHERE face_id = p_merge_face_id;
    
    -- Update face count
    UPDATE faces
    SET face_count = (
        SELECT COUNT(*) FROM memory_face_tags WHERE face_id = p_keep_face_id
    ),
    updated_at = NOW()
    WHERE id = p_keep_face_id;
    
    -- Delete merged cluster
    DELETE FROM faces WHERE id = p_merge_face_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get faces with memory counts for browse view
CREATE OR REPLACE FUNCTION get_faces_with_stats(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    contact_id UUID,
    thumbnail_url TEXT,
    face_count INTEGER,
    memory_count BIGINT,
    latest_memory_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.contact_id,
        f.thumbnail_url,
        f.face_count,
        COUNT(DISTINCT mm.memory_id) as memory_count,
        MAX(m.memory_date) as latest_memory_date
    FROM faces f
    LEFT JOIN memory_face_tags mft ON mft.face_id = f.id
    LEFT JOIN memory_media mm ON mm.id = mft.media_id
    LEFT JOIN memories m ON m.id = mm.memory_id
    WHERE f.user_id = p_user_id
      AND f.is_hidden = FALSE
    GROUP BY f.id
    ORDER BY memory_count DESC, f.face_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_or_create_face_cluster TO authenticated;
GRANT EXECUTE ON FUNCTION merge_face_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION get_faces_with_stats TO authenticated;
