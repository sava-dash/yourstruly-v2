-- Marketplace Providers Configuration
-- Stores API credentials and settings for each marketplace provider

CREATE TABLE IF NOT EXISTS marketplace_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider identification
    name VARCHAR(50) NOT NULL UNIQUE, -- 'floristone', 'prodigi', 'spocket', 'custom'
    display_name VARCHAR(100) NOT NULL,
    
    -- Provider status
    enabled BOOLEAN DEFAULT TRUE,
    
    -- API configuration (encrypted at application level)
    config JSONB DEFAULT '{}', -- API keys, endpoints, settings
    
    -- Pricing configuration
    markup_percent DECIMAL(5,2) DEFAULT 0.00, -- Default markup percentage
    
    -- Supported categories/products
    categories JSONB DEFAULT '[]', -- Array of supported category slugs
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED DEFAULT PROVIDERS
-- ============================================
INSERT INTO marketplace_providers (name, display_name, enabled, markup_percent, categories)
VALUES 
    ('floristone', 'Florist One', true, 0.15, '["flowers", "plants", "sympathy"]'),
    ('prodigi', 'Prodigi Print', true, 0.35, '["photobooks", "wall-art", "canvas", "calendars", "cards", "posters"]'),
    ('spocket', 'Spocket Gifts', true, 0.30, '["home-decor", "accessories", "jewelry", "toys", "gifts"]'),
    ('custom', 'Custom Products', true, 0.50, '["memory-books", "keepsakes"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_marketplace_providers_enabled ON marketplace_providers(enabled);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE marketplace_providers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage providers (public read-only)
DROP POLICY IF EXISTS "Providers are viewable by everyone" ON marketplace_providers;
CREATE POLICY "Providers are viewable by everyone" ON marketplace_providers
    FOR SELECT USING (true);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS marketplace_providers_updated_at ON marketplace_providers;
CREATE TRIGGER marketplace_providers_updated_at
    BEFORE UPDATE ON marketplace_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
