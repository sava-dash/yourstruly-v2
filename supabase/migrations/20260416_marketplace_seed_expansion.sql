-- ============================================================================
-- Marketplace seed expansion: +60 real products across brands & categories
-- ============================================================================
-- Idempotent: each INSERT is guarded on NOT EXISTS (name, brand_name) so
-- re-running won't duplicate. No alcohol products. Prices are realistic
-- list prices at time of authoring (Apr 2026); on-sale fields left null.
-- ============================================================================

-- Helper: we insert one product at a time using WHERE NOT EXISTS so
-- partial re-runs are safe even if a single insert was rolled back.

-- ── TECH: HEADPHONES & AUDIO ─────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bose QuietComfort Ultra Headphones', 'Bose', 'bose',
       'Over-ear headphones with best-in-class noise cancellation and immersive spatial audio. The gold standard for travel.',
       'goody', 42900, 42900,
       '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]'::jsonb,
       true, true, 93, ARRAY['birthday','graduation','anniversary'],
       ARRAY['tech','headphones-audio','best-sellers'], ARRAY['best_seller'],
       'high', 'A splurge-worthy upgrade people thank you for every commute.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bose QuietComfort Ultra Headphones' AND brand_name='Bose');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sony WH-1000XM5 Wireless Headphones', 'Sony', 'sony',
       'Industry-leading noise cancellation, 30-hour battery, and crystal-clear calls. A travel-lover''s best friend.',
       'goody', 39900, 39900,
       '["https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800"]'::jsonb,
       true, true, 91, ARRAY['birthday','graduation'],
       ARRAY['tech','headphones-audio','best-sellers'], ARRAY['best_seller'],
       'high', 'Quietly the best headphones on the market, year after year.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sony WH-1000XM5 Wireless Headphones' AND brand_name='Sony');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Marshall Emberton II Portable Speaker', 'Marshall', 'marshall',
       'Rugged portable speaker with iconic Marshall sound and 30+ hours of playtime. Waterproof and ready for anything.',
       'goody', 16900, 16900,
       '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','housewarming','graduation'],
       ARRAY['tech','headphones-audio'], ARRAY['best_seller'],
       'medium', 'Looks like a tiny amp, sounds like a serious one.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Marshall Emberton II Portable Speaker' AND brand_name='Marshall');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'JBL Flip 6 Waterproof Speaker', 'JBL', 'jbl',
       'Bold sound in a pocket-size speaker. IP67 waterproof and dustproof for pool, beach, or backyard.',
       'goody', 9900, 9900,
       '["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800"]'::jsonb,
       true, true, 82, ARRAY['birthday','graduation','thank-you'],
       ARRAY['tech','headphones-audio'], ARRAY[]::TEXT[],
       'medium', 'The under-$100 portable speaker we recommend by default.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='JBL Flip 6 Waterproof Speaker' AND brand_name='JBL');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sonos Roam 2 Portable Speaker', 'Sonos', 'sonos',
       'WiFi + Bluetooth speaker that sounds huge for its size. Waterproof, drop-resistant, travels anywhere.',
       'goody', 17900, 17900,
       '["https://images.unsplash.com/photo-1589001181560-a46ab9b97dca?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','housewarming'],
       ARRAY['tech','headphones-audio','home-tech'], ARRAY[]::TEXT[],
       'medium', 'Sonos quality in a grab-and-go size.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sonos Roam 2 Portable Speaker' AND brand_name='Sonos');

-- ── TECH: OFFICE / ACCESSORIES ───────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Native Union Belt Cable (USB-C)', 'Native Union', 'native-union',
       'Braided 10ft USB-C charging cable with leather strap. The charging cable people actually keep for years.',
       'goody', 3500, 3500,
       '["https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800"]'::jsonb,
       true, true, 81, ARRAY['thank-you','just-because','graduation'],
       ARRAY['tech','office'], ARRAY['best_seller'],
       'low', 'Small gift, daily payoff. Beautifully made.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Native Union Belt Cable (USB-C)' AND brand_name='Native Union');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Native Union Dock Wireless Charger', 'Native Union', 'native-union',
       'Weighted fabric-wrapped wireless charger that doubles as a phone stand. Office eye candy.',
       'goody', 7900, 7900,
       '["https://images.unsplash.com/photo-1558909366-7e5e7e7e0f28?w=800"]'::jsonb,
       true, true, 83, ARRAY['housewarming','birthday'],
       ARRAY['tech','office','home-tech'], ARRAY[]::TEXT[],
       'medium', 'Makes a desk look like a magazine spread.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Native Union Dock Wireless Charger' AND brand_name='Native Union');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Apple AirTag (4-pack)', 'Apple', 'apple',
       'Track keys, bags, and luggage with pinpoint precision. The stocking stuffer everyone actually uses.',
       'goody', 9900, 9900,
       '["https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800"]'::jsonb,
       true, true, 88, ARRAY['birthday','holiday','just-because'],
       ARRAY['tech','office'], ARRAY['best_seller'],
       'medium', 'An unglamorous gift that people notice every single week.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Apple AirTag (4-pack)' AND brand_name='Apple');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Anker 737 Power Bank (140W)', 'Anker', 'anker',
       '24,000mAh power bank fast enough to charge a laptop. The travel-day lifesaver.',
       'goody', 14900, 14900,
       '["https://images.unsplash.com/photo-1609592373913-e64c19d97e0b?w=800"]'::jsonb,
       true, true, 84, ARRAY['graduation','birthday','just-because'],
       ARRAY['tech','office','travel-outdoors'], ARRAY[]::TEXT[],
       'medium', 'The only power bank that really keeps up with modern laptops.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Anker 737 Power Bank (140W)' AND brand_name='Anker');

-- ── TECH: HOME TECH ──────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Hatch Restore 2 Sunrise Alarm', 'Hatch', 'hatch',
       'Wakes you with a sunrise, puts you to sleep with calming sounds. Cult-favorite sleep aid.',
       'goody', 19900, 19900,
       '["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"]'::jsonb,
       true, true, 89, ARRAY['housewarming','new-baby','wedding'],
       ARRAY['tech','home-tech','wellness','wellness-tech'], ARRAY['best_seller'],
       'high', 'Quietly rewires someone''s whole sleep routine.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Hatch Restore 2 Sunrise Alarm' AND brand_name='Hatch');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Kindle Paperwhite (11th Gen)', 'Amazon', 'amazon',
       'Glare-free 6.8" display, weeks of battery, waterproof for the tub. A reader''s dream.',
       'goody', 14999, 14999,
       '["https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=800"]'::jsonb,
       true, true, 88, ARRAY['birthday','graduation','mothers-day'],
       ARRAY['tech','home-tech'], ARRAY['best_seller'],
       'high', 'Still the best under-$200 gift for book people.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Kindle Paperwhite (11th Gen)' AND brand_name='Amazon');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Vitruvi Stone Diffuser', 'Vitruvi', 'vitruvi',
       'Handcrafted ceramic diffuser that disperses essential oils for up to 8 hours. A home ritual in an object.',
       'goody', 12000, 12000,
       '["https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','wedding','mothers-day'],
       ARRAY['home','wellness'], ARRAY[]::TEXT[],
       'medium', 'Doubles as sculpture. Friends ask where it''s from.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Vitruvi Stone Diffuser' AND brand_name='Vitruvi');

-- ── TECH: WELLNESS TECH ──────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Theragun Mini (2nd Gen)', 'Therabody', 'therabody',
       'Pocket-size percussive massager. The everyday recovery tool that actually gets used.',
       'goody', 19900, 19900,
       '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800"]'::jsonb,
       true, true, 92, ARRAY['birthday','fathers-day','mothers-day'],
       ARRAY['tech','wellness-tech','wellness'], ARRAY['best_seller'],
       'high', 'Small enough to live in a gym bag. Big enough to fix a knot.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Theragun Mini (2nd Gen)' AND brand_name='Therabody');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Therabody SmartGoggles', 'Therabody', 'therabody',
       'Heated, vibrating eye massager with three guided programs. Migraine and screen-fatigue relief.',
       'goody', 19900, 19900,
       '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"]'::jsonb,
       true, true, 86, ARRAY['birthday','mothers-day','just-because'],
       ARRAY['tech','wellness-tech','wellness'], ARRAY[]::TEXT[],
       'high', 'Works better than you''d expect. A screen-era essential.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Therabody SmartGoggles' AND brand_name='Therabody');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Oura Ring Gen 3 (Horizon Silver)', 'Oura', 'oura',
       'The sleep-and-recovery ring athletes and CEOs swear by. Paired with a free 30-day membership.',
       'goody', 34900, 34900,
       '["https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?w=800"]'::jsonb,
       true, true, 87, ARRAY['birthday','anniversary','graduation'],
       ARRAY['tech','wellness-tech','wellness'], ARRAY[]::TEXT[],
       'high', 'The data geeks in your life will thank you for years.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Oura Ring Gen 3 (Horizon Silver)' AND brand_name='Oura');

-- ── TECH: FILM & CAMERAS ─────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fujifilm Instax Mini 12', 'Fujifilm', 'fujifilm',
       'Automatic exposure, built-in selfie mode, and the charm of instant film. Pure joy in object form.',
       'goody', 7999, 7999,
       '["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','wedding','graduation','just-because'],
       ARRAY['tech','film-cameras'], ARRAY['best_seller'],
       'high', 'Every party gets better when this comes out.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fujifilm Instax Mini 12' AND brand_name='Fujifilm');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Polaroid Now+ Instant Camera', 'Polaroid', 'polaroid',
       'Classic Polaroid with Bluetooth-connected lens filters and long exposure. Analog with a modern twist.',
       'goody', 14999, 14999,
       '["https://images.unsplash.com/photo-1606986642650-7cd837b0ec09?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','wedding','graduation'],
       ARRAY['tech','film-cameras'], ARRAY[]::TEXT[],
       'high', 'For the friend who romanticizes everything. In a good way.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Polaroid Now+ Instant Camera' AND brand_name='Polaroid');

-- ── TRAVEL & OUTDOORS ────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Away The Carry-On (Aluminum Edition)', 'Away', 'away',
       'Nearly indestructible polycarbonate carry-on with hidden laundry bag and TSA-approved lock.',
       'goody', 27500, 27500,
       '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]'::jsonb,
       true, true, 90, ARRAY['graduation','wedding','anniversary'],
       ARRAY['travel-outdoors','best-sellers'], ARRAY['best_seller'],
       'high', 'A luggage upgrade is one of those gifts people remember for years.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Away The Carry-On (Aluminum Edition)' AND brand_name='Away');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Tumi Alpha Bravo Backpack', 'Tumi', 'tumi',
       'Professional commuter backpack with laptop sleeve, RFID-protected pockets, and legendary ballistic nylon.',
       'goody', 49500, 49500,
       '["https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800"]'::jsonb,
       true, true, 87, ARRAY['graduation','fathers-day','anniversary'],
       ARRAY['travel-outdoors','fashion-accessories'], ARRAY[]::TEXT[],
       'high', 'A backpack that outlasts most laptops you''ll put in it.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Tumi Alpha Bravo Backpack' AND brand_name='Tumi');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Ridge Wallet (Titanium)', 'Ridge', 'ridge',
       'Minimalist RFID-blocking wallet, machined titanium, holds up to 12 cards. Lifetime warranty.',
       'goody', 12500, 12500,
       '["https://images.unsplash.com/photo-1627123424574-724758594e93?w=800"]'::jsonb,
       true, true, 85, ARRAY['graduation','fathers-day','birthday'],
       ARRAY['travel-outdoors','fashion-accessories'], ARRAY['best_seller','personalized'],
       'medium', 'Can be engraved. The wallet upgrade everyone puts off for themselves.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Ridge Wallet (Titanium)' AND brand_name='Ridge');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Peak Design Everyday Sling 6L', 'Peak Design', 'peak-design',
       'Weather-resistant sling for a camera, tablet, or day-out essentials. The quiet hero of travel.',
       'goody', 9995, 9995,
       '["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]'::jsonb,
       true, true, 82, ARRAY['graduation','birthday','just-because'],
       ARRAY['travel-outdoors'], ARRAY[]::TEXT[],
       'medium', 'Peak Design''s cult following is earned.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Peak Design Everyday Sling 6L' AND brand_name='Peak Design');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'YETI Roadie 24 Hard Cooler', 'YETI', 'yeti',
       'Compact cooler that fits where a full-size won''t. Keeps ice for days.',
       'goody', 25000, 25000,
       '["https://images.unsplash.com/photo-1551845041-63e8e76836ea?w=800"]'::jsonb,
       true, true, 80, ARRAY['fathers-day','birthday','wedding'],
       ARRAY['travel-outdoors','home'], ARRAY[]::TEXT[],
       'medium', 'Once you own one, the old cooler looks like a toy.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='YETI Roadie 24 Hard Cooler' AND brand_name='YETI');

-- ── HOME ─────────────────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Parachute Cloud Cotton Robe', 'Parachute', 'parachute',
       'Ultra-soft, waffle-texture robe. The upgrade nobody buys for themselves.',
       'goody', 13900, 13900,
       '["https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800"]'::jsonb,
       true, true, 88, ARRAY['wedding','mothers-day','anniversary'],
       ARRAY['home','wellness','fashion-accessories'], ARRAY['best_seller'],
       'high', 'Hotel-feel every morning, forever.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Parachute Cloud Cotton Robe' AND brand_name='Parachute');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Brooklinen Classic Hardcore Bundle', 'Brooklinen', 'brooklinen',
       'Complete bedding bundle: sheet set + duvet cover + 4 pillowcases in percale or sateen.',
       'goody', 29900, 29900,
       '["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"]'::jsonb,
       true, true, 89, ARRAY['wedding','housewarming','anniversary'],
       ARRAY['home','best-sellers'], ARRAY['best_seller','gift_of_choice'],
       'high', 'One gift, a whole bed transformed.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Brooklinen Classic Hardcore Bundle' AND brand_name='Brooklinen');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Snowe Everyday Dinnerware Set', 'Snowe', 'snowe',
       'Porcelain dinnerware set for 4. Microwave-safe, dishwasher-safe, actually beautiful.',
       'goody', 17400, 17400,
       '["https://images.unsplash.com/photo-1584990347449-a2d4d3e4b8ec?w=800"]'::jsonb,
       true, true, 82, ARRAY['wedding','housewarming'],
       ARRAY['home'], ARRAY[]::TEXT[],
       'medium', 'Sets a table like a restaurant, survives weeknight chaos.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Snowe Everyday Dinnerware Set' AND brand_name='Snowe');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Diptyque Baies Candle', 'Diptyque', 'diptyque',
       'The iconic blackcurrant-and-Bulgarian-rose candle. 60 hours of Parisian apartment.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1602607745657-71f5e0f8f8f2?w=800"]'::jsonb,
       true, true, 91, ARRAY['birthday','anniversary','mothers-day','holiday'],
       ARRAY['home','wellness'], ARRAY['best_seller','gift_of_choice'],
       'high', 'The grown-up candle you recognize before you smell it.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Diptyque Baies Candle' AND brand_name='Diptyque');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Otherland Candle Trio', 'Otherland', 'otherland',
       'Three bestselling Otherland candles in a gift box. Vegan, clean-burning, beautifully packaged.',
       'goody', 11000, 11000,
       '["https://images.unsplash.com/photo-1515837728117-77030532c22a?w=800"]'::jsonb,
       true, true, 84, ARRAY['housewarming','birthday','mothers-day'],
       ARRAY['home','gift-baskets'], ARRAY['gift_of_choice'],
       'medium', 'Candles that are as gift-able as they are pretty on a shelf.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Otherland Candle Trio' AND brand_name='Otherland');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Le Creuset Signature Dutch Oven (5.5qt)', 'Le Creuset', 'le-creuset',
       'The kitchen workhorse that becomes a family heirloom. Enameled cast iron, lifetime warranty.',
       'goody', 42500, 42500,
       '["https://images.unsplash.com/photo-1585515656643-ff5a0a2d3f56?w=800"]'::jsonb,
       true, true, 92, ARRAY['wedding','anniversary','housewarming'],
       ARRAY['home','food-drinks'], ARRAY['best_seller'],
       'high', 'One pot. A thousand dinners. Forever.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Le Creuset Signature Dutch Oven (5.5qt)' AND brand_name='Le Creuset');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Material The iConic Knife', 'Material Kitchen', 'material-kitchen',
       'A single, beautifully engineered chef''s knife. Swedish steel, recycled handle.',
       'goody', 7500, 7500,
       '["https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800"]'::jsonb,
       true, true, 80, ARRAY['wedding','housewarming'],
       ARRAY['home','food-drinks'], ARRAY[]::TEXT[],
       'medium', 'One great knife beats a block of mediocre ones.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Material The iConic Knife' AND brand_name='Material Kitchen');

-- ── FOOD & DRINKS (no alcohol) ───────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Godiva Gold Signature 36-Piece Box', 'Godiva', 'godiva',
       'The classic gold ballotin. 36 signature Belgian chocolates in a gift-ready box.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','anniversary','sympathy','thank-you','valentines'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['best_seller','gift_of_choice'],
       'medium', 'The universal language of "thinking of you."', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Godiva Gold Signature 36-Piece Box' AND brand_name='Godiva');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Vosges Exotic Truffle Collection', 'Vosges Haut-Chocolat', 'vosges',
       '16 award-winning truffles from around the world. For the adventurous palate.',
       'goody', 5000, 5000,
       '["https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','anniversary','thank-you'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['gift_of_choice'],
       'medium', 'Not-your-average chocolate. Exotic, not gimmicky.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Vosges Exotic Truffle Collection' AND brand_name='Vosges Haut-Chocolat');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Harry & David Royal Riviera Pears', 'Harry & David', 'harry-and-david',
       'The iconic pear box: hand-picked, individually wrapped, reliably delicious.',
       'goody', 3900, 3900,
       '["https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=800"]'::jsonb,
       true, true, 82, ARRAY['thank-you','sympathy','holiday','just-because'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['gift_of_choice'],
       'medium', 'A classic that earns its reputation every season.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Harry & David Royal Riviera Pears' AND brand_name='Harry & David');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Mouth Best of the USA Gift Box', 'Mouth', 'mouth',
       'A curated snack tour of small American makers. Always fresh, never boring.',
       'goody', 8500, 8500,
       '["https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800"]'::jsonb,
       true, true, 86, ARRAY['thank-you','housewarming','holiday'],
       ARRAY['food-drinks','gift-baskets'], ARRAY['gift_of_choice'],
       'medium', 'Indie snacks with real stories behind them.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Mouth Best of the USA Gift Box' AND brand_name='Mouth');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Graza Drizzle & Sizzle Duo', 'Graza', 'graza',
       'Two squeeze bottles: "Sizzle" for cooking, "Drizzle" for finishing. Single-origin Spanish olive oil.',
       'goody', 3600, 3600,
       '["https://images.unsplash.com/photo-1620705928394-1da2d3c1b7f5?w=800"]'::jsonb,
       true, true, 88, ARRAY['housewarming','wedding','just-because'],
       ARRAY['food-drinks'], ARRAY['best_seller'],
       'medium', 'The olive oil your most annoying foodie friend won''t shut up about. For good reason.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Graza Drizzle & Sizzle Duo' AND brand_name='Graza');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Fly By Jing Sichuan Chili Crisp Trio', 'Fly By Jing', 'fly-by-jing',
       'Three jars of the cult-favorite Sichuan chili crisp — original, Zhong sauce, and mala spice.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','housewarming','just-because'],
       ARRAY['food-drinks'], ARRAY[]::TEXT[],
       'medium', 'Makes eggs taste like restaurant eggs.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Fly By Jing Sichuan Chili Crisp Trio' AND brand_name='Fly By Jing');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Sugarfina Champagne Bears Bento', 'Sugarfina', 'sugarfina',
       'The famous champagne gummy bears in a gift-ready bento. Playful, grown-up, reliable.',
       'goody', 2800, 2800,
       '["https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','anniversary','thank-you','valentines'],
       ARRAY['food-drinks'], ARRAY[]::TEXT[],
       'low', 'The candy adults tell themselves is sophisticated.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Sugarfina Champagne Bears Bento' AND brand_name='Sugarfina');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Bellocq No. 22 White Duchess Tea', 'Bellocq', 'bellocq',
       'A white tea blend with rose and bergamot in Bellocq''s iconic yellow tin. Proper ritual.',
       'goody', 3800, 3800,
       '["https://images.unsplash.com/photo-1597318236269-fa92a60c8ea1?w=800"]'::jsonb,
       true, true, 81, ARRAY['mothers-day','thank-you','sympathy'],
       ARRAY['food-drinks'], ARRAY[]::TEXT[],
       'medium', 'The tin alone is worth it. The tea is the bonus.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Bellocq No. 22 White Duchess Tea' AND brand_name='Bellocq');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Blue Bottle Signature Coffee Box', 'Blue Bottle Coffee', 'blue-bottle',
       'Three single-origin roasts + tasting notes card. For the coffee person who really cares.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800"]'::jsonb,
       true, true, 84, ARRAY['birthday','thank-you','fathers-day'],
       ARRAY['food-drinks'], ARRAY['gift_of_choice'],
       'medium', 'A mini tasting flight for your kitchen counter.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Blue Bottle Signature Coffee Box' AND brand_name='Blue Bottle Coffee');

-- ── GIFT BASKETS ─────────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cozy Night In Curated Basket', 'YourStruly Curated', 'yourstruly-curated',
       'Cashmere socks, a Diptyque candle, a tin of tea, and a Rifle Paper Co. notebook. Hand-assembled.',
       'goody', 12500, 12500,
       '["https://images.unsplash.com/photo-1608755728617-0d2a0f9bf8fb?w=800"]'::jsonb,
       true, true, 87, ARRAY['sympathy','thank-you','mothers-day','holiday'],
       ARRAY['gift-baskets','home','wellness'], ARRAY['gift_of_choice'],
       'high', 'A hug in a box. Great for hard weeks.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cozy Night In Curated Basket' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'New Parent Survival Kit', 'YourStruly Curated', 'yourstruly-curated',
       'A Lovevery play kit card, a Hatch sound machine, snacks for the grown-ups, and a handwritten note.',
       'goody', 18900, 18900,
       '["https://images.unsplash.com/photo-1604205020544-a84a39d45b54?w=800"]'::jsonb,
       true, true, 86, ARRAY['new-baby'],
       ARRAY['gift-baskets','baby-kids'], ARRAY['gift_of_choice'],
       'high', 'A basket that gifts to the parents, not just the baby.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='New Parent Survival Kit' AND brand_name='YourStruly Curated');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Congratulations Snack Tower', 'YourStruly Curated', 'yourstruly-curated',
       'Graza olive oil, Fly By Jing chili crisp, Vosges chocolate, and a hand-lettered card.',
       'goody', 9500, 9500,
       '["https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=800"]'::jsonb,
       true, true, 82, ARRAY['graduation','thank-you','just-because'],
       ARRAY['gift-baskets','food-drinks'], ARRAY['gift_of_choice'],
       'medium', 'All the pantry heroes, one box.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Congratulations Snack Tower' AND brand_name='YourStruly Curated');

-- ── BABY & KIDS ──────────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Lovevery The Play Kit (3 Months)', 'Lovevery', 'lovevery',
       'Developmentally-staged play kit designed by child specialists. The new-parent go-to.',
       'goody', 8000, 8000,
       '["https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800"]'::jsonb,
       true, true, 90, ARRAY['new-baby'],
       ARRAY['baby-kids','best-sellers'], ARRAY['best_seller'],
       'high', 'Feels thoughtful because it is. Not another onesie.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Lovevery The Play Kit (3 Months)' AND brand_name='Lovevery');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cuddle+Kind Hand-Knit Doll (Lion)', 'Cuddle+Kind', 'cuddle-and-kind',
       'Hand-knit by artisans in Peru. Each doll sold provides 10 meals to children in need.',
       'goody', 6500, 6500,
       '["https://images.unsplash.com/photo-1549480017-d76466a4b7e8?w=800"]'::jsonb,
       true, true, 84, ARRAY['new-baby','birthday'],
       ARRAY['baby-kids'], ARRAY['gift_of_choice'],
       'high', 'A softie with a story. Parents keep them for years.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cuddle+Kind Hand-Knit Doll (Lion)' AND brand_name='Cuddle+Kind');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Tegu Magnetic Wooden Blocks (14-piece)', 'Tegu', 'tegu',
       'Hardwood blocks with hidden magnets. Open-ended play with serious design credibility.',
       'goody', 4200, 4200,
       '["https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','new-baby'],
       ARRAY['baby-kids'], ARRAY[]::TEXT[],
       'medium', 'Toy the adults also want to touch.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Tegu Magnetic Wooden Blocks (14-piece)' AND brand_name='Tegu');

-- ── WELLNESS ─────────────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Lululemon The Mat 5mm', 'Lululemon', 'lululemon',
       'Grippy natural rubber yoga mat with antimicrobial top layer. The mat studios recommend.',
       'goody', 8800, 8800,
       '["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','new-year','mothers-day'],
       ARRAY['wellness','fashion-accessories'], ARRAY[]::TEXT[],
       'medium', 'The mat that actually makes people go to yoga.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Lululemon The Mat 5mm' AND brand_name='Lululemon');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Barefoot Dreams CozyChic Throw', 'Barefoot Dreams', 'barefoot-dreams',
       'The Oprah-favorite throw blanket. Feels like the softest thing you own the moment you touch it.',
       'goody', 18000, 18000,
       '["https://images.unsplash.com/photo-1622285610322-48c7fa49c7ad?w=800"]'::jsonb,
       true, true, 89, ARRAY['sympathy','mothers-day','wedding','anniversary'],
       ARRAY['wellness','home'], ARRAY['best_seller','gift_of_choice'],
       'high', 'The blanket that gets stolen the moment it leaves the box.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Barefoot Dreams CozyChic Throw' AND brand_name='Barefoot Dreams');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Saje Pocket Farmacy Essential Oil Kit', 'Saje', 'saje',
       'Five roll-on essential oil remedies for stress, sleep, headaches, muscles, and focus.',
       'goody', 5900, 5900,
       '["https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800"]'::jsonb,
       true, true, 80, ARRAY['birthday','sympathy','just-because'],
       ARRAY['wellness'], ARRAY[]::TEXT[],
       'medium', 'A tiny pharmacy that fits in a bag.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Saje Pocket Farmacy Essential Oil Kit' AND brand_name='Saje');

-- ── FASHION & ACCESSORIES ────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Marine Layer Classic Crew Sweatshirt', 'Marine Layer', 'marine-layer',
       'The impossibly soft crew that becomes "the one they always wear." Recycled cotton blend.',
       'goody', 9800, 9800,
       '["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"]'::jsonb,
       true, true, 83, ARRAY['birthday','thank-you','fathers-day'],
       ARRAY['fashion-accessories'], ARRAY[]::TEXT[],
       'medium', 'Underrated gift. Becomes their favorite in a week.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Marine Layer Classic Crew Sweatshirt' AND brand_name='Marine Layer');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Allbirds Wool Runner', 'Allbirds', 'allbirds',
       'Merino wool sneakers that go with everything. Machine-washable, carbon-neutral.',
       'goody', 11000, 11000,
       '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"]'::jsonb,
       true, true, 81, ARRAY['birthday','fathers-day'],
       ARRAY['fashion-accessories','earth-month'], ARRAY[]::TEXT[],
       'medium', 'The shoes people wear for five years.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Allbirds Wool Runner' AND brand_name='Allbirds');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Cuyana Classic Leather Tote', 'Cuyana', 'cuyana',
       'Hand-crafted Italian leather tote in minimalist silhouette. Can be monogrammed.',
       'goody', 22500, 22500,
       '["https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800"]'::jsonb,
       true, true, 86, ARRAY['mothers-day','graduation','anniversary'],
       ARRAY['fashion-accessories'], ARRAY['personalized'],
       'high', 'Personalized leather that only gets better with time.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Cuyana Classic Leather Tote' AND brand_name='Cuyana');

-- ── PERSONALIZED / BRANDED SWAG ──────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Engraved YETI Rambler (20oz)', 'YETI', 'yeti',
       'The YETI tumbler, custom laser-engraved with a name, date, or message of your choice.',
       'goody', 4800, 4800,
       '["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"]'::jsonb,
       true, true, 85, ARRAY['birthday','graduation','thank-you','anniversary'],
       ARRAY['travel-outdoors','personalized'], ARRAY['personalized','best_seller'],
       'medium', 'Custom touch on a gift people actually use every day.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Engraved YETI Rambler (20oz)' AND brand_name='YETI');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Personalized Moleskine Classic Notebook', 'Moleskine', 'moleskine',
       'The iconic hardcover notebook, debossed with initials or a short phrase.',
       'goody', 3200, 3200,
       '["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"]'::jsonb,
       true, true, 80, ARRAY['graduation','thank-you','birthday'],
       ARRAY['personalized','fashion-accessories'], ARRAY['personalized','gift_of_choice'],
       'medium', 'Initials on the cover; they''ll carry it everywhere.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Personalized Moleskine Classic Notebook' AND brand_name='Moleskine');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Hydro Flask 32oz Wide Mouth', 'Hydro Flask', 'hydro-flask',
       'Insulated bottle with custom color and laser-engraved name. Keeps cold 24hrs, hot 12hrs.',
       'goody', 5500, 5500,
       '["https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800"]'::jsonb,
       true, true, 82, ARRAY['graduation','birthday','thank-you'],
       ARRAY['personalized','travel-outdoors','wellness'], ARRAY['personalized'],
       'medium', 'The daily-use personalized gift that doesn''t feel cheesy.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Hydro Flask 32oz Wide Mouth' AND brand_name='Hydro Flask');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Personalized Rifle Paper Co. Stationery Set', 'Rifle Paper Co.', 'rifle-paper-co',
       'Boxed set of 50 flat notecards with custom monogram. Beautifully printed in Florida.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1577995040022-9be5baee0f29?w=800"]'::jsonb,
       true, true, 84, ARRAY['wedding','housewarming','graduation','thank-you'],
       ARRAY['personalized','home'], ARRAY['personalized'],
       'medium', 'Handwritten notes are a love language. Start here.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Personalized Rifle Paper Co. Stationery Set' AND brand_name='Rifle Paper Co.');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Custom Embroidered Patagonia Nano Puff', 'Patagonia', 'patagonia',
       'The iconic lightweight jacket with custom embroidered name or initials on the chest.',
       'goody', 24900, 24900,
       '["https://images.unsplash.com/photo-1583275095-7a6e85d23f65?w=800"]'::jsonb,
       true, true, 87, ARRAY['graduation','fathers-day','wedding'],
       ARRAY['personalized','fashion-accessories','travel-outdoors','earth-month'], ARRAY['personalized'],
       'high', 'A lifetime jacket with a personal stamp.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Custom Embroidered Patagonia Nano Puff' AND brand_name='Patagonia');

-- ── TECH: GAMING ─────────────────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Nintendo Switch OLED', 'Nintendo', 'nintendo',
       '7" OLED screen, 64GB storage, dock with wired LAN port. The cozy-gaming ambassador.',
       'goody', 34900, 34900,
       '["https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800"]'::jsonb,
       true, true, 88, ARRAY['birthday','graduation','holiday'],
       ARRAY['tech','gaming'], ARRAY['best_seller'],
       'high', 'The console that gets played by the whole household.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Nintendo Switch OLED' AND brand_name='Nintendo');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT '8BitDo SN30 Pro Wireless Controller', '8BitDo', '8bitdo',
       'Cult-favorite retro-style controller. Works with Switch, PC, Mac, Android, iPhone.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?w=800"]'::jsonb,
       true, true, 78, ARRAY['birthday','graduation'],
       ARRAY['tech','gaming'], ARRAY[]::TEXT[],
       'medium', 'For the friend who still quotes Mario.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='8BitDo SN30 Pro Wireless Controller' AND brand_name='8BitDo');

-- ── EARTH MONTH (eco-leaning) ────────────────────────────────────────────
INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Stasher Reusable Bag Starter Set', 'Stasher', 'stasher',
       'Five platinum-silicone reusable bags in assorted sizes. The single-use-plastic killer.',
       'goody', 4500, 4500,
       '["https://images.unsplash.com/photo-1605618313023-d3c9f4fa1d8d?w=800"]'::jsonb,
       true, true, 79, ARRAY['housewarming','just-because','mothers-day'],
       ARRAY['home','earth-month'], ARRAY[]::TEXT[],
       'low', 'Quietly fixes a daily kitchen guilt.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Stasher Reusable Bag Starter Set' AND brand_name='Stasher');

INSERT INTO marketplace_products (name, brand_name, brand_slug, description, provider, base_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active)
SELECT 'Public Goods Home Essentials Box', 'Public Goods', 'public-goods',
       'Plant-based soap, shampoo, toothpaste, and cleaner. Minimalist packaging, serious ingredients.',
       'goody', 5900, 5900,
       '["https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800"]'::jsonb,
       true, true, 78, ARRAY['housewarming','just-because'],
       ARRAY['home','wellness','earth-month'], ARRAY[]::TEXT[],
       'low', 'Looks like a spa, costs like a grocery run.', true
WHERE NOT EXISTS (SELECT 1 FROM marketplace_products WHERE name='Public Goods Home Essentials Box' AND brand_name='Public Goods');

-- ── FINAL: backfill brand_slug + categories + scope on older rows ────────
-- For any pre-existing row that still has NULL brand_slug, derive one from
-- the legacy provider/name so the brand API has something to group on.
UPDATE marketplace_products
   SET brand_slug = lower(regexp_replace(provider, '[^a-zA-Z0-9]+', '-', 'g')),
       brand_name = initcap(provider)
 WHERE brand_slug IS NULL
   AND provider IS NOT NULL
   AND provider <> 'goody';

-- Keep starting_price_cents consistent for freshly seeded rows
UPDATE marketplace_products
   SET starting_price_cents = base_price_cents
 WHERE starting_price_cents IS NULL;

-- Refresh PostgREST schema cache one more time (data shape only)
NOTIFY pgrst, 'reload schema';
