-- Add "Prints" root category with 8 children for Prodigi print-on-demand products.
-- These categories map to the Prodigi API product categories and are rendered
-- in the CategoryRail alongside existing Goody-sourced categories.

INSERT INTO marketplace_categories (slug, name, icon, sort_order, is_occasion, parent_slug)
VALUES
  ('prints',              'Prints',              'Printer',   45, false, NULL),
  ('photo-prints',        'Photo Prints',        NULL,         1, false, 'prints'),
  ('canvas-prints',       'Canvas Prints',       NULL,         2, false, 'prints'),
  ('wall-art',            'Wall Art',            NULL,         3, false, 'prints'),
  ('posters',             'Posters',             NULL,         4, false, 'prints'),
  ('calendars',           'Calendars',           NULL,         5, false, 'prints'),
  ('cards',               'Cards',               NULL,         6, false, 'prints'),
  ('apparel-prints',      'Apparel',             NULL,         7, false, 'prints'),
  ('home-living-prints',  'Home & Living',       NULL,         8, false, 'prints')
ON CONFLICT (slug) DO NOTHING;
