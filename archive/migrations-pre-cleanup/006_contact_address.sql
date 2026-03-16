-- Add full address fields to contacts for gift delivery
-- Only adds columns if they don't exist

DO $$
BEGIN
    -- Add address (street) column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'address') THEN
        ALTER TABLE contacts ADD COLUMN address TEXT;
    END IF;
    
    -- Add zipcode column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'zipcode') THEN
        ALTER TABLE contacts ADD COLUMN zipcode TEXT;
    END IF;
END $$;
