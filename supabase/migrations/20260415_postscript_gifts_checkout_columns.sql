-- Add missing columns used by /api/postscripts/[id]/gifts/checkout and
-- /api/postscripts/[id]/gifts POST inserts. Without these columns the
-- insert fails with "Failed to create gift record" on "Pay for Gift Now".
-- Safe to re-run; every ALTER uses IF NOT EXISTS.

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS product_id TEXT;

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

ALTER TABLE public.postscript_gifts
  ADD COLUMN IF NOT EXISTS provider_data JSONB DEFAULT '{}'::jsonb;
