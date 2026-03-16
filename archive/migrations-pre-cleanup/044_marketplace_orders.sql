-- Orders Tables
-- Stores order records with delivery scheduling for gift delivery

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255), -- For guest orders
    
    -- Order identification
    order_number VARCHAR(50) NOT NULL UNIQUE, -- Formatted: CU-/DO-/FL-/PR- prefix
    
    -- Contact information
    delivery_details JSONB NOT NULL DEFAULT '{}', -- Shipping address + contact info
    billing_details JSONB NOT NULL DEFAULT '{}', -- Billing address
    payment_details JSONB DEFAULT '{}', -- Stripe payment info, transaction IDs
    
    -- Delivery scheduling (key for gift delivery)
    delivery_date DATE, -- Scheduled delivery date
    
    -- Order status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled, refunded
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    
    -- Marketplace source
    market VARCHAR(50) NOT NULL, -- 'floristone', 'prodigi', 'spocket', 'custom', 'mixed'
    market_number VARCHAR(255), -- External order ID from provider
    
    -- Financial totals
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    delivery_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Currency
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Gift metadata
    custom_delivery JSONB DEFAULT '{}', -- Gift metadata, PostScript references
    is_gift_order BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Product identification
    product_id VARCHAR(255) NOT NULL, -- Provider's product ID
    market VARCHAR(50) NOT NULL, -- 'floristone', 'prodigi', 'spocket', 'custom'
    category VARCHAR(100), -- Category slug
    
    -- Product details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL, -- Unit price paid
    original_price DECIMAL(10,2), -- Pre-discount price
    quantity INTEGER NOT NULL DEFAULT 1,
    total DECIMAL(10,2) NOT NULL,
    
    -- Product options/variants
    details JSONB DEFAULT '{}', -- Color, size, image, link, etc.
    
    -- Provider-specific data
    additional_data JSONB DEFAULT '{}', -- Printful design data, custom options
    market_item_no VARCHAR(255), -- Doba item number, Floristone code
    variant_id VARCHAR(255), -- Printful variant ID
    
    -- External order tracking
    market_order_details JSONB DEFAULT '{}', -- External order response from provider
    
    -- Delivery details per item
    delivery_details JSONB DEFAULT '{}', -- Shipping method used
    tracking_number VARCHAR(255),
    
    -- Gift associations
    postscript_gift_id UUID, -- Links to postscript_gifts table
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_market ON orders(market);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_market_number ON orders(market_number) WHERE market_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id, market);
CREATE INDEX IF NOT EXISTS idx_order_items_gift ON order_items(postscript_gift_id) WHERE postscript_gift_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

-- Users can only see items in their own orders
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_items.order_id 
            AND user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS order_items_updated_at ON order_items;
CREATE TRIGGER order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Generate order number
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix VARCHAR(10);
    sequence_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    -- Only generate if order_number is not provided
    IF NEW.order_number IS NULL THEN
        -- Determine prefix based on market
        prefix := CASE NEW.market
            WHEN 'floristone' THEN 'FL-'
            WHEN 'prodigi' THEN 'PD-'
            WHEN 'spocket' THEN 'SP-'
            ELSE 'CU-'
        END;
        
        -- Get next sequence number for today
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 9 FOR 10) AS INTEGER)
        ), 0) + 1
        INTO sequence_num
        FROM orders
        WHERE order_number LIKE prefix || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'
        AND created_at::date = NOW()::date;
        
        -- Generate order number: PREFIX-YYYYMMDD-XXXXX
        NEW.order_number := prefix || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 5, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();
