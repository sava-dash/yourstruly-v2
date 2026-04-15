-- Photobook PR 3: cover/finish/binding picker + add-on upsells.
--
-- Adds two JSONB columns to photobook_projects so the editor can persist
-- product options + selected add-ons across sessions. Existing project-level
-- RLS policies cover these columns; no policy changes needed.
--
-- product_options shape: { coverType, paperFinish, binding } (validated in
-- src/lib/photobook/product-options.ts via normalizeProductOptions).
--
-- add_ons shape: string[] of AddOnId values (gift_box, premium_print,
-- logo_removal, color_pop). Validated by normalizeAddOns.

ALTER TABLE photobook_projects
  ADD COLUMN IF NOT EXISTS product_options JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE photobook_projects
  ADD COLUMN IF NOT EXISTS add_ons JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN photobook_projects.product_options IS
  'PR 3: { coverType, paperFinish, binding }. Validated by normalizeProductOptions().';

COMMENT ON COLUMN photobook_projects.add_ons IS
  'PR 3: string[] of AddOnId. Validated by normalizeAddOns().';
