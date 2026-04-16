-- Fix: trigger function referenced NEW.provider which doesn't exist.
-- The column is called 'market', not 'provider'.

CREATE OR REPLACE FUNCTION update_postscript_has_gift()
RETURNS trigger AS $$
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
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Also reload PostgREST schema cache to pick up all column changes
NOTIFY pgrst, 'reload schema';
