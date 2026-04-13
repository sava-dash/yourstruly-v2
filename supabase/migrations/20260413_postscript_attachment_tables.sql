-- Create postscript_memory_attachments table
CREATE TABLE IF NOT EXISTS postscript_memory_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    memory_id UUID,
    memory_title TEXT,
    memory_date TEXT,
    memory_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_mem_att_postscript ON postscript_memory_attachments(postscript_id);

-- Create postscript_wisdom_attachments table
CREATE TABLE IF NOT EXISTS postscript_wisdom_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postscript_id UUID NOT NULL REFERENCES postscripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    wisdom_id UUID,
    wisdom_title TEXT,
    wisdom_category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_wis_att_postscript ON postscript_wisdom_attachments(postscript_id);

-- Add reply_text column to postscripts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postscripts' AND column_name = 'reply_text') THEN
        ALTER TABLE postscripts ADD COLUMN reply_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postscripts' AND column_name = 'reply_at') THEN
        ALTER TABLE postscripts ADD COLUMN reply_at TIMESTAMPTZ;
    END IF;
END $$;
