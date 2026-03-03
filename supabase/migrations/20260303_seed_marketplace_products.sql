-- Seed curated marketplace products
-- These are example gift products for the YoursTruly marketplace

INSERT INTO marketplace_products (
  name,
  description,
  provider,
  base_price_cents,
  images,
  in_stock,
  is_curated,
  curated_score,
  occasions,
  emotional_impact,
  why_we_love_it,
  is_active
) VALUES
-- Premium Gifts ($100+)
(
  'Brooklinen Luxe Core Sheet Set',
  'Hotel-quality 480 thread count sateen sheets that feel like sleeping on a cloud. Perfect for creating lasting comfort.',
  'goody',
  19900,
  '["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"]',
  true,
  true,
  95,
  '{"wedding", "housewarming", "anniversary", "birthday"}',
  'high',
  'Nothing says "I want you to rest well" like luxury bedding. These sheets last for years and become more comfortable over time.',
  true
),
(
  'Apple AirPods Pro (2nd Gen)',
  'Premium wireless earbuds with active noise cancellation and spatial audio. A gift that improves daily life.',
  'goody',
  24900,
  '["https://images.unsplash.com/photo-1606220838315-056192d5e927?w=800"]',
  true,
  true,
  92,
  '{"birthday", "graduation", "congratulations", "christmas"}',
  'high',
  'Tech gifts that people actually use every day are the best kind. These become indispensable.',
  true
),
(
  'Bose SoundLink Flex Bluetooth Speaker',
  'Waterproof portable speaker with rich, room-filling sound. Perfect for outdoor adventures or relaxing at home.',
  'goody',
  14900,
  '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]',
  true,
  true,
  88,
  '{"birthday", "housewarming", "graduation", "congratulations"}',
  'medium',
  'Music brings people together. This speaker goes anywhere and sounds amazing.',
  true
),

-- Mid-Range Gifts ($50-100)
(
  'YETI Rambler 20oz Tumbler',
  'Vacuum-insulated stainless steel tumbler that keeps drinks hot or cold for hours. Virtually indestructible.',
  'goody',
  3800,
  '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]',
  true,
  true,
  90,
  '{"birthday", "congratulations", "thank you", "christmas"}',
  'medium',
  'A daily companion that reminds someone of you every time they take a sip. The YETI quality is legendary.',
  true
),
(
  'Godiva Signature Chocolate Tower',
  'Luxurious assortment of Godiva''s finest chocolates in an elegant gift tower. 45+ pieces of pure indulgence.',
  'goody',
  7500,
  '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]',
  true,
  true,
  85,
  '{"birthday", "anniversary", "sympathy", "thank you", "congratulations"}',
  'high',
  'Chocolate is the universal language of love. This tower makes any moment feel special.',
  true
),
(
  'Voluspa Candle Gift Set',
  'Set of 3 hand-poured candles in elegant textured glass. Luxurious fragrances that transform any space.',
  'goody',
  6500,
  '["https://images.unsplash.com/photo-1602607745657-71f5e0f8f8f2?w=800"]',
  true,
  true,
  87,
  '{"housewarming", "birthday", "sympathy", "thank you"}',
  'medium',
  'Candles create atmosphere and memories. These burn clean and smell absolutely divine.',
  true
),
(
  'Le Creuset Stoneware Mug Set',
  'Set of 4 iconic stoneware mugs in classic colors. Chip-resistant and perfect for morning rituals.',
  'goody',
  8500,
  '["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800"]',
  true,
  true,
  86,
  '{"housewarming", "wedding", "christmas", "birthday"}',
  'medium',
  'These mugs become family heirlooms. Every morning coffee becomes a small luxury.',
  true
),

-- Thoughtful Gifts ($25-50)
(
  'Rifle Paper Co. Floral Journal Set',
  'Beautiful hardcover journals with gold foil details and lay-flat binding. Perfect for capturing thoughts and memories.',
  'goody',
  4200,
  '["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"]',
  true,
  true,
  82,
  '{"birthday", "graduation", "congratulations", "sympathy"}',
  'high',
  'Writing is therapy. These journals are too beautiful to leave blank.',
  true
),
(
  'Anthropologie Monogram Mug',
  'Hand-painted stoneware mug with a gilded letter. Personal yet universally loved.',
  'goody',
  1600,
  '["https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800"]',
  true,
  true,
  80,
  '{"birthday", "thank you", "christmas", "housewarming"}',
  'medium',
  'Simple personalization goes a long way. This becomes their favorite mug.',
  true
),
(
  'Spa Luxetique Bath Bomb Gift Set',
  '12 handcrafted bath bombs with essential oils. Transform bath time into a spa experience.',
  'goody',
  2800,
  '["https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=800"]',
  true,
  true,
  78,
  '{"birthday", "sympathy", "thank you", "self-care"}',
  'medium',
  'Everyone deserves a moment of relaxation. These make self-care feel luxurious.',
  true
),
(
  'Harry & David Classic Pear Box',
  'Famous Royal Riviera Pears, hand-picked at peak ripeness. A classic gift that never disappoints.',
  'goody',
  3900,
  '["https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=800"]',
  true,
  true,
  84,
  '{"thank you", "sympathy", "congratulations", "birthday"}',
  'medium',
  'Fresh fruit gifts are unexpectedly delightful. These pears are legendary for a reason.',
  true
),

-- Budget-Friendly ($15-25)
(
  'Burt''s Bees Tips and Toes Kit',
  'Essential collection of Burt''s Bees favorites including hand salve, lip balm, and cuticle cream.',
  'goody',
  1500,
  '["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800"]',
  true,
  true,
  75,
  '{"birthday", "thank you", "christmas", "self-care"}',
  'low',
  'Natural skincare that actually works. Perfect for anyone who needs a little pampering.',
  true
),
(
  'Starbucks Reserve Coffee Collection',
  'Premium whole bean coffee duo featuring rare, small-lot coffees from around the world.',
  'goody',
  2400,
  '["https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800"]',
  true,
  true,
  79,
  '{"birthday", "thank you", "christmas", "congratulations"}',
  'medium',
  'For the coffee lover who thinks they''ve tried everything. These rare beans are a revelation.',
  true
),
(
  'Sugarfina Sweet & Sparkling Bento Box',
  'Curated collection of Sugarfina''s champagne-inspired candies in a beautiful bento-style box.',
  'goody',
  2800,
  '["https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800"]',
  true,
  true,
  81,
  '{"birthday", "congratulations", "anniversary", "thank you"}',
  'medium',
  'Grown-up candy for grown-up celebrations. These make any moment feel like a toast.',
  true
);

-- Update indexes for faster filtering
ANALYZE marketplace_products;
