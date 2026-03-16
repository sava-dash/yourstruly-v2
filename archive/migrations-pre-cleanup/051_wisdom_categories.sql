-- ============================================================================
-- Migration: Enhanced Wisdom Categories
-- Created: 2026-02-25
-- Description: Add explicit category field to memories for user-selectable categories
-- ============================================================================

-- Add category field to memories table (for user-selected category, separate from ai_category)
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_memories_user_category 
ON memories(user_id, category) 
WHERE category IS NOT NULL;

-- Backfill: Copy ai_category to category for wisdom entries that don't have one
UPDATE memories 
SET category = ai_category 
WHERE memory_type = 'wisdom' 
  AND category IS NULL 
  AND ai_category IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN memories.category IS 'User-selected or AI-assigned category (life_lessons, relationships, career, etc.)';
