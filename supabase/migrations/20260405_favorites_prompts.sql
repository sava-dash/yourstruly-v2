-- Favorites engagement prompt templates — 50 per category, fun + deep
-- These are templates; the generate_engagement_prompts function picks from them

-- Add favorites prompt types to the enum
-- NOTE: These must be committed before use. Run this migration first,
-- then run 20260405_favorites_prompts_data.sql for the inserts.
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'favorite_music';
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'favorite_movies';
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'favorite_books';
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'favorite_foods';
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'favorites_firsts';
ALTER TYPE prompt_type ADD VALUE IF NOT EXISTS 'recipe';
