-- ============================================================================
-- Backfill brand_name, brand_slug, categories, and scope on ~340 older
-- marketplace_products rows that were seeded without brand metadata.
-- ============================================================================
-- Idempotent: every UPDATE is guarded by AND brand_name IS NULL so re-running
-- is safe. Run in Supabase SQL Editor or via supabase db push.
-- ============================================================================

-- ── BRAND BACKFILL ──────────────────────────────────────────────────────────

-- Apple
UPDATE marketplace_products SET brand_name = 'Apple', brand_slug = 'apple'
 WHERE name ILIKE '%Apple%' AND brand_name IS NULL;
UPDATE marketplace_products SET brand_name = 'Apple', brand_slug = 'apple'
 WHERE name ILIKE '%AirPods%' AND brand_name IS NULL;
UPDATE marketplace_products SET brand_name = 'Apple', brand_slug = 'apple'
 WHERE name ILIKE '%AirTag%' AND brand_name IS NULL;
UPDATE marketplace_products SET brand_name = 'Apple', brand_slug = 'apple'
 WHERE name ILIKE '%iPad%' AND brand_name IS NULL;
UPDATE marketplace_products SET brand_name = 'Apple', brand_slug = 'apple'
 WHERE name ILIKE '%MagSafe%' AND brand_name IS NULL;

-- Bose
UPDATE marketplace_products SET brand_name = 'Bose', brand_slug = 'bose'
 WHERE name ILIKE '%Bose%' AND brand_name IS NULL;

-- Sony
UPDATE marketplace_products SET brand_name = 'Sony', brand_slug = 'sony'
 WHERE name ILIKE '%Sony%' AND brand_name IS NULL;

-- JBL
UPDATE marketplace_products SET brand_name = 'JBL', brand_slug = 'jbl'
 WHERE name ILIKE '%JBL%' AND brand_name IS NULL;

-- Marshall
UPDATE marketplace_products SET brand_name = 'Marshall', brand_slug = 'marshall'
 WHERE name ILIKE '%Marshall%' AND brand_name IS NULL;

-- Native Union
UPDATE marketplace_products SET brand_name = 'Native Union', brand_slug = 'native-union'
 WHERE name ILIKE '%Native Union%' AND brand_name IS NULL;

-- Therabody / Theragun
UPDATE marketplace_products SET brand_name = 'Therabody', brand_slug = 'therabody'
 WHERE (name ILIKE '%Therabody%' OR name ILIKE '%Theragun%' OR name ILIKE '%PowerDot%' OR name ILIKE '%RecoveryAir%') AND brand_name IS NULL;

-- Ridge
UPDATE marketplace_products SET brand_name = 'Ridge', brand_slug = 'ridge'
 WHERE name ILIKE '%Ridge%' AND brand_name IS NULL;

-- Away
UPDATE marketplace_products SET brand_name = 'Away', brand_slug = 'away'
 WHERE name ILIKE '%Away %' AND brand_name IS NULL;

-- Tumi
UPDATE marketplace_products SET brand_name = 'Tumi', brand_slug = 'tumi'
 WHERE name ILIKE '%Tumi%' AND brand_name IS NULL;

-- Brooklinen
UPDATE marketplace_products SET brand_name = 'Brooklinen', brand_slug = 'brooklinen'
 WHERE name ILIKE '%Brooklinen%' AND brand_name IS NULL;

-- Parachute
UPDATE marketplace_products SET brand_name = 'Parachute', brand_slug = 'parachute'
 WHERE name ILIKE '%Parachute%' AND brand_name IS NULL;

-- Le Creuset
UPDATE marketplace_products SET brand_name = 'Le Creuset', brand_slug = 'le-creuset'
 WHERE name ILIKE '%Le Creuset%' AND brand_name IS NULL;

-- YETI
UPDATE marketplace_products SET brand_name = 'YETI', brand_slug = 'yeti'
 WHERE name ILIKE '%YETI%' AND brand_name IS NULL;

-- Stanley
UPDATE marketplace_products SET brand_name = 'Stanley', brand_slug = 'stanley'
 WHERE name ILIKE '%Stanley%' AND brand_name IS NULL;

-- Hydro Flask
UPDATE marketplace_products SET brand_name = 'Hydro Flask', brand_slug = 'hydro-flask'
 WHERE name ILIKE '%Hydro Flask%' AND brand_name IS NULL;

-- Godiva
UPDATE marketplace_products SET brand_name = 'Godiva', brand_slug = 'godiva'
 WHERE name ILIKE '%Godiva%' AND brand_name IS NULL;

-- Harry & David
UPDATE marketplace_products SET brand_name = 'Harry & David', brand_slug = 'harry-and-david'
 WHERE name ILIKE '%Harry%David%' AND brand_name IS NULL;

-- Sugarfina
UPDATE marketplace_products SET brand_name = 'Sugarfina', brand_slug = 'sugarfina'
 WHERE name ILIKE '%Sugarfina%' AND brand_name IS NULL;

-- Graza
UPDATE marketplace_products SET brand_name = 'Graza', brand_slug = 'graza'
 WHERE name ILIKE '%Graza%' AND brand_name IS NULL;

-- Vosges
UPDATE marketplace_products SET brand_name = 'Vosges', brand_slug = 'vosges'
 WHERE name ILIKE '%Vosges%' AND brand_name IS NULL;

-- Allbirds
UPDATE marketplace_products SET brand_name = 'Allbirds', brand_slug = 'allbirds'
 WHERE name ILIKE '%Allbirds%' AND brand_name IS NULL;

-- Marine Layer
UPDATE marketplace_products SET brand_name = 'Marine Layer', brand_slug = 'marine-layer'
 WHERE name ILIKE '%Marine Layer%' AND brand_name IS NULL;

-- Barefoot Dreams
UPDATE marketplace_products SET brand_name = 'Barefoot Dreams', brand_slug = 'barefoot-dreams'
 WHERE name ILIKE '%Barefoot Dreams%' AND brand_name IS NULL;

-- Lovevery
UPDATE marketplace_products SET brand_name = 'Lovevery', brand_slug = 'lovevery'
 WHERE name ILIKE '%Lovevery%' AND brand_name IS NULL;

-- Cuddle+Kind
UPDATE marketplace_products SET brand_name = 'Cuddle+Kind', brand_slug = 'cuddle-and-kind'
 WHERE name ILIKE '%Cuddle%Kind%' AND brand_name IS NULL;

-- Tegu
UPDATE marketplace_products SET brand_name = 'Tegu', brand_slug = 'tegu'
 WHERE name ILIKE '%Tegu%' AND brand_name IS NULL;

-- Rifle Paper Co.
UPDATE marketplace_products SET brand_name = 'Rifle Paper Co.', brand_slug = 'rifle-paper-co'
 WHERE name ILIKE '%Rifle Paper%' AND brand_name IS NULL;

-- Moleskine
UPDATE marketplace_products SET brand_name = 'Moleskine', brand_slug = 'moleskine'
 WHERE name ILIKE '%Moleskine%' AND brand_name IS NULL;

-- Leuchtturm
UPDATE marketplace_products SET brand_name = 'Leuchtturm', brand_slug = 'leuchtturm'
 WHERE name ILIKE '%Leuchtturm%' AND brand_name IS NULL;

-- Diptyque
UPDATE marketplace_products SET brand_name = 'Diptyque', brand_slug = 'diptyque'
 WHERE name ILIKE '%Diptyque%' AND brand_name IS NULL;

-- Otherland
UPDATE marketplace_products SET brand_name = 'Otherland', brand_slug = 'otherland'
 WHERE name ILIKE '%Otherland%' AND brand_name IS NULL;

-- Vitruvi
UPDATE marketplace_products SET brand_name = 'Vitruvi', brand_slug = 'vitruvi'
 WHERE name ILIKE '%Vitruvi%' AND brand_name IS NULL;

-- Hatch
UPDATE marketplace_products SET brand_name = 'Hatch', brand_slug = 'hatch'
 WHERE name ILIKE '%Hatch%' AND brand_name IS NULL;

-- Fujifilm / Instax
UPDATE marketplace_products SET brand_name = 'Fujifilm', brand_slug = 'fujifilm'
 WHERE (name ILIKE '%Fujifilm%' OR name ILIKE '%Instax%') AND brand_name IS NULL;

-- Kindle / Amazon
UPDATE marketplace_products SET brand_name = 'Amazon', brand_slug = 'amazon'
 WHERE (name ILIKE '%Kindle%' OR name ILIKE '%Amazon%' OR name ILIKE '%Echo%' OR name ILIKE '%Fire%Tablet%') AND brand_name IS NULL;

-- Peak Design
UPDATE marketplace_products SET brand_name = 'Peak Design', brand_slug = 'peak-design'
 WHERE name ILIKE '%Peak Design%' AND brand_name IS NULL;

-- Voluspa
UPDATE marketplace_products SET brand_name = 'Voluspa', brand_slug = 'voluspa'
 WHERE name ILIKE '%Voluspa%' AND brand_name IS NULL;

-- Anthropologie
UPDATE marketplace_products SET brand_name = 'Anthropologie', brand_slug = 'anthropologie'
 WHERE name ILIKE '%Anthropologie%' AND brand_name IS NULL;

-- Starbucks
UPDATE marketplace_products SET brand_name = 'Starbucks', brand_slug = 'starbucks'
 WHERE name ILIKE '%Starbucks%' AND brand_name IS NULL;

-- Burt's Bees
UPDATE marketplace_products SET brand_name = 'Burt''s Bees', brand_slug = 'burts-bees'
 WHERE name ILIKE '%Burt%Bees%' AND brand_name IS NULL;

-- Spa Luxetique
UPDATE marketplace_products SET brand_name = 'Spa Luxetique', brand_slug = 'spa-luxetique'
 WHERE name ILIKE '%Spa Luxetique%' AND brand_name IS NULL;

-- Sonos
UPDATE marketplace_products SET brand_name = 'Sonos', brand_slug = 'sonos'
 WHERE name ILIKE '%Sonos%' AND brand_name IS NULL;

-- Anker
UPDATE marketplace_products SET brand_name = 'Anker', brand_slug = 'anker'
 WHERE name ILIKE '%Anker%' AND brand_name IS NULL;

-- Nintendo
UPDATE marketplace_products SET brand_name = 'Nintendo', brand_slug = 'nintendo'
 WHERE name ILIKE '%Nintendo%' AND brand_name IS NULL;

-- Polaroid
UPDATE marketplace_products SET brand_name = 'Polaroid', brand_slug = 'polaroid'
 WHERE name ILIKE '%Polaroid%' AND brand_name IS NULL;

-- Oura
UPDATE marketplace_products SET brand_name = 'Oura', brand_slug = 'oura'
 WHERE name ILIKE '%Oura%' AND brand_name IS NULL;

-- Lululemon
UPDATE marketplace_products SET brand_name = 'Lululemon', brand_slug = 'lululemon'
 WHERE name ILIKE '%Lululemon%' AND brand_name IS NULL;

-- Patagonia
UPDATE marketplace_products SET brand_name = 'Patagonia', brand_slug = 'patagonia'
 WHERE name ILIKE '%Patagonia%' AND brand_name IS NULL;

-- Cuyana
UPDATE marketplace_products SET brand_name = 'Cuyana', brand_slug = 'cuyana'
 WHERE name ILIKE '%Cuyana%' AND brand_name IS NULL;

-- Fly By Jing
UPDATE marketplace_products SET brand_name = 'Fly By Jing', brand_slug = 'fly-by-jing'
 WHERE name ILIKE '%Fly By Jing%' AND brand_name IS NULL;

-- Stasher
UPDATE marketplace_products SET brand_name = 'Stasher', brand_slug = 'stasher'
 WHERE name ILIKE '%Stasher%' AND brand_name IS NULL;

-- Public Goods
UPDATE marketplace_products SET brand_name = 'Public Goods', brand_slug = 'public-goods'
 WHERE name ILIKE '%Public Goods%' AND brand_name IS NULL;

-- Blue Bottle
UPDATE marketplace_products SET brand_name = 'Blue Bottle Coffee', brand_slug = 'blue-bottle'
 WHERE name ILIKE '%Blue Bottle%' AND brand_name IS NULL;

-- Bellocq
UPDATE marketplace_products SET brand_name = 'Bellocq', brand_slug = 'bellocq'
 WHERE name ILIKE '%Bellocq%' AND brand_name IS NULL;

-- Snowe
UPDATE marketplace_products SET brand_name = 'Snowe', brand_slug = 'snowe'
 WHERE name ILIKE '%Snowe%' AND brand_name IS NULL;

-- Material Kitchen
UPDATE marketplace_products SET brand_name = 'Material Kitchen', brand_slug = 'material-kitchen'
 WHERE name ILIKE '%Material%Knife%' AND brand_name IS NULL;

-- Mouth
UPDATE marketplace_products SET brand_name = 'Mouth', brand_slug = 'mouth'
 WHERE name ILIKE '%Mouth%' AND brand_name IS NULL;

-- 8BitDo
UPDATE marketplace_products SET brand_name = '8BitDo', brand_slug = '8bitdo'
 WHERE name ILIKE '%8BitDo%' AND brand_name IS NULL;

-- Saje
UPDATE marketplace_products SET brand_name = 'Saje', brand_slug = 'saje'
 WHERE name ILIKE '%Saje%' AND brand_name IS NULL;

-- ── CATEGORY BACKFILL ───────────────────────────────────────────────────────
-- For older rows that have categories IS NULL or empty, set categories
-- based on product name patterns.

-- Headphones / Audio / Speakers
UPDATE marketplace_products SET categories = ARRAY['tech','headphones-audio']
 WHERE (name ILIKE '%headphone%' OR name ILIKE '%earbuds%' OR name ILIKE '%AirPods%'
     OR name ILIKE '%speaker%' OR name ILIKE '%SoundLink%' OR name ILIKE '%audio%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Candles
UPDATE marketplace_products SET categories = ARRAY['home']
 WHERE (name ILIKE '%candle%' OR name ILIKE '%Voluspa%' OR name ILIKE '%Diptyque%' OR name ILIKE '%Otherland%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Kitchen / Cookware
UPDATE marketplace_products SET categories = ARRAY['home','food-drinks']
 WHERE (name ILIKE '%Le Creuset%' OR name ILIKE '%Dutch Oven%' OR name ILIKE '%Skillet%'
     OR name ILIKE '%Mug Set%' OR name ILIKE '%Knife%' OR name ILIKE '%Kettle%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Bedding
UPDATE marketplace_products SET categories = ARRAY['home']
 WHERE (name ILIKE '%Sheet%' OR name ILIKE '%Bedding%' OR name ILIKE '%Duvet%'
     OR name ILIKE '%Pillow%' OR name ILIKE '%Brooklinen%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Chocolate / Sweets / Food
UPDATE marketplace_products SET categories = ARRAY['food-drinks']
 WHERE (name ILIKE '%Godiva%' OR name ILIKE '%chocolate%' OR name ILIKE '%truffle%'
     OR name ILIKE '%Sugarfina%' OR name ILIKE '%candy%' OR name ILIKE '%pear%'
     OR name ILIKE '%cocoa%' OR name ILIKE '%coffee%' OR name ILIKE '%tea %')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Travel / Outdoors
UPDATE marketplace_products SET categories = ARRAY['travel-outdoors']
 WHERE (name ILIKE '%luggage%' OR name ILIKE '%Carry-On%' OR name ILIKE '%backpack%'
     OR name ILIKE '%sling%' OR name ILIKE '%cooler%' OR name ILIKE '%packing%'
     OR name ILIKE '%Away%' OR name ILIKE '%Tumi%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Tumblers / Bottles
UPDATE marketplace_products SET categories = ARRAY['travel-outdoors']
 WHERE (name ILIKE '%Rambler%' OR name ILIKE '%Tumbler%' OR name ILIKE '%Hydro Flask%'
     OR name ILIKE '%Stanley%' OR name ILIKE '%Quencher%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Baby / Kids
UPDATE marketplace_products SET categories = ARRAY['baby-kids']
 WHERE (name ILIKE '%Lovevery%' OR name ILIKE '%Cuddle%Kind%' OR name ILIKE '%Tegu%'
     OR name ILIKE '%baby%' OR name ILIKE '%kids%' OR name ILIKE '%toy%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Wellness / Spa
UPDATE marketplace_products SET categories = ARRAY['wellness']
 WHERE (name ILIKE '%bath bomb%' OR name ILIKE '%spa %' OR name ILIKE '%yoga%'
     OR name ILIKE '%essential oil%' OR name ILIKE '%massage%' OR name ILIKE '%skincare%'
     OR name ILIKE '%Theragun%' OR name ILIKE '%Therabody%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Fashion
UPDATE marketplace_products SET categories = ARRAY['fashion-accessories']
 WHERE (name ILIKE '%shoe%' OR name ILIKE '%sneaker%' OR name ILIKE '%sweatshirt%'
     OR name ILIKE '%tote%' OR name ILIKE '%jacket%' OR name ILIKE '%robe%'
     OR name ILIKE '%Allbirds%' OR name ILIKE '%Marine Layer%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Stationery / Journals
UPDATE marketplace_products SET categories = ARRAY['personalized']
 WHERE (name ILIKE '%journal%' OR name ILIKE '%notebook%' OR name ILIKE '%stationery%'
     OR name ILIKE '%Moleskine%' OR name ILIKE '%Leuchtturm%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- Tech catch-all (anything with a tech brand not yet categorized)
UPDATE marketplace_products SET categories = ARRAY['tech']
 WHERE (name ILIKE '%Apple%' OR name ILIKE '%AirTag%' OR name ILIKE '%Kindle%'
     OR name ILIKE '%Nintendo%' OR name ILIKE '%Fujifilm%' OR name ILIKE '%Instax%'
     OR name ILIKE '%Anker%' OR name ILIKE '%Hatch%' OR name ILIKE '%Oura%')
   AND (categories IS NULL OR categories = ARRAY[]::TEXT[]);

-- ── SCOPE BACKFILL (best sellers) ───────────────────────────────────────────
-- Mark popular brand products as best_seller
UPDATE marketplace_products SET scope = ARRAY['best_seller']
 WHERE brand_slug IN ('apple','bose','yeti','sony','brooklinen','le-creuset','therabody','nintendo','away')
   AND (scope IS NULL OR scope = ARRAY[]::TEXT[])
   AND curated_score >= 85;

-- Ensure starting_price_cents is always populated
UPDATE marketplace_products
   SET starting_price_cents = base_price_cents
 WHERE starting_price_cents IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
