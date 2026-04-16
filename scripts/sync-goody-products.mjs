#!/usr/bin/env node
/**
 * sync-goody-products.mjs
 *
 * Pulls the full Goody Commerce catalog and upserts into marketplace_products.
 * Idempotent: uses external_id as dedup key. Safe to re-run for syncs.
 *
 * Usage:
 *   node scripts/sync-goody-products.mjs
 *   node scripts/sync-goody-products.mjs --dry-run
 *
 * Env:
 *   GOODY_COMMERCE_API_KEY   — Bearer token for api.ongoody.com
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, '..', '.env.local');
const envFallback = resolve(__dirname, '..', '..', '..', '..', '.env.local');
config({ path: existsSync(envLocal) ? envLocal : envFallback });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GOODY_API_KEY = process.env.GOODY_COMMERCE_API_KEY;
const GOODY_BASE = 'https://api.ongoody.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOODY_API_KEY) {
  console.error('Missing GOODY_COMMERCE_API_KEY');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Brand → category map
// ---------------------------------------------------------------------------
const BRAND_CATEGORIES = {
  // === EXCLUDE entirely (set to null) ===
  // Alcohol
  'Winc': null, 'Wine.com': null, 'Drizly': null, 'Saucey': null, 'BevMo': null,
  'Bright Cellars': null, 'Firstleaf': null, 'Naked Wines': null,
  'Scout & Cellar': null, 'Vinebox': null, 'In Good Taste': null,
  // Charity
  'Charity': null, 'Donate': null,
  // Experiences
  'Airbnb': null, 'Masterclass': null, 'Tinggly': null, 'Cloud Nine': null,

  // === MAP to categories ===
  // Tech
  'Apple': ['tech'], 'Bose': ['tech', 'headphones-audio'], 'Sony': ['tech', 'headphones-audio'],
  'JBL': ['tech', 'headphones-audio'], 'Marshall': ['tech', 'headphones-audio'],
  'Samsung': ['tech'], 'Google': ['tech', 'home-tech'],
  'Native Union': ['tech', 'office'], 'Anker': ['tech'], 'Belkin': ['tech'],
  'Sonos': ['tech', 'home-tech'], 'Amazon': ['tech'],
  'Logitech': ['tech', 'office'], 'Razer': ['tech', 'gaming'],
  'Beats': ['tech', 'headphones-audio'], 'Fujifilm': ['tech', 'film-cameras'],
  'Peak Design': ['travel-outdoors', 'tech'],
  // Home
  'Brooklinen': ['home'], 'Parachute': ['home'], 'Casper': ['home'],
  'Le Creuset': ['home'], 'Staub': ['home'], 'Our Place': ['home'],
  'Caraway': ['home'], 'Anthropologie': ['home'], 'West Elm': ['home'],
  'CB2': ['home'], 'Pottery Barn': ['home'], 'Snowe': ['home'],
  'Lunya': ['home'], 'Voluspa': ['home'], 'Diptyque': ['home', 'wellness'],
  'Otherland': ['home'], 'Boy Smells': ['home'], 'Yankee Candle': ['home'],
  // Food & Drinks (non-alcohol)
  'Godiva': ['food-drinks'], 'Harry & David': ['food-drinks', 'gift-baskets'],
  'Sugarfina': ['food-drinks'], 'Graza': ['food-drinks'],
  'Vosges': ['food-drinks'], 'Baked by Melissa': ['food-drinks'],
  'Fly by Jing': ['food-drinks'], 'Mouth': ['food-drinks', 'gift-baskets'],
  'Fellow': ['food-drinks', 'home'], 'Nespresso': ['food-drinks', 'tech'],
  'Levain Bakery': ['food-drinks'], 'Milk Bar': ['food-drinks'],
  'Goldbelly': ['food-drinks'], 'Compartés': ['food-drinks'],
  // Wellness
  'Therabody': ['wellness', 'wellness-tech'], 'Theragun': ['wellness', 'wellness-tech'],
  'Hatch': ['wellness', 'home-tech'], 'Vitruvi': ['wellness', 'home'],
  'Lululemon': ['wellness', 'fashion-accessories'],
  // Fashion
  'Marine Layer': ['fashion-accessories'], 'Allbirds': ['fashion-accessories'],
  'Barefoot Dreams': ['fashion-accessories'], 'Everlane': ['fashion-accessories'],
  'Mejuri': ['fashion-accessories'], 'Gorjana': ['fashion-accessories'],
  // Travel & Outdoors
  'Away': ['travel-outdoors'], 'Tumi': ['travel-outdoors'],
  'Ridge': ['travel-outdoors', 'fashion-accessories'],
  'Osprey': ['travel-outdoors'], 'YETI': ['travel-outdoors', 'home'],
  'Stanley': ['travel-outdoors', 'home'], 'Hydro Flask': ['travel-outdoors'],
  // Baby & Kids
  'Lovevery': ['baby-kids'], 'Cuddle+Kind': ['baby-kids'],
  'Tegu': ['baby-kids'], 'Hanna Andersson': ['baby-kids'],
  // Personalized
  'Rifle Paper Co': ['personalized', 'home'], 'Moleskine': ['personalized', 'office'],
  'Leuchtturm': ['personalized', 'office'],
  // Flowers (from Goody — keep these!)
  'UrbanStems': ['flowers'], 'The Bouqs': ['flowers'], 'BloomsyBox': ['flowers'],
  'Farmgirl Flowers': ['flowers'], 'Bouqs': ['flowers'],
};

// ---------------------------------------------------------------------------
// Exclusion patterns (product name / brand name)
// ---------------------------------------------------------------------------
const ALCOHOL_RE = /\b(wine|beer|spirits?|vodka|whiskey|whisky|bourbon|champagne|cocktail|brew|liquor|tequila|mezcal|sake|soju|prosecco|cider|ale|stout|lager|merlot|cabernet|chardonnay|pinot|rosé|rose\s+wine|hard\s+seltzer)\b/i;
const CHARITY_RE = /\b(charity|donate|donation|nonprofit|non-profit)\b/i;
const EXPERIENCE_RE = /\b(experience|class|lesson|workshop|concert|ticket|masterclass)\b/i;
const EXCLUDED_CATEGORY_RE = /\b(nurse\s+appreciation|admin\s+appreciation|earth\s+month)\b/i;

function shouldExclude(product) {
  const name = product.name || '';
  const brand = product.brand?.name || '';
  const combined = `${name} ${brand}`;

  // Brand-level exclusion
  if (BRAND_CATEGORIES[brand] === null) return true;

  // Pattern-based exclusion
  if (ALCOHOL_RE.test(combined)) return true;
  if (CHARITY_RE.test(combined)) return true;
  if (EXPERIENCE_RE.test(combined)) return true;
  if (EXCLUDED_CATEGORY_RE.test(combined)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Name-based category inference (from backfill-categories.mjs patterns)
// ---------------------------------------------------------------------------
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
  { pattern: /plant|succulent|garden/i, cats: ['home'] },
  { pattern: /flower|bouquet|arrangement|rose|tulip|lily|orchid/i, cats: ['flowers'] },
  { pattern: /gift\s*card|gift\s*certificate/i, cats: ['gift-of-choice'] },
];

function inferCategories(product) {
  const brand = product.brand?.name || '';
  const name = product.name || '';
  const cats = new Set();

  // 1. Brand-based
  const brandCats = BRAND_CATEGORIES[brand];
  if (Array.isArray(brandCats)) {
    brandCats.forEach(c => cats.add(c));
  }

  // 2. Name-based patterns
  for (const { pattern, cats: slugs } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      slugs.forEach(c => cats.add(c));
    }
  }

  // 3. Gift card detection
  if (/gift\s*card|gift\s*certificate/i.test(name) || product.price_is_variable) {
    cats.add('gift-of-choice');
  }

  // 4. Fallback
  if (cats.size === 0) {
    cats.add('gift-baskets');
  }

  // Remove excluded categories
  cats.delete('earth-month');
  cats.delete('nurse-appreciation');
  cats.delete('admin-appreciation');

  return [...cats];
}

// ---------------------------------------------------------------------------
// Slugify
// ---------------------------------------------------------------------------
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Map Goody product → DB row
// ---------------------------------------------------------------------------
function mapToDbRow(product) {
  const brand = product.brand || {};

  // Images: product.images first, then variant images
  const images = [];
  if (product.images?.length > 0) {
    for (const img of product.images) {
      if (img.url) images.push(img.url);
      else if (img.image_large?.url) images.push(img.image_large.url);
    }
  }
  if (images.length === 0 && product.variants?.length > 0) {
    for (const v of product.variants) {
      if (v.image_large?.url) images.push(v.image_large.url);
    }
  }

  // Variants
  const variants = (product.variants || []).map(v => ({
    id: v.id,
    name: v.name,
    image: v.image_large?.url || null,
  }));

  // Starting price: min variant price if available, else product price
  let startingPrice = product.price || 0;
  if (product.variants?.length > 0) {
    const variantPrices = product.variants
      .map(v => v.price)
      .filter(p => typeof p === 'number' && p > 0);
    if (variantPrices.length > 0) {
      startingPrice = Math.min(startingPrice, ...variantPrices);
    }
  }

  // Description: prefer subtitle_short, fall back to subtitle, truncate at 500
  let description = product.subtitle_short || product.subtitle || '';
  if (description.length > 500) {
    description = description.slice(0, 497) + '...';
  }

  const categories = inferCategories(product);

  return {
    external_id: product.id,
    name: product.name,
    brand_name: brand.name || null,
    brand_slug: slugify(brand.name),
    description,
    provider: 'goody',
    base_price_cents: product.price || 0,
    starting_price_cents: startingPrice,
    images: images.slice(0, 5),
    variants,
    categories,
    in_stock: product.status === 'active',
    is_active: true,
    is_curated: true,
    curated_score: 80,
    emotional_impact: 'medium',
    currency: 'USD',
  };
}

// ---------------------------------------------------------------------------
// API fetch with rate limiting
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(page, perPage = 100) {
  const url = `${GOODY_BASE}/v1/products?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GOODY_API_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Goody API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log(`Goody -> Supabase product sync`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  let page = 1;
  let totalFetched = 0;
  let totalSynced = 0;
  let totalExcluded = 0;
  let totalErrors = 0;
  const brandsSeen = new Set();
  const categoriesSeen = new Set();

  while (true) {
    process.stdout.write(`  Page ${page}... `);
    const data = await fetchPage(page, 100);
    const products = data.data || [];

    if (products.length === 0) {
      console.log('empty, done.');
      break;
    }

    totalFetched += products.length;

    // Filter and map
    const rows = [];
    for (const p of products) {
      if (shouldExclude(p)) {
        totalExcluded++;
        continue;
      }
      const row = mapToDbRow(p);
      rows.push(row);
      if (row.brand_name) brandsSeen.add(row.brand_name);
      row.categories.forEach(c => categoriesSeen.add(c));
    }

    console.log(`${products.length} fetched, ${rows.length} kept, ${products.length - rows.length} excluded`);

    if (!DRY_RUN && rows.length > 0) {
      // Upsert: check which external_ids exist
      const externalIds = rows.map(r => r.external_id);
      const { data: existing } = await supabase
        .from('marketplace_products')
        .select('id, external_id')
        .in('external_id', externalIds);

      const existingMap = new Map((existing || []).map(r => [r.external_id, r.id]));
      const toInsert = rows.filter(r => !existingMap.has(r.external_id));
      const toUpdate = rows.filter(r => existingMap.has(r.external_id));

      // Insert new
      if (toInsert.length > 0) {
        const { error } = await supabase.from('marketplace_products').insert(toInsert);
        if (error) {
          console.error(`    Insert error: ${error.message}`);
          totalErrors += toInsert.length;
        } else {
          totalSynced += toInsert.length;
        }
      }

      // Update existing (batch of 10 to avoid overwhelming)
      for (let i = 0; i < toUpdate.length; i += 10) {
        const batch = toUpdate.slice(i, i + 10);
        for (const row of batch) {
          const { error } = await supabase
            .from('marketplace_products')
            .update(row)
            .eq('external_id', row.external_id);
          if (error) {
            totalErrors++;
          } else {
            totalSynced++;
          }
        }
      }

      if (toInsert.length > 0 || toUpdate.length > 0) {
        console.log(`    +${toInsert.length} inserted, ~${toUpdate.length} updated`);
      }
    }

    // Progress logging
    if (totalFetched % 500 === 0) {
      console.log(`  --- Progress: ${totalFetched} fetched, ${totalSynced} synced, ${totalExcluded} excluded ---`);
    }

    page++;

    // Rate limit: 100ms between pages
    await sleep(100);
  }

  console.log('\n=== Sync Summary ===');
  console.log(`  Total fetched:  ${totalFetched}`);
  console.log(`  Total excluded: ${totalExcluded}`);
  console.log(`  Total synced:   ${totalSynced}`);
  console.log(`  Total errors:   ${totalErrors}`);
  console.log(`  Brands:         ${brandsSeen.size}`);
  console.log(`  Categories:     ${[...categoriesSeen].sort().join(', ')}`);
  console.log(`\nBrand list (${brandsSeen.size}):`);
  console.log(`  ${[...brandsSeen].sort().join(', ')}`);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
