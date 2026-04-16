/**
 * One-shot script: backfill categories[] on marketplace_products where empty.
 * Maps brand names + product name patterns to category slugs.
 * Run: node scripts/backfill-categories.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BRAND_TO_CATEGORIES = {
  // Tech
  'apple': ['tech'], 'bose': ['tech', 'headphones-audio'], 'sony': ['tech', 'headphones-audio'],
  'jbl': ['tech', 'headphones-audio'], 'marshall': ['tech', 'headphones-audio'],
  'native union': ['tech', 'office'], 'anker': ['tech'], 'belkin': ['tech'],
  'sonos': ['tech', 'home-tech'], 'google': ['tech', 'home-tech'],
  'amazon': ['tech'], 'kindle': ['tech'], 'fujifilm': ['tech', 'film-cameras'],
  'logitech': ['tech', 'office'], 'razer': ['tech', 'gaming'],
  'beats': ['tech', 'headphones-audio'], 'samsung': ['tech'],
  // Home
  'brooklinen': ['home'], 'parachute': ['home'], 'casper': ['home'],
  'le creuset': ['home'], 'staub': ['home'], 'our place': ['home'],
  'caraway': ['home'], 'anthropologie': ['home'], 'west elm': ['home'],
  'cb2': ['home'], 'restoration hardware': ['home'], 'pottery barn': ['home'],
  'snowe': ['home'], 'lunya': ['home'],
  // Food
  'godiva': ['food-drinks'], 'harry & david': ['food-drinks', 'gift-baskets'],
  'sugarfina': ['food-drinks'], 'graza': ['food-drinks'],
  'vosges': ['food-drinks'], 'baked by melissa': ['food-drinks'],
  'fly by jing': ['food-drinks'], 'mouth': ['food-drinks', 'gift-baskets'],
  'fellow': ['food-drinks', 'home'], 'nespresso': ['food-drinks', 'tech'],
  // Wellness
  'therabody': ['wellness', 'wellness-tech'], 'theragun': ['wellness', 'wellness-tech'],
  'hatch': ['wellness', 'home-tech'], 'vitruvi': ['wellness', 'home'],
  'lululemon': ['wellness', 'fashion-accessories'],
  // Fashion
  'marine layer': ['fashion-accessories'], 'allbirds': ['fashion-accessories'],
  'barefoot dreams': ['fashion-accessories'], 'everlane': ['fashion-accessories'],
  'mejuri': ['fashion-accessories'], 'gorjana': ['fashion-accessories'],
  // Travel
  'away': ['travel-outdoors'], 'tumi': ['travel-outdoors'],
  'ridge': ['travel-outdoors', 'fashion-accessories'], 'peak design': ['travel-outdoors', 'tech'],
  'osprey': ['travel-outdoors'], 'yeti': ['travel-outdoors', 'home'],
  'stanley': ['travel-outdoors', 'home'], 'hydro flask': ['travel-outdoors'],
  // Baby
  'lovevery': ['baby-kids'], 'cuddle+kind': ['baby-kids'],
  'tegu': ['baby-kids'], 'hanna andersson': ['baby-kids'],
  // Personalized / Custom
  'rifle paper co': ['personalized', 'home'], 'moleskine': ['personalized', 'office'],
  'leuchtturm': ['personalized', 'office'],
  // Candles / Scents
  'diptyque': ['home', 'wellness'], 'otherland': ['home'],
  'yankee candle': ['home'], 'boy smells': ['home'],
  'voluspa': ['home'],
};

const NAME_PATTERNS = [
  { pattern: /headphone|earphone|earbud|airpod/i, cats: ['tech', 'headphones-audio'] },
  { pattern: /speaker|soundbar/i, cats: ['tech', 'headphones-audio'] },
  { pattern: /candle|diffuser|incense/i, cats: ['home'] },
  { pattern: /chocolate|truffle|cocoa|candy|cookie|brownie|cake/i, cats: ['food-drinks'] },
  { pattern: /coffee|tea|espresso|latte/i, cats: ['food-drinks'] },
  { pattern: /olive oil|hot sauce|spice|seasoning/i, cats: ['food-drinks'] },
  { pattern: /blanket|sheet|pillow|duvet|towel|robe|bedding/i, cats: ['home'] },
  { pattern: /mug|tumbler|water bottle|flask|thermos/i, cats: ['home'] },
  { pattern: /backpack|luggage|carry.on|suitcase|duffel|travel/i, cats: ['travel-outdoors'] },
  { pattern: /wallet|keychain|card holder/i, cats: ['fashion-accessories'] },
  { pattern: /necklace|bracelet|ring|earring|jewelry/i, cats: ['fashion-accessories'] },
  { pattern: /sweatshirt|hoodie|t-shirt|shirt|sweater|jacket/i, cats: ['fashion-accessories'] },
  { pattern: /sneaker|shoe|slipper|runner/i, cats: ['fashion-accessories'] },
  { pattern: /basket|bundle|sampler|collection|set.*gift/i, cats: ['gift-baskets'] },
  { pattern: /yoga|meditation|wellness|massage|theragun/i, cats: ['wellness'] },
  { pattern: /baby|infant|toddler|kid|child|toy|block/i, cats: ['baby-kids'] },
  { pattern: /phone case|charger|cable|adapter|dock|stand/i, cats: ['tech'] },
  { pattern: /notebook|journal|planner|pen|stationery/i, cats: ['personalized', 'office'] },
  { pattern: /custom|personali|monogram|engrav/i, cats: ['personalized'] },
  { pattern: /plant|succulent|garden|eco|sustainable|recycled/i, cats: ['earth-month'] },
];

async function run() {
  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select('id, name, brand_name, categories, occasions')
    .eq('is_active', true)
    .eq('categories', '{}');

  if (error) { console.error('Fetch error:', error); return; }
  console.log(`Found ${products.length} products with empty categories`);

  let updated = 0;
  for (const p of products) {
    const cats = new Set();

    // Brand-based
    const brandLower = (p.brand_name || '').toLowerCase();
    for (const [brand, slugs] of Object.entries(BRAND_TO_CATEGORIES)) {
      if (brandLower.includes(brand)) slugs.forEach(s => cats.add(s));
    }

    // Name-based
    for (const { pattern, cats: slugs } of NAME_PATTERNS) {
      if (pattern.test(p.name)) slugs.forEach(s => cats.add(s));
    }

    // Fallback: if still empty, assign 'home' as catch-all for gifts
    if (cats.size === 0) cats.add('home');

    const arr = [...cats];
    const { error: upErr } = await supabase
      .from('marketplace_products')
      .update({ categories: arr })
      .eq('id', p.id);

    if (upErr) console.error(`Failed ${p.id}:`, upErr.message);
    else updated++;
  }

  console.log(`Updated ${updated} / ${products.length} products`);
}

run().catch(console.error);
