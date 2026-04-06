-- Add 'recipes' and 'advice' and 'other' to knowledge_category enum
-- so the My Faves Recipes tab can load recipes from knowledge_entries
-- Also aligns with the wisdom category dropdown which already shows these values

ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'recipes';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'advice';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'creativity';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'family';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'spirituality';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'other';
