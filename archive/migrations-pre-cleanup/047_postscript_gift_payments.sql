-- PostScript Gift Payments
-- Adds payment tracking for gifts attached to postscripts

-- Add payment fields to postscript_gifts
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS amount_paid INTEGER;
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS amount_to_provider INTEGER;
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS gift_type TEXT DEFAULT 'product';
ALTER TABLE postscript_gifts ADD COLUMN IF NOT EXISTS flex_gift_amount INTEGER;

-- Add comments
COMMENT ON COLUMN postscript_gifts.payment_intent_id IS 'Stripe PaymentIntent ID for this gift';
COMMENT ON COLUMN postscript_gifts.payment_status IS 'pending, paid, refunded, failed';
COMMENT ON COLUMN postscript_gifts.amount_paid IS 'Amount collected from user in cents (includes markup)';
COMMENT ON COLUMN postscript_gifts.amount_to_provider IS 'Amount to pay provider in cents (without markup)';
COMMENT ON COLUMN postscript_gifts.gift_type IS 'product (specific item) or choice (Gift of Choice/flex)';
COMMENT ON COLUMN postscript_gifts.flex_gift_amount IS 'For Gift of Choice: the dollar amount recipient can spend';

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_postscript_gifts_payment_intent 
  ON postscript_gifts(payment_intent_id) 
  WHERE payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_postscript_gifts_payment_status 
  ON postscript_gifts(payment_status);
