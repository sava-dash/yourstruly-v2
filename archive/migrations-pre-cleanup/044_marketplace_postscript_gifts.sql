-- PostScript Gifts Table
-- Gifts attached to PostScripts for scheduled delivery

CREATE TABLE IF NOT EXISTS postscript_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product identification
    code VARCHAR(255) NOT NULL, -- Product code (Floristone CODE, Doba SKU, etc.)
    market VARCHAR(50) NOT NULL, -- 'floristone', 'prodigi', 'spocket', 'custom'
    
    -- Product details
    title VARCHAR(500) NOT NULL,
    image TEXT, -- Product image URL
    description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    
    -- Product options
    color VARCHAR(100),
    size VARCHAR(100),
    variant_id VARCHAR(255), -- Printful variant ID
    
    -- Additional metadata
    info JSONB DEFAULT '{}', -- Additional product metadata, delivery preferences
    additional_data JSONB DEFAULT '{}', -- Printful design data, custom configuration
    
    -- Delivery configuration
    delivery_date DATE, -- Calculated based on PostScript event rules
    delivery_details JSONB DEFAULT '{}', -- Recipient address, shipping method
    
    -- Payment status
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    
    -- Order linkage
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- pending, queued, processing, shipped, delivered, cancelled
    
    -- External tracking
    market_order_id VARCHAR(255), -- External order ID from provider
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    
    -- Timestamps
    processed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_postscript ON postscript_gifts(postscript_id);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_user ON postscript_gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_order ON postscript_gifts(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_status ON postscript_gifts(status);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_delivery ON postscript_gifts(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_market ON postscript_gifts(code, market);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_paid ON postscript_gifts(is_paid) WHERE is_paid = TRUE;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE postscript_gifts ENABLE ROW LEVEL SECURITY;

-- Users can only manage gifts for their own postscripts
DROP POLICY IF EXISTS "Users can manage own postscript gifts" ON postscript_gifts;
CREATE POLICY "Users can manage own postscript gifts" ON postscript_gifts
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS postscript_gifts_updated_at ON postscript_gifts;
CREATE TRIGGER postscript_gifts_updated_at
    BEFORE UPDATE ON postscript_gifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Sync postscript has_gift flag
-- ============================================
CREATE OR REPLACE FUNCTION update_postscript_has_gift()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE postscripts 
        SET has_gift = TRUE, 
            gift_type = 'physical',
            gift_details = jsonb_build_object(
                'gift_id', NEW.id,
                'title', NEW.title,
                'price', NEW.price,
                'market', NEW.market
            ),
            updated_at = NOW()
        WHERE id = NEW.postscript_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if there are other gifts for this postscript
        IF NOT EXISTS (
            SELECT 1 FROM postscript_gifts 
            WHERE postscript_id = OLD.postscript_id 
            AND id != OLD.id
        ) THEN
            UPDATE postscripts 
            SET has_gift = FALSE,
                gift_type = NULL,
                gift_details = NULL,
                updated_at = NOW()
            WHERE id = OLD.postscript_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_postscript_has_gift ON postscript_gifts;
CREATE TRIGGER sync_postscript_has_gift
    AFTER INSERT OR DELETE ON postscript_gifts
    FOR EACH ROW EXECUTE FUNCTION update_postscript_has_gift();

-- ============================================
-- FUNCTION: Auto-set delivery date from postscript
-- ============================================
CREATE OR REPLACE FUNCTION set_gift_delivery_date()
RETURNS TRIGGER AS $$
DECLARE
    ps_delivery_date DATE;
    ps_delivery_type TEXT;
BEGIN
    -- Get delivery info from parent postscript
    SELECT delivery_date, delivery_type 
    INTO ps_delivery_date, ps_delivery_type
    FROM postscripts 
    WHERE id = NEW.postscript_id;
    
    -- Set delivery date from postscript if not already set
    IF NEW.delivery_date IS NULL THEN
        NEW.delivery_date := ps_delivery_date;
    END IF;
    
    -- Merge delivery details from postscript
    NEW.delivery_details := COALESCE(NEW.delivery_details, '{}')::jsonb || jsonb_build_object(
        'delivery_type', ps_delivery_type,
        'postscript_delivery_date', ps_delivery_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_gift_delivery_date_trigger ON postscript_gifts;
CREATE TRIGGER set_gift_delivery_date_trigger
    BEFORE INSERT ON postscript_gifts
    FOR EACH ROW EXECUTE FUNCTION set_gift_delivery_date();
