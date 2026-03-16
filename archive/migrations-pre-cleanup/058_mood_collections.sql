-- Mood-Based Collections for Memories
-- Adds mood tagging with AI analysis and manual override

-- ============================================
-- MOOD ENUM TYPE
-- ============================================
DO $$ BEGIN
    CREATE TYPE mood_type AS ENUM (
        'joyful',      -- Yellow - happiness, celebration, laughter
        'proud',       -- Purple - achievements, milestones, accomplishments
        'grateful',    -- Green - thankfulness, appreciation, blessings
        'bittersweet', -- Orange - nostalgia mixed with sadness, loss
        'peaceful',    -- Blue - calm, serene, tranquil moments
        'nostalgic',   -- Amber - fond memories, reminiscence
        'loving'       -- Pink - love, affection, connection
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ADD MOOD COLUMN TO MEMORIES
-- ============================================
-- Note: ai_mood column already exists as TEXT, we'll add a new typed column
-- and keep ai_mood for backward compatibility

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS mood mood_type;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS mood_override BOOLEAN DEFAULT FALSE;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS mood_confidence DECIMAL(3, 2);

-- Index for mood filtering
CREATE INDEX IF NOT EXISTS idx_memories_mood ON memories(mood) WHERE mood IS NOT NULL;

-- ============================================
-- MOOD STATISTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW user_mood_stats AS
SELECT 
    user_id,
    mood,
    COUNT(*) as count,
    DATE_TRUNC('month', memory_date) as month
FROM memories
WHERE mood IS NOT NULL AND memory_date IS NOT NULL
GROUP BY user_id, mood, DATE_TRUNC('month', memory_date)
ORDER BY month DESC, count DESC;

-- Grant access to authenticated users
GRANT SELECT ON user_mood_stats TO authenticated;

-- ============================================
-- FUNCTION: Get Mood Distribution
-- ============================================
CREATE OR REPLACE FUNCTION get_mood_distribution(p_user_id UUID)
RETURNS TABLE (
    mood mood_type,
    count BIGINT,
    percentage DECIMAL(5, 2)
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_count 
    FROM memories 
    WHERE user_id = p_user_id AND mood IS NOT NULL;
    
    RETURN QUERY
    SELECT 
        m.mood,
        COUNT(*) as count,
        CASE WHEN total_count > 0 
            THEN ROUND((COUNT(*) * 100.0 / total_count)::numeric, 2)
            ELSE 0
        END as percentage
    FROM memories m
    WHERE m.user_id = p_user_id AND m.mood IS NOT NULL
    GROUP BY m.mood
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Emotional Journey (Timeline)
-- ============================================
CREATE OR REPLACE FUNCTION get_emotional_journey(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    period TEXT,
    moods JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', memory_date), 'YYYY-MM') as period,
        JSONB_OBJECT_AGG(mood, mood_count) as moods
    FROM (
        SELECT 
            DATE_TRUNC('month', memory_date) as month,
            mood,
            COUNT(*) as mood_count
        FROM memories
        WHERE user_id = p_user_id 
            AND mood IS NOT NULL 
            AND memory_date IS NOT NULL
            AND (p_start_date IS NULL OR memory_date >= p_start_date)
            AND (p_end_date IS NULL OR memory_date <= p_end_date)
        GROUP BY DATE_TRUNC('month', memory_date), mood
    ) sub
    GROUP BY DATE_TRUNC('month', memory_date)
    ORDER BY DATE_TRUNC('month', memory_date) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
