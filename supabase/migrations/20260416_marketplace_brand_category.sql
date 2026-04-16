-- ============================================================================
-- Marketplace: brand + category data model (PR 1 of ongoody-IA rebuild)
-- ============================================================================
-- Adds brand fields, starting-price cache, scope/category arrays to
-- marketplace_products. Creates a normalized marketplace_categories tree
-- seeded with the ongoody-matching taxonomy (Categories + Occasions tabs,
-- minus alcohol per product direction).
-- ============================================================================

-- 1. Extend marketplace_products ---------------------------------------------
ALTER TABLE marketplace_products
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_slug TEXT,
  ADD COLUMN IF NOT EXISTS starting_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS scope TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill starting_price_cents from base_price_cents for rows that don't
-- already have it (no variant price information means starting == base).
UPDATE marketplace_products
   SET starting_price_cents = base_price_cents
 WHERE starting_price_cents IS NULL;

-- Indexes for the new filter columns
CREATE INDEX IF NOT EXISTS idx_marketplace_products_brand_slug
  ON marketplace_products(brand_slug)
  WHERE brand_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_products_scope
  ON marketplace_products USING GIN (scope);

CREATE INDEX IF NOT EXISTS idx_marketplace_products_categories
  ON marketplace_products USING GIN (categories);

-- 2. marketplace_categories tree ---------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  parent_slug TEXT REFERENCES marketplace_categories(slug) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_occasion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent_sort
  ON marketplace_categories(parent_slug, sort_order);

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_is_occasion
  ON marketplace_categories(is_occasion);

-- RLS: public read, admin write
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read categories" ON marketplace_categories;
CREATE POLICY "Anyone can read categories" ON marketplace_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON marketplace_categories;
CREATE POLICY "Admins can manage categories" ON marketplace_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- 3. Seed ongoody-matching tree ---------------------------------------------
-- Categories tab (is_occasion = false). Parents are inserted before children
-- so the FK to parent_slug resolves cleanly.
INSERT INTO marketplace_categories (slug, name, icon, parent_slug, sort_order, is_occasion) VALUES
  ('all',                  'All Gifts',            'Gift',         NULL,    0,  false),
  ('new',                  'New Arrivals',         'Sparkles',     NULL,    10, false),
  ('gift-of-choice',       'Gift of Choice',       'Shuffle',      NULL,    20, false),
  ('best-sellers',         'Best Sellers',         'Star',         NULL,    30, false),
  ('personalized',         'Personalized',         'PenTool',      NULL,    40, false),
  ('earth-month',          'Earth Month',          'Leaf',         NULL,    50, false),
  ('tech',                 'Tech',                 'Cpu',          NULL,    60, false),
  ('travel-outdoors',      'Travel & Outdoors',    'Mountain',     NULL,    70, false),
  ('food-drinks',          'Food & Drinks',        'UtensilsCrossed', NULL, 80, false),
  ('gift-baskets',         'Gift Baskets',         'ShoppingBasket', NULL,  90, false),
  ('home',                 'Home',                 'Home',         NULL,    100, false),
  ('baby-kids',            'Baby & Kids',          'Baby',         NULL,    110, false),
  ('wellness',             'Wellness',             'Heart',        NULL,    120, false),
  ('fashion-accessories',  'Fashion & Accessories','Shirt',        NULL,    130, false)
ON CONFLICT (slug) DO NOTHING;

-- Tech sub-categories
INSERT INTO marketplace_categories (slug, name, icon, parent_slug, sort_order, is_occasion) VALUES
  ('office',            'Office',             'Briefcase',   'tech', 10, false),
  ('headphones-audio',  'Headphones & Audio', 'Headphones',  'tech', 20, false),
  ('home-tech',         'Home Tech',          'HomeIcon',    'tech', 30, false),
  ('wellness-tech',     'Wellness Tech',      'Activity',    'tech', 40, false),
  ('film-cameras',      'Film & Cameras',     'Camera',      'tech', 50, false),
  ('gaming',            'Gaming',             'Gamepad2',    'tech', 60, false)
ON CONFLICT (slug) DO NOTHING;

-- Occasions tab (is_occasion = true)
INSERT INTO marketplace_categories (slug, name, icon, parent_slug, sort_order, is_occasion) VALUES
  ('birthday',      'Birthday',        'Cake',          NULL, 10,  true),
  ('anniversary',   'Anniversary',     'Heart',         NULL, 20,  true),
  ('wedding',       'Wedding',         'Diamond',       NULL, 30,  true),
  ('new-baby',      'New Baby',        'Baby',          NULL, 40,  true),
  ('graduation',    'Graduation',      'GraduationCap', NULL, 50,  true),
  ('thank-you',     'Thank You',       'Smile',         NULL, 60,  true),
  ('sympathy',      'Sympathy',        'HeartHandshake',NULL, 70,  true),
  ('holiday',       'Holiday',         'Snowflake',     NULL, 80,  true),
  ('mothers-day',   'Mother''s Day',   'Flower',        NULL, 90,  true),
  ('fathers-day',   'Father''s Day',   'Watch',         NULL, 100, true),
  ('valentines',    'Valentine''s Day','HeartPulse',    NULL, 110, true),
  ('just-because',  'Just Because',    'Sun',           NULL, 120, true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Reload PostgREST schema cache so the new columns / table are live
NOTIFY pgrst, 'reload schema';
