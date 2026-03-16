-- Migration: Photobook Admin Management
-- Description: Tables for managing photobook products, templates, covers, and pricing
-- Date: 2026-02-26

-- =============================================================================
-- PHOTOBOOK PRODUCTS
-- =============================================================================
CREATE TABLE photobook_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  size TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_page DECIMAL(10,2) NOT NULL DEFAULT 0.40,
  min_pages INTEGER NOT NULL DEFAULT 24,
  max_pages INTEGER NOT NULL DEFAULT 80,
  binding TEXT NOT NULL CHECK (binding IN ('hardcover', 'softcover', 'layflat')),
  prodigi_sku TEXT,
  features JSONB DEFAULT '[]',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create slug index
CREATE UNIQUE INDEX idx_photobook_products_slug ON photobook_products(slug);
CREATE INDEX idx_photobook_products_enabled ON photobook_products(is_enabled, sort_order);

-- =============================================================================
-- PHOTOBOOK TEMPLATES (LAYOUT TEMPLATES)
-- =============================================================================
CREATE TABLE photobook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL UNIQUE, -- Matches code-based ID like 'full-photo'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('single', 'multi', 'special')),
  min_photos INTEGER NOT NULL DEFAULT 0,
  max_photos INTEGER NOT NULL DEFAULT 1,
  slots JSONB NOT NULL DEFAULT '[]',
  background TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photobook_templates_category ON photobook_templates(category, is_enabled);
CREATE INDEX idx_photobook_templates_template_id ON photobook_templates(template_id);

-- =============================================================================
-- PHOTOBOOK COVER DESIGNS
-- =============================================================================
CREATE TYPE cover_type AS ENUM ('front', 'back', 'spine');

CREATE TABLE photobook_cover_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_type cover_type NOT NULL DEFAULT 'front',
  thumbnail_url TEXT,
  background TEXT DEFAULT '#ffffff',
  elements JSONB DEFAULT '[]', -- Title slot, photo slot, decorative elements
  text_placeholders JSONB DEFAULT '{}', -- Default texts like title, subtitle
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photobook_cover_designs_type ON photobook_cover_designs(cover_type, is_enabled);

-- =============================================================================
-- PHOTOBOOK PRICING CONFIG
-- =============================================================================
CREATE TABLE photobook_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('markup', 'shipping', 'discount', 'addon')),
  
  -- For markup type
  markup_percentage DECIMAL(5,2) DEFAULT 30.00,
  
  -- For shipping type
  region TEXT,
  flat_rate DECIMAL(10,2),
  per_item_rate DECIMAL(10,2),
  free_threshold DECIMAL(10,2),
  
  -- For discount type
  discount_code TEXT,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  min_order_value DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  
  -- Metadata
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photobook_pricing_type ON photobook_pricing(pricing_type, is_enabled);
CREATE UNIQUE INDEX idx_photobook_pricing_discount_code ON photobook_pricing(discount_code) WHERE discount_code IS NOT NULL;

-- =============================================================================
-- PRINT PROVIDER SETTINGS
-- =============================================================================
CREATE TABLE print_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'prodigi',
  name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_encrypted TEXT, -- Store encrypted
  webhook_secret_encrypted TEXT,
  settings JSONB DEFAULT '{}',
  sku_mappings JSONB DEFAULT '{}', -- Maps our product IDs to provider SKUs
  is_sandbox BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_print_provider_active ON print_provider_settings(provider, is_sandbox) WHERE is_active = true;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE photobook_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_cover_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_provider_settings ENABLE ROW LEVEL SECURITY;

-- Public can read enabled products and templates
CREATE POLICY "Public can read enabled products" ON photobook_products
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Public can read enabled templates" ON photobook_templates
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Public can read enabled cover designs" ON photobook_cover_designs
  FOR SELECT USING (is_enabled = true);

-- Admins can manage all records
CREATE POLICY "Admins can manage products" ON photobook_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins can manage templates" ON photobook_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins can manage cover designs" ON photobook_cover_designs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins can manage pricing" ON photobook_pricing
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins can manage print providers" ON print_provider_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true)
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE TRIGGER update_photobook_products_updated_at BEFORE UPDATE ON photobook_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photobook_templates_updated_at BEFORE UPDATE ON photobook_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photobook_cover_designs_updated_at BEFORE UPDATE ON photobook_cover_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photobook_pricing_updated_at BEFORE UPDATE ON photobook_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_provider_settings_updated_at BEFORE UPDATE ON print_provider_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default Products
-- =============================================================================
INSERT INTO photobook_products (name, slug, description, size, base_price, price_per_page, min_pages, max_pages, binding, prodigi_sku, features, sort_order) VALUES
  ('8×8" Hardcover', '8x8-hardcover', 'Classic square format, perfect for family albums', '8×8"', 29.99, 0.40, 24, 80, 'hardcover', 'BOOK-HARD-SQ-9X9', '["PUR binding", "Matte-laminated cover", "Printable spine"]', 1),
  ('10×10" Hardcover', '10x10-hardcover', 'Large format for stunning photo displays', '10×10"', 39.99, 0.50, 24, 80, 'hardcover', 'BOOK-HARD-SQ-12X12', '["PUR binding", "Matte-laminated cover", "200gsm gloss paper"]', 2),
  ('11×8" Landscape', '11x8-landscape', 'Wide format ideal for panoramic shots', '11×8"', 34.99, 0.45, 24, 80, 'hardcover', 'BOOK-HARD-LS-11X8', '["Landscape orientation", "200gsm paper", "Premium binding"]', 3),
  ('8×8" Softcover', '8x8-softcover', 'Lightweight and affordable', '8×8"', 19.99, 0.30, 20, 60, 'softcover', 'BOOK-SOFT-SQ-9X9', '["Perfect binding", "Matte cover", "Economical"]', 4),
  ('10×10" Layflat', '10x10-layflat', 'Pages lay completely flat - great for panoramas', '10×10"', 59.99, 0.80, 18, 50, 'layflat', 'BOOK-LAYFLAT-SQ-12X12', '["Lay-flat binding", "Seamless spreads", "Thick pages"]', 5);

-- =============================================================================
-- SEED DATA: Default Templates (from templates.ts)
-- =============================================================================
INSERT INTO photobook_templates (template_id, name, description, category, min_photos, max_photos, slots, background, sort_order) VALUES
  ('full-photo', 'Full Photo', 'One photo fills the entire page', 'single', 1, 1, 
   '[{"id":"photo-1","type":"photo","position":{"x":0,"y":0,"width":100,"height":100},"required":true,"style":{"objectFit":"cover"}}]', NULL, 1),
  
  ('photo-with-caption', 'Photo with Caption', 'Photo on top with text caption below', 'single', 1, 1,
   '[{"id":"photo-1","type":"photo","position":{"x":5,"y":5,"width":90,"height":70},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"caption","type":"text","position":{"x":5,"y":78,"width":90,"height":17},"required":false,"placeholder":"Add a caption...","style":{"fontSize":"md","textAlign":"center","padding":2}}]', '#ffffff', 2),
   
  ('centered-photo', 'Centered Photo', 'Photo centered with white border frame', 'single', 1, 1,
   '[{"id":"photo-1","type":"photo","position":{"x":10,"y":10,"width":80,"height":80},"required":true,"style":{"objectFit":"contain","borderRadius":0.5}}]', '#ffffff', 3),
   
  ('two-horizontal', 'Two Horizontal', 'Two photos side by side', 'multi', 2, 2,
   '[{"id":"photo-1","type":"photo","position":{"x":3,"y":10,"width":45,"height":80},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-2","type":"photo","position":{"x":52,"y":10,"width":45,"height":80},"required":true,"style":{"objectFit":"cover","borderRadius":1}}]', '#ffffff', 4),
   
  ('two-vertical', 'Two Vertical', 'Two photos stacked vertically', 'multi', 2, 2,
   '[{"id":"photo-1","type":"photo","position":{"x":5,"y":3,"width":90,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-2","type":"photo","position":{"x":5,"y":52,"width":90,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}}]', '#ffffff', 5),
   
  ('grid-4', '2x2 Grid', 'Four photos in a 2x2 grid', 'multi', 4, 4,
   '[{"id":"photo-1","type":"photo","position":{"x":3,"y":3,"width":45,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-2","type":"photo","position":{"x":52,"y":3,"width":45,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-3","type":"photo","position":{"x":3,"y":52,"width":45,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-4","type":"photo","position":{"x":52,"y":52,"width":45,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}}]', '#ffffff', 6),
   
  ('feature-2-small', 'Feature + 2 Small', 'One large featured photo with two smaller ones', 'multi', 3, 3,
   '[{"id":"photo-1","type":"photo","position":{"x":3,"y":3,"width":60,"height":94},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-2","type":"photo","position":{"x":66,"y":3,"width":31,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}},{"id":"photo-3","type":"photo","position":{"x":66,"y":52,"width":31,"height":45},"required":true,"style":{"objectFit":"cover","borderRadius":1}}]', '#ffffff', 7),
   
  ('collage-3', 'Collage (3 Photos)', 'Three photos in an artistic collage arrangement', 'multi', 3, 3,
   '[{"id":"photo-1","type":"photo","position":{"x":5,"y":5,"width":55,"height":55},"required":true,"style":{"objectFit":"cover","borderRadius":2}},{"id":"photo-2","type":"photo","position":{"x":50,"y":35,"width":45,"height":35},"required":true,"style":{"objectFit":"cover","borderRadius":2}},{"id":"photo-3","type":"photo","position":{"x":15,"y":55,"width":40,"height":40},"required":true,"style":{"objectFit":"cover","borderRadius":2}}]', '#f8f8f8', 8),
   
  ('qr-page', 'QR Code Page', 'QR code with a small photo and caption', 'special', 0, 1,
   '[{"id":"qr-code","type":"qr","position":{"x":25,"y":10,"width":50,"height":40},"required":true},{"id":"photo-1","type":"photo","position":{"x":30,"y":55,"width":40,"height":25},"required":false,"style":{"objectFit":"cover","borderRadius":50}},{"id":"caption","type":"text","position":{"x":10,"y":82,"width":80,"height":15},"required":false,"placeholder":"Scan to watch the video","style":{"fontSize":"lg","textAlign":"center","fontWeight":"medium"}}]', '#ffffff', 9),
   
  ('wisdom-quote', 'Wisdom Quote', 'Quote text with decorative background', 'special', 0, 0,
   '[{"id":"quote","type":"text","position":{"x":10,"y":25,"width":80,"height":40},"required":true,"placeholder":"\"Add your wisdom quote here...\"","style":{"fontSize":"2xl","textAlign":"center","fontWeight":"medium","padding":5}},{"id":"attribution","type":"text","position":{"x":20,"y":68,"width":60,"height":10},"required":false,"placeholder":"— Attribution","style":{"fontSize":"md","textAlign":"center","fontWeight":"normal"}}]', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 10),
   
  ('title-page', 'Title Page', 'Title, subtitle, and optional photo', 'special', 0, 1,
   '[{"id":"title","type":"text","position":{"x":10,"y":15,"width":80,"height":15},"required":true,"placeholder":"Book Title","style":{"fontSize":"2xl","textAlign":"center","fontWeight":"bold"}},{"id":"subtitle","type":"text","position":{"x":15,"y":32,"width":70,"height":10},"required":false,"placeholder":"Subtitle or dedication","style":{"fontSize":"lg","textAlign":"center","fontWeight":"normal"}},{"id":"photo-1","type":"photo","position":{"x":20,"y":45,"width":60,"height":45},"required":false,"style":{"objectFit":"cover","borderRadius":2}}]', '#ffffff', 11),
   
  ('dedication', 'Dedication', 'Text-only dedication or message page', 'special', 0, 0,
   '[{"id":"heading","type":"text","position":{"x":20,"y":20,"width":60,"height":10},"required":false,"placeholder":"For You","style":{"fontSize":"xl","textAlign":"center","fontWeight":"medium"}},{"id":"message","type":"text","position":{"x":10,"y":35,"width":80,"height":50},"required":true,"placeholder":"Write your heartfelt message here...","style":{"fontSize":"md","textAlign":"center","fontWeight":"normal","padding":5}},{"id":"signature","type":"text","position":{"x":50,"y":88,"width":40,"height":8},"required":false,"placeholder":"With love,","style":{"fontSize":"md","textAlign":"right","fontWeight":"normal"}}]', '#faf9f6', 12);

-- =============================================================================
-- SEED DATA: Default Cover Designs
-- =============================================================================
INSERT INTO photobook_cover_designs (name, description, cover_type, background, elements, text_placeholders, sort_order) VALUES
  ('Classic Title', 'Simple centered title with photo below', 'front', '#ffffff',
   '[{"type":"text","id":"title","position":{"x":10,"y":10,"width":80,"height":15},"style":{"fontSize":"2xl","textAlign":"center","fontWeight":"bold"}},{"type":"photo","id":"main-photo","position":{"x":15,"y":30,"width":70,"height":55},"style":{"objectFit":"cover","borderRadius":2}}]',
   '{"title":"Our Memories"}', 1),
   
  ('Full Photo Cover', 'Photo bleeds to edges with overlay title', 'front', '#000000',
   '[{"type":"photo","id":"cover-photo","position":{"x":0,"y":0,"width":100,"height":100},"style":{"objectFit":"cover"}},{"type":"text","id":"title","position":{"x":10,"y":75,"width":80,"height":15},"style":{"fontSize":"2xl","textAlign":"center","fontWeight":"bold","color":"#ffffff"}}]',
   '{"title":"Precious Moments"}', 2),
   
  ('Minimal', 'Clean minimal design with centered title', 'front', '#faf9f6',
   '[{"type":"text","id":"title","position":{"x":15,"y":40,"width":70,"height":20},"style":{"fontSize":"2xl","textAlign":"center","fontWeight":"normal","fontFamily":"Georgia, serif"}}]',
   '{"title":"A Life Well Lived"}', 3),
   
  ('Standard Back', 'QR code and dedication', 'back', '#ffffff',
   '[{"type":"qr","id":"memory-qr","position":{"x":35,"y":20,"width":30,"height":25}},{"type":"text","id":"dedication","position":{"x":10,"y":55,"width":80,"height":30},"style":{"fontSize":"md","textAlign":"center"}}]',
   '{"dedication":"Made with love using YoursTruly"}', 1),
   
  ('Photo Back', 'Small photo collage on back', 'back', '#f5f5f5',
   '[{"type":"photo","id":"photo-1","position":{"x":10,"y":10,"width":35,"height":35},"style":{"objectFit":"cover","borderRadius":1}},{"type":"photo","id":"photo-2","position":{"x":55,"y":10,"width":35,"height":35},"style":{"objectFit":"cover","borderRadius":1}},{"type":"text","id":"tagline","position":{"x":10,"y":55,"width":80,"height":15},"style":{"fontSize":"lg","textAlign":"center"}}]',
   '{"tagline":"Preserving memories for generations"}', 2);

-- =============================================================================
-- SEED DATA: Default Pricing
-- =============================================================================
INSERT INTO photobook_pricing (name, description, pricing_type, markup_percentage, is_enabled) VALUES
  ('Default Markup', 'Standard markup on all products', 'markup', 30.00, true);

INSERT INTO photobook_pricing (name, description, pricing_type, region, flat_rate, per_item_rate, free_threshold, is_enabled) VALUES
  ('US Shipping', 'Domestic US shipping', 'shipping', 'US', 5.99, 0.00, 49.99, true),
  ('International Shipping', 'International shipping', 'shipping', 'INTL', 14.99, 2.99, 99.99, true);

-- =============================================================================
-- SEED DATA: Default Print Provider
-- =============================================================================
INSERT INTO print_provider_settings (provider, name, api_endpoint, settings, is_sandbox, is_active) VALUES
  ('prodigi', 'Prodigi (Sandbox)', 'https://api.sandbox.prodigi.com/v4.0', 
   '{"auto_ship": false, "default_quality": "standard"}', true, true);
