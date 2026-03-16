-- Migration: Add Goody Commerce API gift tracking tables
-- This table tracks gifts sent through the Goody Commerce API

-- Table for tracking gifts attached to PostScripts
CREATE TABLE IF NOT EXISTS postscript_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Provider info
  provider VARCHAR(50) NOT NULL DEFAULT 'goody',
  provider_order_batch_id VARCHAR(255),
  provider_order_id VARCHAR(255),
  
  -- Gift status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending, created, completed, accepted, shipped, delivered, canceled, refunded
  
  -- Financial info (stored in cents)
  amount_total INTEGER,
  amount_product INTEGER,
  amount_shipping INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Gift links for recipients
  gift_links JSONB DEFAULT '[]',
  
  -- Tracking info
  tracking_number VARCHAR(255),
  tracking_url TEXT,
  carrier VARCHAR(100),
  
  -- Thank you note from recipient
  thank_you_note TEXT,
  
  -- Timestamps
  accepted_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Indexes
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'created', 'completed', 'accepted', 
    'shipped', 'delivered', 'canceled', 'refunded'
  ))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_postscript_id 
  ON postscript_gifts(postscript_id);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_contact_id 
  ON postscript_gifts(contact_id);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_provider_order_batch_id 
  ON postscript_gifts(provider_order_batch_id);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_status 
  ON postscript_gifts(status);
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_created_at 
  ON postscript_gifts(created_at);

-- Table for tracking gift events (webhook events)
CREATE TABLE IF NOT EXISTS postscript_gift_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_id UUID REFERENCES postscript_gifts(id) ON DELETE CASCADE,
  order_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for gift events
CREATE INDEX IF NOT EXISTS idx_gift_events_gift_id 
  ON postscript_gift_events(gift_id);
CREATE INDEX IF NOT EXISTS idx_gift_events_order_id 
  ON postscript_gift_events(order_id);
CREATE INDEX IF NOT EXISTS idx_gift_events_event_type 
  ON postscript_gift_events(event_type);
CREATE INDEX IF NOT EXISTS idx_gift_events_created_at 
  ON postscript_gift_events(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_postscript_gifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_postscript_gifts_updated_at ON postscript_gifts;
CREATE TRIGGER trigger_postscript_gifts_updated_at
  BEFORE UPDATE ON postscript_gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_postscript_gifts_updated_at();

-- Add RLS policies
ALTER TABLE postscript_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE postscript_gift_events ENABLE ROW LEVEL SECURITY;

-- Allow users to view gifts for their own postscripts
CREATE POLICY postscript_gifts_select_policy ON postscript_gifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM postscripts p
      JOIN user_contacts uc ON p.contact_id = uc.contact_id
      WHERE p.id = postscript_gifts.postscript_id
      AND uc.user_id = auth.uid()
    )
  );

-- Allow service role to manage all gifts
CREATE POLICY postscript_gifts_service_policy ON postscript_gifts
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE postscript_gifts IS 'Tracks physical gifts sent through the Goody Commerce API attached to PostScripts';
COMMENT ON TABLE postscript_gift_events IS 'Tracks webhook events for gift orders from Goody';
