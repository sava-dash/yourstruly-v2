-- postscript_gifts: relax legacy NOT NULL columns blocking the Stripe checkout
-- insert in /api/postscripts/[id]/gifts/checkout. The original table (archive
-- migration 044_marketplace_postscript_gifts.sql) was designed for Floristone/
-- Doba/Printful and requires user_id, code, market, title, price as NOT NULL.
-- The new Goody-backed flow supplies product_id/name/image_url/price via
-- 20260415_postscript_gifts_checkout_columns.sql but not code/market/title,
-- causing "null value in column violates not-null constraint" → the generic
-- "Failed to create gift record" 500 the user was seeing.
--
-- Safe to re-run: every ALTER is idempotent.

-- 1. Relax legacy NOT NULL columns. Keep the columns around for backward
--    compatibility with any downstream code that still reads them.
ALTER TABLE public.postscript_gifts ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.postscript_gifts ALTER COLUMN market DROP NOT NULL;
ALTER TABLE public.postscript_gifts ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.postscript_gifts ALTER COLUMN price DROP NOT NULL;

-- 2. Ensure user_id stays NOT NULL (required by RLS), but the route now
--    provides it. Leave as-is.

-- 3. Harden the has_gift sync trigger so NULL title/market don't crash it.
CREATE OR REPLACE FUNCTION update_postscript_has_gift()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE postscripts
        SET has_gift = TRUE,
            gift_type = COALESCE(gift_type, 'physical'),
            gift_details = jsonb_build_object(
                'gift_id', NEW.id,
                'title', COALESCE(NEW.title, NEW.name),
                'price', NEW.price,
                'market', NEW.market
            ),
            updated_at = NOW()
        WHERE id = NEW.postscript_id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
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
