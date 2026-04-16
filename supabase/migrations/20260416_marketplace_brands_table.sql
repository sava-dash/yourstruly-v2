-- ============================================================================
-- marketplace_brands: Brand metadata synced from Goody /v1/brands API
-- Stores logo URLs, shipping info, and brand values for the brand detail page.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_brands (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  goody_id      TEXT,
  logo_url      TEXT,
  description   TEXT,
  shipping_price_cents    INT,
  free_shipping_min_cents INT,
  brand_values  TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for lookup by goody_id (for sync script dedup)
CREATE INDEX IF NOT EXISTS idx_marketplace_brands_goody_id
  ON marketplace_brands (goody_id);

-- RLS: public read, service-role write
ALTER TABLE marketplace_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_brands_public_read ON marketplace_brands;
CREATE POLICY marketplace_brands_public_read ON marketplace_brands
  FOR SELECT USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
