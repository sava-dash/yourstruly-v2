-- Shopping Cart Tables
-- Supports both guest (session-based) and authenticated users

-- ============================================
-- CARTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification (nullable for guests)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For guest users
    
    -- Cart status
    status VARCHAR(50) DEFAULT 'active', -- active, converted, abandoned, expired
    
    -- Marketplace source (for mixed carts, stores primary market)
    market VARCHAR(50) DEFAULT 'custom', -- 'floristone', 'prodigi', 'spocket', 'custom'
    
    -- Delivery scheduling (for gift carts)
    delivery_date DATE,
    custom_delivery JSONB DEFAULT '{}', -- Gift delivery configuration
    
    -- Cart totals (denormalized for performance)
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    delivery_cost DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    
    -- Currency
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Expiration for guest carts
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CART ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    
    -- Product identification
    market VARCHAR(50) NOT NULL, -- 'floristone', 'prodigi', 'spocket', 'custom'
    category VARCHAR(100), -- Category slug
    product_id VARCHAR(255) NOT NULL, -- Provider's product ID
    
    -- Product details
    title VARCHAR(500) NOT NULL,
    image TEXT, -- Product image URL
    description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2), -- Before discount
    quantity INTEGER NOT NULL DEFAULT 1,
    total DECIMAL(10,2) NOT NULL,
    
    -- Variants/options
    color VARCHAR(100),
    size VARCHAR(100),
    material VARCHAR(100),
    
    -- Provider-specific identifiers
    item_number VARCHAR(255), -- Doba SKU, Floristone code, Printful variant ID
    variant_id VARCHAR(255), -- Printful variant ID
    
    -- Special data
    additional_data JSONB DEFAULT '{}', -- Printful design data, custom options, etc.
    
    -- Gift/offer associations
    offer_id UUID, -- For bundle offers
    is_gift BOOLEAN DEFAULT FALSE,
    gift_recipient_id UUID, -- Links to contact for gift delivery
    
    -- Delivery configuration per item
    delivery_details JSONB DEFAULT '{}', -- Selected shipping method
    shipping_methods JSONB DEFAULT '[]', -- Available shipping options
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_expires ON carts(expires_at) WHERE expires_at IS NOT NULL;

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id, market);
CREATE INDEX IF NOT EXISTS idx_cart_items_gift ON cart_items(is_gift) WHERE is_gift = TRUE;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own carts
DROP POLICY IF EXISTS "Users can manage own carts" ON carts;
CREATE POLICY "Users can manage own carts" ON carts
    FOR ALL USING (
        user_id = auth.uid() 
        OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id', true))
    );

-- Users can only see items in their own carts
DROP POLICY IF EXISTS "Users can manage own cart items" ON cart_items;
CREATE POLICY "Users can manage own cart items" ON cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE id = cart_items.cart_id 
            AND (user_id = auth.uid() 
                 OR (session_id IS NOT NULL AND session_id = current_setting('app.session_id', true)))
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS carts_updated_at ON carts;
CREATE TRIGGER carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Update cart totals
-- ============================================
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE carts
    SET 
        subtotal = (
            SELECT COALESCE(SUM(total), 0) 
            FROM cart_items 
            WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
        ),
        total = (
            SELECT COALESCE(SUM(total), 0) 
            FROM cart_items 
            WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
        ) + delivery_cost + tax_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update cart totals when items change
DROP TRIGGER IF EXISTS update_cart_totals_on_item_change ON cart_items;
CREATE TRIGGER update_cart_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_cart_totals();
