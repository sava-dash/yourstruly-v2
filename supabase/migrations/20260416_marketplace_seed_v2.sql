-- ============================================================================
-- Marketplace seed v2: +155 new products across 25+ brands, all categories
-- ============================================================================
-- Idempotent: each INSERT uses WHERE NOT EXISTS (name + brand_name).
-- No alcohol products. Apply via Supabase SQL Editor or supabase db push.
-- ============================================================================

-- ── APPLE (8 products) ──────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple AirPods Max', 'Apple', 'apple',
       'Over-ear headphones with computational audio, spatial sound, and a breathtaking aluminum build.',
       'goody', 54900, 54900,
       '["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800"]'::jsonb,
       true, true, 94, ARRAY['birthday','graduation','anniversary'],
       ARRAY['tech','headphones-audio','best-sellers'], ARRAY['best_seller'],
       'high', 'The headphones people build wishlists around.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple AirPods Max' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple iPad mini (6th Gen)', 'Apple', 'apple',
       'Portable powerhouse with A15 chip, 8.3" Liquid Retina display, and Apple Pencil support.',
       'goody', 49900, 49900,
       '["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800"]'::jsonb,
       true, true, 91, ARRAY['birthday','graduation','holiday'],
       ARRAY['tech','best-sellers'], ARRAY['best_seller'],
       'high', 'The perfect size for reading, sketching, and everything in between.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple iPad mini (6th Gen)' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple MagSafe Duo Charger', 'Apple', 'apple',
       'Foldable charger for iPhone and Apple Watch. Perfect nightstand companion.',
       'goody', 12900, 12900,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','holiday','just-because'],
       ARRAY['tech','office'], ARRAY['best_seller'],
       'medium', 'Two devices, one elegant pad. Traveler''s dream.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple MagSafe Duo Charger' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple Watch Ultra 2 Band (Alpine Loop)', 'Apple', 'apple',
       'Lightweight, durable Alpine Loop band designed for outdoor adventures. Fits Apple Watch Ultra.',
       'goody', 9900, 9900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','fathers-day'],
       ARRAY['tech','fashion-accessories'], ARRAY['best_seller'],
       'low', 'The kind of accessory upgrade people appreciate but never buy themselves.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple Watch Ultra 2 Band (Alpine Loop)' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple HomePod mini', 'Apple', 'apple',
       'Room-filling sound in a tiny orb. Siri, smart home control, and Intercom built in.',
       'goody', 9900, 9900,
       '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','birthday','holiday'],
       ARRAY['tech','home-tech'], ARRAY['best_seller'],
       'medium', 'A surprisingly great speaker hiding behind a smart-home label.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple HomePod mini' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple Pencil (2nd Gen)', 'Apple', 'apple',
       'Pixel-perfect precision with tilt and pressure sensitivity. Magnetically attaches and charges.',
       'goody', 12900, 12900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','graduation'],
       ARRAY['tech','office'], ARRAY['best_seller'],
       'medium', 'Unlocks the creative side of any iPad.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple Pencil (2nd Gen)' AND brand_name='Apple');

-- ── BOSE (6 products) ───────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose QuietComfort Ultra Earbuds', 'Bose', 'bose',
       'True wireless earbuds with world-class noise cancellation and immersive spatial audio.',
       'goody', 29900, 29900,
       '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]'::jsonb,
       true, true, 92, ARRAY['birthday','graduation','anniversary'],
       ARRAY['tech','headphones-audio','best-sellers'], ARRAY['best_seller'],
       'high', 'The earbuds that make commutes disappear.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose QuietComfort Ultra Earbuds' AND brand_name='Bose');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose SoundLink Revolve+ II', 'Bose', 'bose',
       'Portable Bluetooth speaker with true 360-degree sound and 17 hours of battery life.',
       'goody', 32900, 32900,
       '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','housewarming'],
       ARRAY['tech','headphones-audio'], ARRAY['best_seller'],
       'medium', 'Fill a backyard without finding the "sweet spot" for sound.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose SoundLink Revolve+ II' AND brand_name='Bose');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose Frames Tempo Sport Sunglasses', 'Bose', 'bose',
       'Sport sunglasses with open-ear Bose audio. Music and awareness on every run.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','fathers-day'],
       ARRAY['tech','headphones-audio','wellness'], ARRAY[],
       'medium', 'Audio sunglasses that actually sound good. A niche that Bose owns.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose Frames Tempo Sport Sunglasses' AND brand_name='Bose');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose Sport Earbuds', 'Bose', 'bose',
       'Sweat and weather-resistant earbuds with StayHear Max tips. Built for the gym.',
       'goody', 17900, 17900,
       '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','just-because'],
       ARRAY['tech','headphones-audio','wellness'], ARRAY[],
       'medium', 'The workout earbuds that stay put through anything.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose Sport Earbuds' AND brand_name='Bose');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose SoundLink Micro Speaker', 'Bose', 'bose',
       'Ultra-portable waterproof speaker that clips to a backpack. Surprisingly big sound for its size.',
       'goody', 11900, 11900,
       '["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','graduation','thank-you'],
       ARRAY['tech','headphones-audio','travel-outdoors'], ARRAY[],
       'low', 'Clip-on speaker for hiking, biking, or backyard hangs.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose SoundLink Micro Speaker' AND brand_name='Bose');

-- ── SONY (5 products) ───────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sony WF-1000XM5 Wireless Earbuds', 'Sony', 'sony',
       'The world''s smallest noise-cancelling earbuds with Hi-Res audio. Studio quality in your pocket.',
       'goody', 29800, 29800,
       '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]'::jsonb,
       true, true, 91, ARRAY['birthday','graduation'],
       ARRAY['tech','headphones-audio','best-sellers'], ARRAY['best_seller'],
       'high', 'Tiny enough to forget you are wearing them. Until someone talks to you.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sony WF-1000XM5 Wireless Earbuds' AND brand_name='Sony');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sony SRS-XB100 Portable Speaker', 'Sony', 'sony',
       'Ultra-portable Bluetooth speaker with IP67 waterproof rating and 16 hours of playtime.',
       'goody', 5800, 5800,
       '["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','thank-you'],
       ARRAY['tech','headphones-audio'], ARRAY[],
       'low', 'The under-$60 speaker that punches way above its weight.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sony SRS-XB100 Portable Speaker' AND brand_name='Sony');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sony LinkBuds Open-Ear Earbuds', 'Sony', 'sony',
       'Open-ring design lets ambient sound through. Perfect for the office or daily commute.',
       'goody', 17800, 17800,
       '["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','just-because'],
       ARRAY['tech','headphones-audio'], ARRAY[],
       'medium', 'For people who want music but still need to hear the world.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sony LinkBuds Open-Ear Earbuds' AND brand_name='Sony');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sony SRS-XG300 Party Speaker', 'Sony', 'sony',
       'Mega bass party speaker with 25 hours of battery, IP67 waterproof, and built-in handle.',
       'goody', 34800, 34800,
       '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','graduation','housewarming'],
       ARRAY['tech','headphones-audio'], ARRAY[],
       'medium', 'The speaker that turns a backyard into a venue.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sony SRS-XG300 Party Speaker' AND brand_name='Sony');

-- ── THERABODY (5 products) ──────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Theragun Pro (5th Gen)', 'Therabody', 'therabody',
       'Professional-grade percussive therapy device with adjustable arm and OLED screen. The gold standard.',
       'goody', 59900, 59900,
       '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"]'::jsonb,
       true, true, 90, ARRAY['birthday','fathers-day','anniversary'],
       ARRAY['tech','wellness-tech','wellness','best-sellers'], ARRAY['best_seller'],
       'high', 'The device physical therapists keep in their own homes.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Theragun Pro (5th Gen)' AND brand_name='Therabody');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Therabody Wave Roller', 'Therabody', 'therabody',
       'Vibrating foam roller with five intensity settings. Warm up faster, recover smarter.',
       'goody', 14900, 14900,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','just-because'],
       ARRAY['wellness','wellness-tech'], ARRAY[],
       'medium', 'Makes foam rolling something you actually look forward to.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Therabody Wave Roller' AND brand_name='Therabody');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Therabody RecoveryAir JetBoots', 'Therabody', 'therabody',
       'Pneumatic compression boots for full-leg recovery. What pro athletes use after every game.',
       'goody', 89900, 89900,
       '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','anniversary'],
       ARRAY['wellness','wellness-tech'], ARRAY[],
       'high', 'A splurge that pays back in faster recovery, night after night.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Therabody RecoveryAir JetBoots' AND brand_name='Therabody');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Therabody PowerDot 2.0 Uno', 'Therabody', 'therabody',
       'Smart muscle stimulator controlled by an app. Targeted pain relief on the go.',
       'goody', 19900, 19900,
       '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','just-because'],
       ARRAY['wellness','wellness-tech'], ARRAY[],
       'medium', 'App-guided electric muscle stim that actually works.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Therabody PowerDot 2.0 Uno' AND brand_name='Therabody');

-- ── BROOKLINEN (5 products) ─────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brooklinen Down Comforter (Lightweight)', 'Brooklinen', 'brooklinen',
       'Ethically sourced down in a sateen shell. Three warmth levels available.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 88, ARRAY['wedding','housewarming','anniversary'],
       ARRAY['home','best-sellers'], ARRAY['best_seller'],
       'high', 'The comforter that ends the "too hot / too cold" argument.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brooklinen Down Comforter (Lightweight)' AND brand_name='Brooklinen');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brooklinen Down Pillow (Plush)', 'Brooklinen', 'brooklinen',
       'Hotel-quality down pillow with a soft, sink-in feel. OEKO-TEX certified.',
       'goody', 6900, 6900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 82, ARRAY['wedding','housewarming'],
       ARRAY['home'], ARRAY[],
       'medium', 'The pillow upgrade people rave about at brunch.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brooklinen Down Pillow (Plush)' AND brand_name='Brooklinen');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brooklinen Super-Plush Bath Towels (Set of 2)', 'Brooklinen', 'brooklinen',
       'Turkish cotton towels that feel like a spa. Gets softer with every wash.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','wedding'],
       ARRAY['home'], ARRAY[],
       'medium', 'Nobody buys themselves nice towels. That is what gifts are for.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brooklinen Super-Plush Bath Towels (Set of 2)' AND brand_name='Brooklinen');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brooklinen Waffle Robe', 'Brooklinen', 'brooklinen',
       'Lightweight waffle-knit robe in Turkish cotton. Luxurious without the bulk.',
       'goody', 9800, 9800,
       '["https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800"]'::jsonb,
       true, true, 85, ARRAY['wedding','anniversary','mothers-day'],
       ARRAY['home','wellness'], ARRAY[],
       'high', 'The robe that makes every morning feel like vacation.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brooklinen Waffle Robe' AND brand_name='Brooklinen');

-- ── YETI (5 products) ───────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'YETI Hopper Flip 12 Soft Cooler', 'YETI', 'yeti',
       'Leakproof soft cooler that holds 12 cans plus ice. Built to survive a tailgate.',
       'goody', 25000, 25000,
       '["https://images.unsplash.com/photo-1551845041-63e8e76836ea?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','fathers-day'],
       ARRAY['travel-outdoors','best-sellers'], ARRAY['best_seller'],
       'medium', 'The soft cooler with hard-cooler insulation.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='YETI Hopper Flip 12 Soft Cooler' AND brand_name='YETI');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'YETI Rambler 10oz Wine Tumbler', 'YETI', 'yeti',
       'Double-wall vacuum insulated wine tumbler with MagSlider lid. Keeps drinks at temperature.',
       'goody', 2500, 2500,
       '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','housewarming','thank-you'],
       ARRAY['travel-outdoors','home'], ARRAY[],
       'low', 'The tumbler that makes patio season last longer.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='YETI Rambler 10oz Wine Tumbler' AND brand_name='YETI');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'YETI Tundra 35 Hard Cooler', 'YETI', 'yeti',
       'Rotomolded hard cooler that keeps ice for days. Bear-resistant and virtually indestructible.',
       'goody', 32500, 32500,
       '["https://images.unsplash.com/photo-1551845041-63e8e76836ea?w=800"]'::jsonb,
       true, true, 87, ARRAY['birthday','fathers-day','wedding'],
       ARRAY['travel-outdoors'], ARRAY['best_seller'],
       'high', 'The cooler that outlives the truck you carry it in.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='YETI Tundra 35 Hard Cooler' AND brand_name='YETI');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'YETI Rambler 36oz Bottle', 'YETI', 'yeti',
       'Triple-insulated stainless steel bottle with chug cap. Keeps water cold through a double workout.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','thank-you','graduation'],
       ARRAY['travel-outdoors','wellness'], ARRAY[],
       'medium', 'Hefty, reliable, and worth every ounce.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='YETI Rambler 36oz Bottle' AND brand_name='YETI');

-- ── LE CREUSET (4 products) ─────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Le Creuset Signature Skillet (10.25")', 'Le Creuset', 'le-creuset',
       'Enameled cast-iron skillet with helper handle. Sears, bakes, and goes from stove to table.',
       'goody', 22000, 22000,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 87, ARRAY['wedding','housewarming','birthday'],
       ARRAY['home','food-drinks','best-sellers'], ARRAY['best_seller'],
       'high', 'The pan people pass down to their kids.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Le Creuset Signature Skillet (10.25")' AND brand_name='Le Creuset');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Le Creuset Classic Whistling Kettle', 'Le Creuset', 'le-creuset',
       'Enameled steel kettle in iconic Le Creuset colors. A stovetop statement piece.',
       'goody', 10000, 10000,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 83, ARRAY['housewarming','wedding','birthday'],
       ARRAY['home','food-drinks'], ARRAY[],
       'medium', 'Makes boiling water feel like an event.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Le Creuset Classic Whistling Kettle' AND brand_name='Le Creuset');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Le Creuset Heritage Baking Dish (3qt)', 'Le Creuset', 'le-creuset',
       'Stoneware baking dish with scalloped handles. Freezer, oven, broiler, and table safe.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 81, ARRAY['housewarming','wedding'],
       ARRAY['home','food-drinks'], ARRAY[],
       'medium', 'Casserole dish that doubles as a serving piece.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Le Creuset Heritage Baking Dish (3qt)' AND brand_name='Le Creuset');

-- ── GODIVA (4 products) ─────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Godiva Dark Chocolate Assortment (24pc)', 'Godiva', 'godiva',
       'Curated collection of dark chocolate truffles, ganaches, and pralines. Elegant gold box.',
       'goody', 4200, 4200,
       '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','anniversary','thank-you','valentines'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['gift_of_choice'],
       'medium', 'Dark chocolate for grown-up taste buds.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Godiva Dark Chocolate Assortment (24pc)' AND brand_name='Godiva');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Godiva Hot Cocoa Gift Set', 'Godiva', 'godiva',
       'Three flavors of Belgian hot cocoa mix with a ceramic mug. Cozy in a box.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 79, ARRAY['holiday','birthday','sympathy'],
       ARRAY['food-drinks','gift-baskets'], ARRAY[],
       'medium', 'The gift that warms from the inside out.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Godiva Hot Cocoa Gift Set' AND brand_name='Godiva');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Godiva Chocolate Biscuit Collection', 'Godiva', 'godiva',
       'Belgian chocolate-enrobed butter biscuits in a keepsake tin. 36 pieces of indulgence.',
       'goody', 3200, 3200,
       '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]'::jsonb,
       true, true, 78, ARRAY['holiday','thank-you','birthday'],
       ARRAY['food-drinks'], ARRAY[],
       'low', 'The tin that gets repurposed for sewing supplies. As it should.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Godiva Chocolate Biscuit Collection' AND brand_name='Godiva');

-- ── AWAY (4 products) ───────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Away The Bigger Carry-On', 'Away', 'away',
       'The extra-roomy carry-on for 5+ day trips. Same ejectable battery, TSA-approved lock.',
       'goody', 29500, 29500,
       '["https://images.unsplash.com/photo-1553531087-b25a0b9ec89f?w=800"]'::jsonb,
       true, true, 88, ARRAY['graduation','wedding','birthday'],
       ARRAY['travel-outdoors','best-sellers'], ARRAY['best_seller'],
       'high', 'The carry-on for people who refuse to check a bag.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Away The Bigger Carry-On' AND brand_name='Away');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Away The Toiletry Bag', 'Away', 'away',
       'Water-resistant dopp kit with interior pockets and magnetic closure. Travel-tested design.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1553531087-b25a0b9ec89f?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','graduation','just-because'],
       ARRAY['travel-outdoors'], ARRAY[],
       'low', 'The travel bag that stops the leak-in-the-suitcase problem.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Away The Toiletry Bag' AND brand_name='Away');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Away Packing Cubes (Set of 4)', 'Away', 'away',
       'Color-coded packing cubes in four sizes. The organization hack frequent travelers swear by.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1553531087-b25a0b9ec89f?w=800"]'::jsonb,
       true, true, 78, ARRAY['graduation','birthday'],
       ARRAY['travel-outdoors'], ARRAY[],
       'low', 'Once you pack with cubes, there is no going back.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Away Packing Cubes (Set of 4)' AND brand_name='Away');

-- ── MARINE LAYER (3 products) ───────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Marine Layer Corbet Reversible Pullover', 'Marine Layer', 'marine-layer',
       'Two looks in one: solid on one side, stripe on the other. Their signature buttery softness.',
       'goody', 12800, 12800,
       '["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','holiday','fathers-day'],
       ARRAY['fashion-accessories'], ARRAY[],
       'medium', 'The pullover that becomes someone''s uniform.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Marine Layer Corbet Reversible Pullover' AND brand_name='Marine Layer');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Marine Layer Signature Crew T-Shirt', 'Marine Layer', 'marine-layer',
       'Made from recycled beechwood fiber. The softest t-shirt anyone has ever owned.',
       'goody', 4800, 4800,
       '["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"]'::jsonb,
       true, true, 78, ARRAY['birthday','just-because'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'low', 'A tee you feel guilty putting in the dryer.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Marine Layer Signature Crew T-Shirt' AND brand_name='Marine Layer');

-- ── ALLBIRDS (3 products) ───────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Allbirds Tree Runner', 'Allbirds', 'allbirds',
       'Eucalyptus tree fiber sneakers. Breezy, lightweight, and machine-washable.',
       'goody', 9800, 9800,
       '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','fathers-day'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'medium', 'The warm-weather alternative to the Wool Runner.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Allbirds Tree Runner' AND brand_name='Allbirds');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Allbirds Mizzle (Wool Runner Water-Repellent)', 'Allbirds', 'allbirds',
       'Merino wool sneakers with a water-repellent bio-based shield. Rainy day confidence.',
       'goody', 12500, 12500,
       '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','holiday'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'medium', 'All the Allbirds comfort with puddle protection.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Allbirds Mizzle (Wool Runner Water-Repellent)' AND brand_name='Allbirds');

-- ── LOVEVERY (3 products) ───────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Lovevery The Play Gym', 'Lovevery', 'lovevery',
       'Award-winning baby play gym with 5 developmental zones. Designed with child development experts.',
       'goody', 14000, 14000,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 91, ARRAY['new-baby'],
       ARRAY['baby-kids','best-sellers'], ARRAY['best_seller'],
       'high', 'The baby gift that makes you look like you know what you are doing.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Lovevery The Play Gym' AND brand_name='Lovevery');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Lovevery Block Set', 'Lovevery', 'lovevery',
       '70 solid wood blocks in 18 colors, shapes, and sizes. The building toy that grows with kids.',
       'goody', 9000, 9000,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','new-baby'],
       ARRAY['baby-kids'], ARRAY[],
       'medium', 'Heirloom-quality blocks that outlast the childhood.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Lovevery Block Set' AND brand_name='Lovevery');

-- ── DIPTYQUE (3 products) ───────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Diptyque Figuier Reed Diffuser', 'Diptyque', 'diptyque',
       'Fig tree-scented reed diffuser. Three months of fragrance without a flame.',
       'goody', 9800, 9800,
       '["https://images.unsplash.com/photo-1602607847082-1c88a1c6c4e0?w=800"]'::jsonb,
       true, true, 86, ARRAY['housewarming','birthday','mothers-day'],
       ARRAY['home','wellness'], ARRAY['gift_of_choice'],
       'medium', 'Set it and forget it. Your room smells like a garden for months.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Diptyque Figuier Reed Diffuser' AND brand_name='Diptyque');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Diptyque Velvet Hand Lotion', 'Diptyque', 'diptyque',
       'Rich hand lotion with shea butter and aloe vera. The luxury your hands deserve.',
       'goody', 4800, 4800,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 80, ARRAY['mothers-day','birthday','thank-you'],
       ARRAY['wellness','home'], ARRAY[],
       'low', 'A small luxury that sits on the counter like an art piece.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Diptyque Velvet Hand Lotion' AND brand_name='Diptyque');

-- ── STANLEY (3 products) ────────────────────────────────────────────────────

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Stanley Quencher H2.0 FlowState (40oz)', 'Stanley', 'stanley',
       'The viral tumbler with a handle, straw, and three-position lid. Keeps drinks cold for 11 hours.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]'::jsonb,
       true, true, 90, ARRAY['birthday','thank-you','graduation'],
       ARRAY['travel-outdoors','best-sellers'], ARRAY['best_seller'],
       'medium', 'The tumbler that launched a thousand TikToks. Still earns it.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Stanley Quencher H2.0 FlowState (40oz)' AND brand_name='Stanley');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Stanley Classic Legendary Bottle (1.5qt)', 'Stanley', 'stanley',
       'The heritage vacuum bottle. Keeps drinks hot 40 hours or cold 35 hours. Lifetime warranty.',
       'goody', 4400, 4400,
       '["https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"]'::jsonb,
       true, true, 83, ARRAY['fathers-day','birthday'],
       ARRAY['travel-outdoors'], ARRAY[],
       'medium', 'The thermos your grandpa had. Now you understand why.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Stanley Classic Legendary Bottle (1.5qt)' AND brand_name='Stanley');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Stanley IceFlow Flip Straw (30oz)', 'Stanley', 'stanley',
       'Leak-proof flip straw tumbler that fits in a car cupholder. Double-wall vacuum insulated.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','thank-you'],
       ARRAY['travel-outdoors'], ARRAY[],
       'low', 'The cupholder-friendly Stanley for everyday commuters.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Stanley IceFlow Flip Straw (30oz)' AND brand_name='Stanley');

-- ── ADDITIONAL BRANDS (2-4 products each) ───────────────────────────────────

-- Hydro Flask
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Hydro Flask 24oz Standard Mouth', 'Hydro Flask', 'hydro-flask',
       'TempShield insulation keeps drinks cold 24 hours or hot 12. Durable powder-coated finish.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','graduation','thank-you'],
       ARRAY['travel-outdoors','wellness'], ARRAY[],
       'low', 'The bottle that outlasts college and keeps going.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Hydro Flask 24oz Standard Mouth' AND brand_name='Hydro Flask');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Hydro Flask Insulated Food Jar (20oz)', 'Hydro Flask', 'hydro-flask',
       'Vacuum insulated food jar that keeps soup hot or salad cold for hours. Leak-proof.',
       'goody', 4000, 4000,
       '["https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"]'::jsonb,
       true, true, 78, ARRAY['birthday','just-because'],
       ARRAY['travel-outdoors','food-drinks'], ARRAY[],
       'low', 'Lunch at your desk never tasted this good.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Hydro Flask Insulated Food Jar (20oz)' AND brand_name='Hydro Flask');

-- Fellow (coffee gear)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fellow Stagg EKG Electric Kettle', 'Fellow', 'fellow',
       'Precision pour-over kettle with variable temperature control and a stunning minimalist design.',
       'goody', 16500, 16500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 89, ARRAY['housewarming','wedding','birthday'],
       ARRAY['home','food-drinks'], ARRAY['best_seller'],
       'high', 'The kettle that made pour-over coffee mainstream.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fellow Stagg EKG Electric Kettle' AND brand_name='Fellow');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fellow Carter Everywhere Mug (16oz)', 'Fellow', 'fellow',
       'Ceramic-coated travel mug with a true-taste lid. Coffee stays hot and tasting right.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','thank-you','just-because'],
       ARRAY['food-drinks','travel-outdoors'], ARRAY[],
       'low', 'The travel mug that does not make your coffee taste like metal.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fellow Carter Everywhere Mug (16oz)' AND brand_name='Fellow');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fellow Ode Brew Grinder Gen 2', 'Fellow', 'fellow',
       'Single-dose flat-burr coffee grinder with 31 settings. Quiet, precise, gorgeous.',
       'goody', 29500, 29500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 87, ARRAY['birthday','housewarming','wedding'],
       ARRAY['home','food-drinks'], ARRAY[],
       'high', 'The grinder that makes you cancel the coffee shop subscription.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fellow Ode Brew Grinder Gen 2' AND brand_name='Fellow');

-- Ember (smart mug)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Ember Mug 2 (14oz)', 'Ember', 'ember',
       'Temperature-controlled smart mug that keeps coffee at your perfect temp for 80 minutes.',
       'goody', 14995, 14995,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','housewarming','holiday'],
       ARRAY['tech','home-tech','food-drinks'], ARRAY['best_seller'],
       'medium', 'Never lukewarm again. It sounds silly until you try it.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Ember Mug 2 (14oz)' AND brand_name='Ember');

-- Our Place (kitchen)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Our Place Always Pan 2.0', 'Our Place', 'our-place',
       'The do-everything pan: braise, sear, steam, fry, boil in one. Replaces 8 pieces of cookware.',
       'goody', 15000, 15000,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 88, ARRAY['wedding','housewarming','birthday'],
       ARRAY['home','food-drinks','best-sellers'], ARRAY['best_seller'],
       'high', 'The pan with a million-person waitlist. Worth the hype.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Our Place Always Pan 2.0' AND brand_name='Our Place');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Our Place Perfect Pot', 'Our Place', 'our-place',
       'Replaces your Dutch oven, stock pot, and more. Non-toxic ceramic coating and modular design.',
       'goody', 16500, 16500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 85, ARRAY['wedding','housewarming'],
       ARRAY['home','food-drinks'], ARRAY[],
       'high', 'One pot to rule them all. Seriously.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Our Place Perfect Pot' AND brand_name='Our Place');

-- Caraway (cookware)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Caraway Cookware Set (12-piece)', 'Caraway', 'caraway',
       'Non-toxic ceramic-coated cookware in beautiful colors. Comes with magnetic pan storage.',
       'goody', 39500, 39500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 87, ARRAY['wedding','housewarming'],
       ARRAY['home','food-drinks','best-sellers'], ARRAY['best_seller'],
       'high', 'The Instagram kitchen set that actually cooks well.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Caraway Cookware Set (12-piece)' AND brand_name='Caraway');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Caraway Bakeware Set (11-piece)', 'Caraway', 'caraway',
       'Non-toxic ceramic bakeware with a storage organizer. Sheet pans, muffin tin, loaf pan, and more.',
       'goody', 29500, 29500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 83, ARRAY['wedding','housewarming','birthday'],
       ARRAY['home','food-drinks'], ARRAY[],
       'medium', 'Baking gear that stores flat and looks like furniture.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Caraway Bakeware Set (11-piece)' AND brand_name='Caraway');

-- Bearaby (weighted blanket)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bearaby Cotton Napper (15lbs)', 'Bearaby', 'bearaby',
       'Hand-knit organic cotton weighted blanket. No beads, no fillers, just heavy, breathable fabric.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 88, ARRAY['birthday','mothers-day','sympathy'],
       ARRAY['home','wellness'], ARRAY['best_seller'],
       'high', 'The weighted blanket that does not feel like a medical device.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bearaby Cotton Napper (15lbs)' AND brand_name='Bearaby');

-- Casper (sleep)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Casper Glow Light', 'Casper', 'casper',
       'A portable warm light that dims on a schedule. Flip it to turn on, twist to dim. Sleep ritual magic.',
       'goody', 12900, 12900,
       '["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','new-baby','birthday'],
       ARRAY['home','wellness','home-tech'], ARRAY[],
       'medium', 'The bedside gadget that replaced the phone-as-flashlight habit.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Casper Glow Light' AND brand_name='Casper');

-- Aesop (skincare)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Aesop Resurrection Aromatique Hand Balm', 'Aesop', 'aesop',
       'Cult-favorite botanical hand balm. Nourishes dry skin without greasiness.',
       'goody', 3700, 3700,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 85, ARRAY['mothers-day','birthday','thank-you'],
       ARRAY['wellness','fashion-accessories'], ARRAY['best_seller'],
       'medium', 'The hand cream people recognize by the bottle.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Aesop Resurrection Aromatique Hand Balm' AND brand_name='Aesop');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Aesop Departure Travel Kit', 'Aesop', 'aesop',
       'Shampoo, conditioner, body wash, balm, and mouthwash in TSA-friendly sizes.',
       'goody', 6500, 6500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 83, ARRAY['graduation','birthday','just-because'],
       ARRAY['wellness','travel-outdoors'], ARRAY[],
       'medium', 'The travel kit that makes a hotel shower feel like a spa.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Aesop Departure Travel Kit' AND brand_name='Aesop');

-- Mejuri (jewelry)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Mejuri Bold Hoop Earrings (Gold Vermeil)', 'Mejuri', 'mejuri',
       'Chunky gold vermeil hoops. Everyday luxury without the fine jewelry price.',
       'goody', 6800, 6800,
       '["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','anniversary','mothers-day','valentines'],
       ARRAY['fashion-accessories'], ARRAY['best_seller'],
       'high', 'The earrings that go with literally everything.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Mejuri Bold Hoop Earrings (Gold Vermeil)' AND brand_name='Mejuri');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Mejuri Croissant Dome Ring', 'Mejuri', 'mejuri',
       'Sculptural gold vermeil ring with a twisted croissant shape. Bold yet wearable.',
       'goody', 5800, 5800,
       '["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','anniversary','valentines'],
       ARRAY['fashion-accessories'], ARRAY[],
       'medium', 'Statement jewelry that becomes a signature piece.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Mejuri Croissant Dome Ring' AND brand_name='Mejuri');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Mejuri Pendant Necklace (14k Gold)', 'Mejuri', 'mejuri',
       'Delicate 14k solid gold pendant on a fine chain. Minimal, meaningful, forever.',
       'goody', 14800, 14800,
       '["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"]'::jsonb,
       true, true, 87, ARRAY['anniversary','valentines','graduation'],
       ARRAY['fashion-accessories'], ARRAY['personalized'],
       'high', 'The necklace that never comes off.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Mejuri Pendant Necklace (14k Gold)' AND brand_name='Mejuri');

-- Cotopaxi (outdoor/sustainable)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cotopaxi Del Dia Bataan 3L Fanny Pack', 'Cotopaxi', 'cotopaxi',
       'One-of-a-kind colorway from repurposed fabric. Every pack is unique.',
       'goody', 4000, 4000,
       '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','graduation'],
       ARRAY['travel-outdoors','earth-month','fashion-accessories'], ARRAY[],
       'medium', 'No two are alike. Sustainable and conversation-starting.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cotopaxi Del Dia Bataan 3L Fanny Pack' AND brand_name='Cotopaxi');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cotopaxi Fuego Hooded Down Jacket', 'Cotopaxi', 'cotopaxi',
       'Responsibly sourced 800-fill down in a unique colorway. Lightweight, packable, and warm.',
       'goody', 22000, 22000,
       '["https://images.unsplash.com/photo-1583275095-7a6e85d23f65?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','holiday','graduation'],
       ARRAY['travel-outdoors','earth-month','fashion-accessories'], ARRAY[],
       'high', 'A jacket that starts conversations and survives adventures.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cotopaxi Fuego Hooded Down Jacket' AND brand_name='Cotopaxi');

-- Soma (water filter)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Soma Plant-Based Water Filter Pitcher', 'Soma', 'soma',
       'Beautiful glass pitcher with plant-based filter. Sustainable hydration that looks gorgeous.',
       'goody', 5900, 5900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 78, ARRAY['housewarming','just-because'],
       ARRAY['home','earth-month'], ARRAY[],
       'low', 'The water pitcher you leave on the counter on purpose.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Soma Plant-Based Water Filter Pitcher' AND brand_name='Soma');

-- Baggu (bags)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Baggu Standard Reusable Bag (Set of 3)', 'Baggu', 'baggu',
       'Ripstop nylon reusable bags that fold into a tiny pouch. Holds 50lbs each.',
       'goody', 3600, 3600,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 79, ARRAY['just-because','housewarming'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'low', 'The reusable bags you actually remember to bring.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Baggu Standard Reusable Bag (Set of 3)' AND brand_name='Baggu');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Baggu Puffy Laptop Sleeve (13")', 'Baggu', 'baggu',
       'Quilted recycled nylon laptop sleeve in fun prints. Padded protection that pops.',
       'goody', 3200, 3200,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 77, ARRAY['graduation','birthday'],
       ARRAY['tech','fashion-accessories','earth-month'], ARRAY[],
       'low', 'Laptop protection that doubles as a statement piece.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Baggu Puffy Laptop Sleeve (13")' AND brand_name='Baggu');

-- Courant (wireless charging)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Courant CATCH:3 Wireless Charging Tray', 'Courant', 'courant',
       'Leather-wrapped wireless charging pad that holds a phone, watch, and earbuds. Nightstand art.',
       'goody', 17500, 17500,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 85, ARRAY['housewarming','wedding','anniversary'],
       ARRAY['tech','office','home-tech'], ARRAY[],
       'medium', 'The charging pad that deserves its spot on the nightstand.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Courant CATCH:3 Wireless Charging Tray' AND brand_name='Courant');

-- Nespresso
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Nespresso Vertuo Next Machine', 'Nespresso', 'nespresso',
       'Single-serve coffee and espresso maker with centrifusion technology. Five cup sizes.',
       'goody', 17900, 17900,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 86, ARRAY['housewarming','birthday','wedding'],
       ARRAY['home','food-drinks','home-tech'], ARRAY['best_seller'],
       'high', 'Cafe-quality coffee in 30 seconds. Every morning.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Nespresso Vertuo Next Machine' AND brand_name='Nespresso');

-- Slip (silk)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Slip Silk Pillowcase (Queen)', 'Slip', 'slip',
       'Pure mulberry silk pillowcase. Better for skin, hair, and sleep quality.',
       'goody', 8900, 8900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','mothers-day','anniversary'],
       ARRAY['home','wellness'], ARRAY['best_seller'],
       'medium', 'The beauty secret hiding on your pillow.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Slip Silk Pillowcase (Queen)' AND brand_name='Slip');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Slip Silk Sleep Mask', 'Slip', 'slip',
       'Padded pure silk sleep mask with an adjustable strap. Total darkness, zero pressure.',
       'goody', 5000, 5000,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','just-because','mothers-day'],
       ARRAY['wellness','travel-outdoors'], ARRAY[],
       'low', 'The sleep mask upgrade from scratchy airline freebies.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Slip Silk Sleep Mask' AND brand_name='Slip');

-- MasterClass (experience)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'MasterClass Annual Membership', 'MasterClass', 'masterclass',
       'Unlimited access to 200+ classes taught by world-class experts. Learn cooking, writing, music, and more.',
       'goody', 12000, 12000,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','graduation','holiday','just-because'],
       ARRAY['gift-of-choice','best-sellers'], ARRAY['gift_of_choice','best_seller'],
       'high', 'A gift that sparks curiosity. Gordon Ramsay teaches you to cook.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='MasterClass Annual Membership' AND brand_name='MasterClass');

-- Uncommon Goods (personalized)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Star Map Print', 'Uncommon Goods', 'uncommon-goods',
       'A framed print of the night sky from any date and location. Perfect for anniversaries and birthdays.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 83, ARRAY['anniversary','wedding','birthday','valentines'],
       ARRAY['personalized','home'], ARRAY['personalized'],
       'high', 'The stars aligned, literally. Deeply personal.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Star Map Print' AND brand_name='Uncommon Goods');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Personalized Cutting Board (Walnut)', 'Uncommon Goods', 'uncommon-goods',
       'Solid walnut cutting board laser-engraved with names, dates, or a recipe. Heirloom kitchen art.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 82, ARRAY['wedding','housewarming','anniversary'],
       ARRAY['personalized','home','food-drinks'], ARRAY['personalized'],
       'medium', 'A cutting board with a story. Doubles as wall art.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Personalized Cutting Board (Walnut)' AND brand_name='Uncommon Goods');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Birthstone Necklace', 'Uncommon Goods', 'uncommon-goods',
       'Minimalist gold-fill necklace with hand-set genuine birthstone. Dainty and meaningful.',
       'goody', 6800, 6800,
       '["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','mothers-day','anniversary'],
       ARRAY['personalized','fashion-accessories'], ARRAY['personalized'],
       'high', 'Personal jewelry without being over the top.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Birthstone Necklace' AND brand_name='Uncommon Goods');

-- Gravity Blanket
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Gravity Weighted Blanket (15lbs)', 'Gravity', 'gravity',
       'Fine-grid stitching keeps glass beads evenly distributed. Clinically studied for better sleep.',
       'goody', 18900, 18900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','sympathy','just-because'],
       ARRAY['wellness','home'], ARRAY[],
       'high', 'A hug you can schedule for 8 hours a night.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Gravity Weighted Blanket (15lbs)' AND brand_name='Gravity');

-- Bala (fitness)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bala Bangles (1lb Set)', 'Bala', 'bala',
       'Sleek wrist and ankle weights in silicone wrap. Add resistance to any movement.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','new-year','mothers-day'],
       ARRAY['wellness','fashion-accessories'], ARRAY[],
       'medium', 'Fitness gear that looks like jewelry. Shark Tank famous.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bala Bangles (1lb Set)' AND brand_name='Bala');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bala The Play Mat', 'Bala', 'bala',
       'Ultra-thick 6mm exercise mat in muted tones. Cushioned, non-slip, gorgeous.',
       'goody', 9900, 9900,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','new-year'],
       ARRAY['wellness'], ARRAY[],
       'medium', 'The exercise mat you do not hide in a closet.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bala The Play Mat' AND brand_name='Bala');

-- W&P Design (food storage)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'W&P Porter Lunch Bowl', 'W&P', 'w-and-p',
       'Ceramic-coated lunch bowl with snap-tight silicone lid. Microwave and dishwasher safe.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 78, ARRAY['just-because','housewarming'],
       ARRAY['home','food-drinks','earth-month'], ARRAY[],
       'low', 'Lunch at the office that does not come in sad plastic.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='W&P Porter Lunch Bowl' AND brand_name='W&P');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'W&P Craft Cocktail Syrup Set (Non-Alcoholic)', 'W&P', 'w-and-p',
       'Four botanical cocktail syrups for mocktails: lavender, ginger, citrus, and rosemary. No alcohol included.',
       'goody', 4200, 4200,
       '["https://images.unsplash.com/photo-1497515114889-6c89ed13e1a6?w=800"]'::jsonb,
       true, true, 80, ARRAY['housewarming','birthday','just-because'],
       ARRAY['food-drinks'], ARRAY[],
       'medium', 'Make fancy mocktails without a bartending degree.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='W&P Craft Cocktail Syrup Set (Non-Alcoholic)' AND brand_name='W&P');

-- Brightland (olive oil)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brightland The Duo (AWAKE + ALIVE)', 'Brightland', 'brightland',
       'Two bottles of California extra-virgin olive oil: AWAKE (basil) and ALIVE (lemon). Gift-boxed.',
       'goody', 5400, 5400,
       '["https://images.unsplash.com/photo-1620705928394-1da2d3c1b7f5?w=800"]'::jsonb,
       true, true, 83, ARRAY['housewarming','wedding','birthday'],
       ARRAY['food-drinks'], ARRAY[],
       'medium', 'Olive oil that looks like it belongs in a gallery. Tastes even better.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brightland The Duo (AWAKE + ALIVE)' AND brand_name='Brightland');

-- Pura (smart fragrance)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Pura Smart Fragrance Diffuser Starter Set', 'Pura', 'pura',
       'App-controlled smart diffuser with two premium fragrance vials. Schedule scents by time of day.',
       'goody', 6500, 6500,
       '["https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800"]'::jsonb,
       true, true, 82, ARRAY['housewarming','birthday'],
       ARRAY['home','home-tech'], ARRAY[],
       'medium', 'Your home smells different morning vs. evening. Automatically.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Pura Smart Fragrance Diffuser Starter Set' AND brand_name='Pura');

-- Pendleton (blankets)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Pendleton National Park Throw Blanket', 'Pendleton', 'pendleton',
       'Pure virgin wool blanket in iconic National Park patterns. Made in the USA since 1863.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 86, ARRAY['wedding','housewarming','holiday'],
       ARRAY['home','travel-outdoors'], ARRAY[],
       'high', 'A blanket with 160 years of history. Lasts another 160.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Pendleton National Park Throw Blanket' AND brand_name='Pendleton');

-- Smeg (kitchen)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Smeg Retro Electric Kettle', 'Smeg', 'smeg',
       'Italian-designed retro kettle in pastel colors. 1.7L capacity with soft-open lid.',
       'goody', 19500, 19500,
       '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800"]'::jsonb,
       true, true, 83, ARRAY['housewarming','wedding','birthday'],
       ARRAY['home','food-drinks'], ARRAY[],
       'medium', 'The countertop appliance that becomes the kitchen centerpiece.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Smeg Retro Electric Kettle' AND brand_name='Smeg');

-- Rifle Paper Co.
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Rifle Paper Co. 2026 Bouquet Wall Calendar', 'Rifle Paper Co.', 'rifle-paper-co',
       'Oversized art-print wall calendar with signature floral illustrations. Each page is frame-worthy.',
       'goody', 3400, 3400,
       '["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"]'::jsonb,
       true, true, 79, ARRAY['holiday','birthday','just-because'],
       ARRAY['home','personalized'], ARRAY[],
       'low', 'The calendar people keep hanging after December.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Rifle Paper Co. 2026 Bouquet Wall Calendar' AND brand_name='Rifle Paper Co.');

-- Leuchtturm
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Leuchtturm1917 Bullet Journal Edition 2', 'Leuchtturm', 'leuchtturm',
       'The official bullet journal notebook with numbered pages, index, and dotted grid.',
       'goody', 3200, 3200,
       '["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','graduation','new-year'],
       ARRAY['personalized','home'], ARRAY[],
       'medium', 'For the planner who plans how they plan.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Leuchtturm1917 Bullet Journal Edition 2' AND brand_name='Leuchtturm');

-- Manduka (yoga)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Manduka PRO Yoga Mat (6mm)', 'Manduka', 'manduka',
       'Dense, lifetime-guaranteed yoga mat that improves with age. The mat yoga teachers use.',
       'goody', 13000, 13000,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','new-year','mothers-day'],
       ARRAY['wellness'], ARRAY[],
       'medium', 'Buy once, practice forever. Literally guaranteed for life.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Manduka PRO Yoga Mat (6mm)' AND brand_name='Manduka');

-- Gift baskets (YourStruly Curated)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Coffee Lover Curated Box', 'YourStruly Curated', 'yourstruly-curated',
       'Fellow mug, Blue Bottle beans, biscotti, and a linen napkin. Everything for a perfect morning.',
       'goody', 9500, 9500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','thank-you','just-because'],
       ARRAY['gift-baskets','food-drinks'], ARRAY['gift_of_choice'],
       'medium', 'A coffee ritual in a box. Mornings will never be the same.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Coffee Lover Curated Box' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Spa Day Curated Basket', 'YourStruly Curated', 'yourstruly-curated',
       'Slip silk eye mask, Aesop hand balm, Otherland candle, bath salts, and eucalyptus bundle.',
       'goody', 13500, 13500,
       '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"]'::jsonb,
       true, true, 88, ARRAY['mothers-day','birthday','sympathy'],
       ARRAY['gift-baskets','wellness'], ARRAY['gift_of_choice'],
       'high', 'A spa day without leaving home. Send it when words are not enough.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Spa Day Curated Basket' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Adventure Ready Curated Kit', 'YourStruly Curated', 'yourstruly-curated',
       'YETI tumbler, Stasher bags, trail mix, SPF lip balm, and a carabiner. Ready for anything.',
       'goody', 8500, 8500,
       '["https://images.unsplash.com/photo-1551845041-63e8e76836ea?w=800"]'::jsonb,
       true, true, 80, ARRAY['graduation','birthday','fathers-day'],
       ARRAY['gift-baskets','travel-outdoors'], ARRAY['gift_of_choice'],
       'medium', 'Everything for the next adventure, packed and ready.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Adventure Ready Curated Kit' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Welcome Home Curated Box', 'YourStruly Curated', 'yourstruly-curated',
       'Diptyque candle, Graza olive oil, linen towel, and a handwritten card. Housewarming done right.',
       'goody', 11000, 11000,
       '["https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming'],
       ARRAY['gift-baskets','home'], ARRAY['gift_of_choice'],
       'high', 'The housewarming gift that sets the tone for a new chapter.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Welcome Home Curated Box' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Date Night Curated Box', 'YourStruly Curated', 'yourstruly-curated',
       'Godiva truffles, two stemless glasses, a Spotify playlist card, and a scratch-off date ideas booklet.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]'::jsonb,
       true, true, 82, ARRAY['anniversary','valentines'],
       ARRAY['gift-baskets'], ARRAY['gift_of_choice'],
       'high', 'All the ingredients for a memorable evening, minus the reservation.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Date Night Curated Box' AND brand_name='YourStruly Curated');

-- More baby/kids
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cuddle+Kind Hand-Knit Doll (Avery the Lamb)', 'Cuddle+Kind', 'cuddle-and-kind',
       'Hand-knit lamb doll made by artisans in Peru. Each purchase provides 10 meals to children.',
       'goody', 6500, 6500,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 83, ARRAY['new-baby','birthday'],
       ARRAY['baby-kids'], ARRAY['gift_of_choice'],
       'high', 'A toy with a heartbeat. Handmade, impact-driven.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cuddle+Kind Hand-Knit Doll (Avery the Lamb)' AND brand_name='Cuddle+Kind');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Jellycat Bashful Bunny (Medium)', 'Jellycat', 'jellycat',
       'Impossibly soft plush bunny. The stuffed animal that shows up in every baby photo.',
       'goody', 2500, 2500,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 85, ARRAY['new-baby','birthday'],
       ARRAY['baby-kids','best-sellers'], ARRAY['best_seller'],
       'high', 'The first friend. The one they remember.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Jellycat Bashful Bunny (Medium)' AND brand_name='Jellycat');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Maisonette Baby Essentials Gift Set', 'Maisonette', 'maisonette',
       'Organic cotton onesie, muslin swaddle, wooden rattle, and a milestone card set.',
       'goody', 6800, 6800,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 80, ARRAY['new-baby'],
       ARRAY['baby-kids','gift-baskets'], ARRAY[],
       'medium', 'The new-baby gift that looks like you hired a stylist.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Maisonette Baby Essentials Gift Set' AND brand_name='Maisonette');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Tegu Magnetic Wooden Blocks (24-piece)', 'Tegu', 'tegu',
       'Sustainably sourced hardwood blocks with hidden magnets. More pieces, more possibilities.',
       'goody', 7200, 7200,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','holiday'],
       ARRAY['baby-kids','earth-month'], ARRAY[],
       'medium', 'The building toy that teaches physics without trying.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Tegu Magnetic Wooden Blocks (24-piece)' AND brand_name='Tegu');

-- Earth Month / Eco
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bee''s Wrap Assorted Wrap Set', 'Bee''s Wrap', 'bees-wrap',
       'Reusable beeswax food wraps in S/M/L sizes. Replace plastic wrap, naturally.',
       'goody', 2200, 2200,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 77, ARRAY['housewarming','just-because'],
       ARRAY['home','earth-month'], ARRAY[],
       'low', 'A small swap that cuts a lot of plastic.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bee''s Wrap Assorted Wrap Set' AND brand_name='Bee''s Wrap');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Pela Compostable Phone Case', 'Pela', 'pela',
       '100% compostable phone case made from flax plant fibers. Protection that returns to the earth.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 78, ARRAY['birthday','just-because'],
       ARRAY['tech','earth-month'], ARRAY[],
       'low', 'Phone protection without the plastic guilt.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Pela Compostable Phone Case' AND brand_name='Pela');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Ethique Discovery Pack (Face & Body)', 'Ethique', 'ethique',
       'Five mini solid beauty bars: shampoo, conditioner, face wash, body wash, and moisturizer. Zero plastic.',
       'goody', 3000, 3000,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','just-because','mothers-day'],
       ARRAY['wellness','earth-month'], ARRAY[],
       'low', 'Try the plastic-free beauty revolution in sample sizes.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Ethique Discovery Pack (Face & Body)' AND brand_name='Ethique');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Plaine Products Refillable Shampoo Set', 'Plaine Products', 'plaine-products',
       'Aluminum refillable bottles with salon-quality shampoo and conditioner. Ship back empties for refill.',
       'goody', 5400, 5400,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 76, ARRAY['birthday','just-because'],
       ARRAY['wellness','earth-month'], ARRAY[],
       'low', 'Shampoo that never becomes landfill.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Plaine Products Refillable Shampoo Set' AND brand_name='Plaine Products');

-- More food/drinks (no alcohol)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Compartes Chocolate Truffle Collection (16pc)', 'Compartes', 'compartes',
       'LA-based artisan truffles in wild flavors: birthday cake, matcha, peanut butter, and more.',
       'goody', 4800, 4800,
       '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','valentines','thank-you'],
       ARRAY['food-drinks'], ARRAY[],
       'medium', 'Chocolate with a personality. Each flavor is a mini adventure.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Compartes Chocolate Truffle Collection (16pc)' AND brand_name='Compartes');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Levain Bakery Cookie Assortment (8-pack)', 'Levain Bakery', 'levain-bakery',
       'NYC''s famous 6oz cookies shipped fresh. Chocolate chip walnut, dark chocolate chip, and oatmeal raisin.',
       'goody', 4800, 4800,
       '["https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','thank-you','just-because'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['best_seller'],
       'high', 'The cookie that launched a thousand NYC pilgrimages. Now delivered.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Levain Bakery Cookie Assortment (8-pack)' AND brand_name='Levain Bakery');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Trade Coffee Gift Subscription (3 months)', 'Trade Coffee', 'trade-coffee',
       'Personalized coffee subscription matched to their taste. Fresh roasted beans from 55+ roasters.',
       'goody', 6000, 6000,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','holiday','fathers-day'],
       ARRAY['food-drinks','gift-of-choice'], ARRAY['gift_of_choice'],
       'medium', 'A new favorite coffee every two weeks. The gift that keeps brewing.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Trade Coffee Gift Subscription (3 months)' AND brand_name='Trade Coffee');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Beekeeper''s Naturals Honey Gift Set', 'Beekeeper''s Naturals', 'beekeepers-naturals',
       'Raw honey, propolis throat spray, and superfood honey. All sustainably harvested.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1497515114889-6c89ed13e1a6?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','get-well','just-because'],
       ARRAY['food-drinks','wellness','earth-month'], ARRAY[],
       'medium', 'The wellness gift disguised as pantry staples.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Beekeeper''s Naturals Honey Gift Set' AND brand_name='Beekeeper''s Naturals');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Ghia Le Spritz Non-Alcoholic Aperitif (4-pack)', 'Ghia', 'ghia',
       'Mediterranean-inspired non-alcoholic aperitif. Yuzu, elderflower, and rosemary. Ready to sip.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1497515114889-6c89ed13e1a6?w=800"]'::jsonb,
       true, true, 82, ARRAY['housewarming','birthday','just-because'],
       ARRAY['food-drinks'], ARRAY[],
       'medium', 'The sophisticated non-alcoholic drink for grown-up gatherings.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Ghia Le Spritz Non-Alcoholic Aperitif (4-pack)' AND brand_name='Ghia');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Haus of Cocoa Premium Hot Chocolate Set', 'Haus of Cocoa', 'haus-of-cocoa',
       'Four single-origin drinking chocolates from around the world. Just add hot milk.',
       'goody', 3800, 3800,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 78, ARRAY['holiday','birthday','sympathy'],
       ARRAY['food-drinks','gift-baskets'], ARRAY[],
       'medium', 'Hot chocolate for people who think they have had good hot chocolate.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Haus of Cocoa Premium Hot Chocolate Set' AND brand_name='Haus of Cocoa');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Spiceology Luxe Infused Salt Collection', 'Spiceology', 'spiceology',
       'Six artisan infused salts: truffle, smoked, black lava, rosemary, garlic, and sriracha.',
       'goody', 4200, 4200,
       '["https://images.unsplash.com/photo-1497515114889-6c89ed13e1a6?w=800"]'::jsonb,
       true, true, 80, ARRAY['housewarming','birthday','just-because'],
       ARRAY['food-drinks'], ARRAY[],
       'low', 'Instantly upgrade every home-cooked meal with a pinch.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Spiceology Luxe Infused Salt Collection' AND brand_name='Spiceology');

-- More wellness
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Dyson Supersonic Hair Dryer', 'Dyson', 'dyson',
       'Engineered for fast drying with no extreme heat. Intelligent heat control protects hair.',
       'goody', 42900, 42900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 92, ARRAY['birthday','mothers-day','anniversary'],
       ARRAY['wellness','tech','best-sellers'], ARRAY['best_seller'],
       'high', 'The hair dryer that ruined all other hair dryers.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Dyson Supersonic Hair Dryer' AND brand_name='Dyson');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Herbivore Botanicals Self-Love Set', 'Herbivore', 'herbivore',
       'Pink cloud cream, rose body oil, and coconut milk bath soak. Clean beauty trio.',
       'goody', 4900, 4900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','mothers-day','valentines'],
       ARRAY['wellness','gift-baskets'], ARRAY[],
       'medium', 'Self-care that looks as good on a shelf as it feels on skin.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Herbivore Botanicals Self-Love Set' AND brand_name='Herbivore');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Calm Premium Subscription (1 Year)', 'Calm', 'calm',
       'Meditation, sleep stories, and breathing exercises. The wellness app recommended by therapists.',
       'goody', 7000, 7000,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','sympathy','new-year'],
       ARRAY['wellness','gift-of-choice'], ARRAY['gift_of_choice'],
       'high', 'A year of better sleep and calmer days. The gift of peace.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Calm Premium Subscription (1 Year)' AND brand_name='Calm');

-- More personalized
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Personalized Photo Book (Hardcover)', 'Artifact Uprising', 'artifact-uprising',
       'Premium hardcover photo book with lay-flat pages. Upload photos, customize layouts, shipped in days.',
       'goody', 6900, 6900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','anniversary','wedding','mothers-day'],
       ARRAY['personalized'], ARRAY['personalized'],
       'high', 'Turn phone photos into a coffee table book. Guaranteed tears.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Personalized Photo Book (Hardcover)' AND brand_name='Artifact Uprising');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Map Print (Your Location)', 'Grafomap', 'grafomap',
       'Minimalist city map poster of any location in the world. Choose colors and frame style.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 81, ARRAY['housewarming','wedding','anniversary'],
       ARRAY['personalized','home'], ARRAY['personalized'],
       'medium', 'Put a meaningful place on the wall. Where you met, where you live, where you dream.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Map Print (Your Location)' AND brand_name='Grafomap');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Personalized Blanket (Fleece)', 'Uncommon Goods', 'uncommon-goods',
       'Ultra-soft fleece blanket with custom photo collage or monogram. Machine-washable.',
       'goody', 5900, 5900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','mothers-day','holiday'],
       ARRAY['personalized','home'], ARRAY['personalized'],
       'high', 'Wrap up in memories. The personalized gift everyone actually uses.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Personalized Blanket (Fleece)' AND brand_name='Uncommon Goods');

-- More fashion
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Everlane The ReNew Puffer Jacket', 'Everlane', 'everlane',
       'Lightweight puffer made from 100% recycled polyester. Warm, packable, responsible.',
       'goody', 12800, 12800,
       '["https://images.unsplash.com/photo-1583275095-7a6e85d23f65?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','holiday'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'medium', 'The puffer jacket with a transparent supply chain.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Everlane The ReNew Puffer Jacket' AND brand_name='Everlane');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Rothy''s The Point (Black)', 'Rothy''s', 'rothys',
       'Machine-washable flats knit from recycled water bottles. 78 million bottles diverted from landfill.',
       'goody', 14500, 14500,
       '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','mothers-day'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[],
       'medium', 'Flats you can throw in the washing machine. Game changer.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Rothy''s The Point (Black)' AND brand_name='Rothy''s');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Dagne Dover Dakota Backpack (Medium)', 'Dagne Dover', 'dagne-dover',
       'Neoprene backpack with padded laptop sleeve and water bottle pocket. Fits gym gear and work stuff.',
       'goody', 17500, 17500,
       '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]'::jsonb,
       true, true, 82, ARRAY['graduation','birthday'],
       ARRAY['fashion-accessories','travel-outdoors'], ARRAY[],
       'medium', 'The backpack that goes from gym to office without looking weird.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Dagne Dover Dakota Backpack (Medium)' AND brand_name='Dagne Dover');

-- More home / decor
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'HAY Kitchen Market Tote', 'HAY', 'hay',
       'Danish-designed cotton canvas market tote. Simple, sturdy, endlessly useful.',
       'goody', 2800, 2800,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 77, ARRAY['housewarming','just-because'],
       ARRAY['home','fashion-accessories','earth-month'], ARRAY[],
       'low', 'The market bag that makes grocery shopping look stylish.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='HAY Kitchen Market Tote' AND brand_name='HAY');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Coyuchi Organic Cotton Waffle Towel Set', 'Coyuchi', 'coyuchi',
       'GOTS-certified organic cotton towels in a relaxed waffle weave. Naturally dyed, zero synthetic finishes.',
       'goody', 9800, 9800,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 80, ARRAY['housewarming','wedding'],
       ARRAY['home','earth-month'], ARRAY[],
       'medium', 'Towels that are good for the planet and great at their job.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Coyuchi Organic Cotton Waffle Towel Set' AND brand_name='Coyuchi');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Vitruvi Essential Oil Trio (Calm)', 'Vitruvi', 'vitruvi',
       'Three calming essential oils: lavender, eucalyptus, and sleep blend. Pure, steam-distilled.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800"]'::jsonb,
       true, true, 79, ARRAY['birthday','sympathy','just-because'],
       ARRAY['wellness','home'], ARRAY[],
       'low', 'The starter pack for a calmer home.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Vitruvi Essential Oil Trio (Calm)' AND brand_name='Vitruvi');

-- Smart home / tech extras
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Google Nest Hub (2nd Gen)', 'Google', 'google',
       'Smart display with sleep tracking, Google Photos frame mode, and Google Assistant built in.',
       'goody', 9999, 9999,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 83, ARRAY['housewarming','birthday','holiday'],
       ARRAY['tech','home-tech'], ARRAY[],
       'medium', 'A digital photo frame that also controls your house. And tracks sleep.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Google Nest Hub (2nd Gen)' AND brand_name='Google');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Philips Hue Starter Kit (3 Bulbs + Bridge)', 'Philips', 'philips',
       'Smart lighting system with 16 million colors. Control with voice, app, or automation.',
       'goody', 13499, 13499,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','birthday'],
       ARRAY['tech','home-tech'], ARRAY[],
       'medium', 'Movie night, dinner party, and wake-up alarm in one lightbulb.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Philips Hue Starter Kit (3 Bulbs + Bridge)' AND brand_name='Philips');

-- Personalized tumblers/mugs
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Engraved Stanley Quencher (40oz)', 'Stanley', 'stanley',
       'The viral Stanley Quencher with custom laser engraving. Name, date, or message of your choice.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','graduation','thank-you'],
       ARRAY['personalized','travel-outdoors'], ARRAY['personalized','best_seller'],
       'medium', 'The most popular tumbler in the country, made personal.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Engraved Stanley Quencher (40oz)' AND brand_name='Stanley');

-- ── ADDITIONAL PRODUCTS TO ROUND OUT CATEGORIES ─────────────────────────────

-- Aesop (more)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Aesop Reverence Aromatique Hand Wash', 'Aesop', 'aesop',
       'Exfoliating hand wash with mandarin rind, rosemary, and cedar. Turns handwashing into a ritual.',
       'goody', 4300, 4300,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 82, ARRAY['housewarming','birthday'],
       ARRAY['wellness','home'], ARRAY[],
       'medium', 'The soap guests compliment. Every single time.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Aesop Reverence Aromatique Hand Wash' AND brand_name='Aesop');

-- Parachute (more home)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Parachute Linen Duvet Cover', 'Parachute', 'parachute',
       'Garment-washed European linen that gets softer every wash. Effortless, lived-in luxury.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"]'::jsonb,
       true, true, 87, ARRAY['wedding','housewarming','anniversary'],
       ARRAY['home','best-sellers'], ARRAY['best_seller'],
       'high', 'The duvet cover that makes the bed look unmade on purpose.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Parachute Linen Duvet Cover' AND brand_name='Parachute');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Parachute Turkish Cotton Bath Sheet Set', 'Parachute', 'parachute',
       'Oversized bath sheets in long-staple Turkish cotton. Spa vibes, home address.',
       'goody', 11900, 11900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 83, ARRAY['wedding','housewarming'],
       ARRAY['home'], ARRAY[],
       'medium', 'A towel big enough to wrap up in. Pure luxury.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Parachute Turkish Cotton Bath Sheet Set' AND brand_name='Parachute');

-- More tech
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fujifilm Instax Mini Film (60 Shots)', 'Fujifilm', 'fujifilm',
       'Three twin-packs of instant film for Instax Mini cameras. Credit-card-sized prints.',
       'goody', 4000, 4000,
       '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"]'::jsonb,
       true, true, 78, ARRAY['birthday','just-because'],
       ARRAY['tech','film-cameras'], ARRAY[],
       'low', 'The consumable that keeps an instant camera alive and clicking.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fujifilm Instax Mini Film (60 Shots)' AND brand_name='Fujifilm');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Anker Soundcore Liberty 4 NC Earbuds', 'Anker', 'anker',
       'Budget-friendly ANC earbuds with Hi-Res audio and 50-hour total battery. Punches way above its price.',
       'goody', 9999, 9999,
       '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','graduation'],
       ARRAY['tech','headphones-audio'], ARRAY[],
       'medium', 'The noise-cancelling earbuds that do not require a trust fund.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Anker Soundcore Liberty 4 NC Earbuds' AND brand_name='Anker');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Peak Design Travel Backpack (30L)', 'Peak Design', 'peak-design',
       'Expandable camera/travel backpack with weatherproof shell and MagLatch access. Photographer approved.',
       'goody', 29995, 29995,
       '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','graduation','anniversary'],
       ARRAY['travel-outdoors','tech'], ARRAY[],
       'high', 'The last travel backpack you will ever need to buy.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Peak Design Travel Backpack (30L)' AND brand_name='Peak Design');

-- Skincare / wellness extras
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Tatcha Dewy Skin Cream', 'Tatcha', 'tatcha',
       'Rich plumping cream with Japanese purple rice and algae. Celeb-favorite for glowing skin.',
       'goody', 6900, 6900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','mothers-day','valentines'],
       ARRAY['wellness','fashion-accessories'], ARRAY['best_seller'],
       'medium', 'The moisturizer behind every "what is your skincare routine" compliment.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Tatcha Dewy Skin Cream' AND brand_name='Tatcha');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sunday Riley Good Genes Lactic Acid Set', 'Sunday Riley', 'sunday-riley',
       'Cult-favorite lactic acid treatment + CEO moisturizer travel set. Instant glow.',
       'goody', 5800, 5800,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','mothers-day'],
       ARRAY['wellness'], ARRAY[],
       'medium', 'The skincare set that converts skeptics.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sunday Riley Good Genes Lactic Acid Set' AND brand_name='Sunday Riley');

-- More food
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Laird Superfood Creamer Trio', 'Laird Superfood', 'laird-superfood',
       'Three plant-based coffee creamers: original, cacao, and turmeric. Clean ingredients, great flavor.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800"]'::jsonb,
       true, true, 77, ARRAY['birthday','just-because'],
       ARRAY['food-drinks','wellness'], ARRAY[],
       'low', 'Upgrade morning coffee without the junk.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Laird Superfood Creamer Trio' AND brand_name='Laird Superfood');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Rao''s Homemade Sauce Gift Set', 'Rao''s', 'raos',
       'Three jars of NYC''s famous marinara, arrabbiata, and vodka sauce. Restaurant quality at home.',
       'goody', 3200, 3200,
       '["https://images.unsplash.com/photo-1497515114889-6c89ed13e1a6?w=800"]'::jsonb,
       true, true, 80, ARRAY['housewarming','birthday','just-because'],
       ARRAY['food-drinks'], ARRAY[],
       'low', 'The sauce people hoard when it goes on sale.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Rao''s Homemade Sauce Gift Set' AND brand_name='Rao''s');

-- More gift baskets
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fitness Lover Curated Box', 'YourStruly Curated', 'yourstruly-curated',
       'Bala bangles, Hydro Flask, protein bars, and a sweat towel. Everything for a great workout.',
       'goody', 8900, 8900,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','new-year'],
       ARRAY['gift-baskets','wellness'], ARRAY['gift_of_choice'],
       'medium', 'Fuel the fitness obsession. Thoughtfully assembled.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fitness Lover Curated Box' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Tech Essentials Curated Box', 'YourStruly Curated', 'yourstruly-curated',
       'Native Union cable, Anker power bank mini, screen wipes, and a Baggu laptop sleeve.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 80, ARRAY['graduation','birthday'],
       ARRAY['gift-baskets','tech'], ARRAY['gift_of_choice'],
       'medium', 'Everything they need, nothing they already have.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Tech Essentials Curated Box' AND brand_name='YourStruly Curated');

-- More baby/kids
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Aden + Anais Swaddle Blankets (4-Pack)', 'Aden + Anais', 'aden-anais',
       'Breathable muslin swaddle blankets in gentle prints. The new-parent registry essential.',
       'goody', 5000, 5000,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 84, ARRAY['new-baby'],
       ARRAY['baby-kids','best-sellers'], ARRAY['best_seller'],
       'medium', 'The swaddle blankets that turn into everything: burp cloth, stroller cover, nursing shield.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Aden + Anais Swaddle Blankets (4-Pack)' AND brand_name='Aden + Anais');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Hatch Rest+ Sound Machine', 'Hatch', 'hatch',
       'Wi-Fi enabled sound machine, night light, and time-to-rise alert for kids. App-controlled.',
       'goody', 6999, 6999,
       '["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800"]'::jsonb,
       true, true, 86, ARRAY['new-baby','birthday'],
       ARRAY['baby-kids','tech','home-tech'], ARRAY['best_seller'],
       'high', 'The sound machine parents credit for sleeping through the night.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Hatch Rest+ Sound Machine' AND brand_name='Hatch');

-- More fashion/accessories
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bombas Gripper Slipper (4-Pack)', 'Bombas', 'bombas',
       'Cozy slipper socks with non-slip grip. For every pair bought, one is donated.',
       'goody', 6400, 6400,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 80, ARRAY['holiday','birthday','just-because'],
       ARRAY['fashion-accessories','wellness'], ARRAY[],
       'low', 'Warm feet, warm heart, charitable impact.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bombas Gripper Slipper (4-Pack)' AND brand_name='Bombas');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Barefoot Dreams CozyChic Socks (3-Pack)', 'Barefoot Dreams', 'barefoot-dreams',
       'Ultra-plush microfiber socks in heathered colors. The loungewear staple.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 78, ARRAY['holiday','birthday','just-because'],
       ARRAY['fashion-accessories','wellness'], ARRAY[],
       'low', 'Socks so soft they feel illegal.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Barefoot Dreams CozyChic Socks (3-Pack)' AND brand_name='Barefoot Dreams');

-- More personalized
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Sound Wave Art Print', 'Uncommon Goods', 'uncommon-goods',
       'A visual art print of any sound wave: a song, a voice message, a heartbeat. Framed or unframed.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 82, ARRAY['anniversary','wedding','valentines'],
       ARRAY['personalized','home'], ARRAY['personalized'],
       'high', 'Turn "I love you" into wall art. Science meets romance.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Sound Wave Art Print' AND brand_name='Uncommon Goods');

-- More earth month
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Blueland Cleaning Kit', 'Blueland', 'blueland',
       'Reusable Forever bottles + dissolvable cleaning tablets. Bathroom, kitchen, glass. Zero plastic waste.',
       'goody', 3900, 3900,
       '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]'::jsonb,
       true, true, 79, ARRAY['housewarming','just-because'],
       ARRAY['home','earth-month'], ARRAY[],
       'low', 'Cleaning products that clean the planet too.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Blueland Cleaning Kit' AND brand_name='Blueland');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Nimble Recycled Cable (USB-C to Lightning)', 'Nimble', 'nimble',
       'Made from recycled fishing nets and e-waste. Certified recycled materials, premium braided build.',
       'goody', 2500, 2500,
       '["https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800"]'::jsonb,
       true, true, 76, ARRAY['just-because','birthday'],
       ARRAY['tech','office','earth-month'], ARRAY[],
       'low', 'A charging cable made from ocean waste. Progress.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Nimble Recycled Cable (USB-C to Lightning)' AND brand_name='Nimble');

-- More home candles
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Boy Smells Cedar Stack Candle', 'Boy Smells', 'boy-smells',
       'Coconut beeswax candle with cedar, black pepper, and amber. Unisex, moody, gorgeous pink glass.',
       'goody', 3600, 3600,
       '["https://images.unsplash.com/photo-1602607847082-1c88a1c6c4e0?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','housewarming','holiday'],
       ARRAY['home'], ARRAY[],
       'medium', 'The candle that smells like fall and looks like art.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Boy Smells Cedar Stack Candle' AND brand_name='Boy Smells');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'P.F. Candle Co. Amber & Moss Candle', 'P.F. Candle Co.', 'pf-candle-co',
       'Soy wax candle in an apothecary-inspired amber jar. 40-hour burn time.',
       'goody', 2600, 2600,
       '["https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800"]'::jsonb,
       true, true, 80, ARRAY['housewarming','birthday','thank-you'],
       ARRAY['home'], ARRAY[],
       'low', 'The evergreen scent that works in every room, every season.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='P.F. Candle Co. Amber & Moss Candle' AND brand_name='P.F. Candle Co.');

-- Gaming
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Backbone One Mobile Game Controller', 'Backbone', 'backbone',
       'Console-quality controller for iPhone. Play any game with physical controls. Lightning or USB-C.',
       'goody', 9999, 9999,
       '["https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','graduation'],
       ARRAY['tech','gaming'], ARRAY[],
       'medium', 'Turns an iPhone into a handheld console. Travels everywhere.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Backbone One Mobile Game Controller' AND brand_name='Backbone');

-- Razer (gaming peripherals)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Razer Kraken V3 Gaming Headset', 'Razer', 'razer',
       'THX Spatial Audio gaming headset with haptic feedback. Hear footsteps before you see them.',
       'goody', 9999, 9999,
       '["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','graduation'],
       ARRAY['tech','gaming','headphones-audio'], ARRAY[],
       'medium', 'Gaming audio that gives a competitive edge.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Razer Kraken V3 Gaming Headset' AND brand_name='Razer');

-- Travel adapter
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Twelve South PowerPic Mod Wireless Charger', 'Twelve South', 'twelve-south',
       'Wireless charger disguised as a picture frame. Display a photo while your phone charges.',
       'goody', 7995, 7995,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 79, ARRAY['housewarming','birthday'],
       ARRAY['tech','office','home-tech'], ARRAY[],
       'low', 'A wireless charger that doubles as decor. Finally.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Twelve South PowerPic Mod Wireless Charger' AND brand_name='Twelve South');

-- Crosley (turntable)
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Crosley Voyager Turntable', 'Crosley', 'crosley',
       'Bluetooth-enabled turntable with built-in speakers. Vintage styling, modern connectivity.',
       'goody', 8995, 8995,
       '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','graduation','housewarming'],
       ARRAY['tech','headphones-audio','home'], ARRAY[],
       'high', 'The gateway to vinyl. Bluetooth out when you want real speakers.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Crosley Voyager Turntable' AND brand_name='Crosley');

-- ── FINAL HOUSEKEEPING ──────────────────────────────────────────────────────

-- Ensure starting_price_cents is always populated
UPDATE marketplace_products
   SET starting_price_cents = base_price_cents
 WHERE starting_price_cents IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Analyze for query planner
ANALYZE marketplace_products;
