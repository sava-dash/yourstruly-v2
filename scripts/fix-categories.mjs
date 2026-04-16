#!/usr/bin/env node
/**
 * fix-categories.mjs
 *
 * Re-categorizes ALL marketplace_products with stricter rules:
 * - Brand-based rules take priority
 * - Baby-kids is restricted to explicit child brands/products only
 * - Knife/adult brands are DENIED from baby-kids
 * - Universal fallback is 'home' (not 'gift-baskets')
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   node scripts/fix-categories.mjs
 *   node scripts/fix-categories.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, '..', '.env.local');
const envParent = resolve(__dirname, '..', '..', '..', '..', '.env.local');
config({ path: existsSync(envLocal) ? envLocal : envParent });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// DENY list for baby-kids: these brands must NEVER be in baby-kids
// ---------------------------------------------------------------------------
const BABY_KIDS_DENY_BRANDS = new Set([
  'schmidt bros', 'schmidt brothers',
  'fair harbor',
  'wüsthof', 'wusthof', 'henckels', 'zwilling', 'cutco',
  'shun', 'victorinox', 'global knives',
  'material kitchen',
  'winc', 'wine.com', 'drizly', 'saucey',
  'ridge', 'away', 'tumi',
  'therabody', 'theragun',
  'bose', 'sony', 'apple', 'samsung',
  'le creuset', 'staub', 'our place', 'caraway',
]);

// ---------------------------------------------------------------------------
// Brand → category map (PRIORITY: these override everything)
// ---------------------------------------------------------------------------
const BRAND_CATEGORIES = {
  // Knives / Kitchen (explicitly NOT baby-kids)
  'schmidt bros': ['home'],
  'schmidt brothers': ['home'],
  'wüsthof': ['home'],
  'wusthof': ['home'],
  'henckels': ['home'],
  'zwilling': ['home'],
  'material kitchen': ['home'],

  // Clothing / Fashion (explicitly NOT baby-kids)
  'fair harbor': ['fashion-accessories'],
  'marine layer': ['fashion-accessories'],
  'allbirds': ['fashion-accessories'],
  'barefoot dreams': ['fashion-accessories'],
  'everlane': ['fashion-accessories'],
  'mejuri': ['fashion-accessories'],
  'gorjana': ['fashion-accessories'],
  'lululemon': ['wellness', 'fashion-accessories'],
  'patagonia': ['fashion-accessories', 'travel-outdoors'],

  // Tech
  'apple': ['tech'],
  'bose': ['tech', 'headphones-audio'],
  'sony': ['tech', 'headphones-audio'],
  'jbl': ['tech', 'headphones-audio'],
  'marshall': ['tech', 'headphones-audio'],
  'samsung': ['tech'],
  'google': ['tech', 'home-tech'],
  'native union': ['tech', 'office'],
  'anker': ['tech'],
  'belkin': ['tech'],
  'sonos': ['tech', 'home-tech'],
  'amazon': ['tech'],
  'logitech': ['tech', 'office'],
  'razer': ['tech', 'gaming'],
  'beats': ['tech', 'headphones-audio'],
  'fujifilm': ['tech', 'film-cameras'],
  'peak design': ['travel-outdoors', 'tech'],
  'nintendo': ['tech', 'gaming'],
  'oura': ['tech', 'wellness'],

  // Home
  'brooklinen': ['home'],
  'parachute': ['home'],
  'casper': ['home'],
  'le creuset': ['home'],
  'staub': ['home'],
  'our place': ['home'],
  'caraway': ['home'],
  'anthropologie': ['home'],
  'west elm': ['home'],
  'cb2': ['home'],
  'pottery barn': ['home'],
  'snowe': ['home'],
  'lunya': ['home'],
  'voluspa': ['home'],
  'diptyque': ['home', 'wellness'],
  'otherland': ['home'],
  'boy smells': ['home'],
  'yankee candle': ['home'],

  // Food & Drinks
  'godiva': ['food-drinks'],
  'harry & david': ['food-drinks', 'gift-baskets'],
  'sugarfina': ['food-drinks'],
  'graza': ['food-drinks'],
  'vosges': ['food-drinks'],
  'baked by melissa': ['food-drinks'],
  'fly by jing': ['food-drinks'],
  'mouth': ['food-drinks', 'gift-baskets'],
  'fellow': ['food-drinks', 'home'],
  'nespresso': ['food-drinks', 'tech'],
  'levain bakery': ['food-drinks'],
  'milk bar': ['food-drinks'],
  'goldbelly': ['food-drinks'],
  'compartés': ['food-drinks'],

  // Wellness
  'therabody': ['wellness', 'wellness-tech'],
  'theragun': ['wellness', 'wellness-tech'],
  'hatch': ['wellness', 'home-tech'],
  'vitruvi': ['wellness', 'home'],

  // Travel & Outdoors
  'away': ['travel-outdoors'],
  'tumi': ['travel-outdoors'],
  'ridge': ['travel-outdoors', 'fashion-accessories'],
  'osprey': ['travel-outdoors'],
  'yeti': ['travel-outdoors', 'home'],
  'stanley': ['travel-outdoors', 'home'],
  'hydro flask': ['travel-outdoors'],

  // Baby & Kids — ONLY explicit child brands
  'lovevery': ['baby-kids'],
  'cuddle+kind': ['baby-kids'],
  'tegu': ['baby-kids'],
  'hanna andersson': ['baby-kids'],
  'babybjörn': ['baby-kids'],
  'babybjorn': ['baby-kids'],
  'tushbaby': ['baby-kids'],
  'baby blossom': ['baby-kids'],

  // Personalized
  'rifle paper co': ['personalized', 'home'],
  'moleskine': ['personalized', 'office'],
  'leuchtturm': ['personalized', 'office'],

  // Flowers
  'urbanstems': ['flowers'],
  'the bouqs': ['flowers'],
  'bloomsybox': ['flowers'],
  'farmgirl flowers': ['flowers'],
};

// ---------------------------------------------------------------------------
// Name-based patterns (applied AFTER brand-based)
// ---------------------------------------------------------------------------
const NAME_PATTERNS = [
  // Knife/cutlery → home, never baby-kids
  { pattern: /\b(knife|knives|cutlery|cleaver|chef.s?\s+knife)\b/i, cats: ['home'] },

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
  { pattern: /\b(shorts?|trunks?|swim)\b/i, cats: ['fashion-accessories'] },
  { pattern: /sneaker|shoe|slipper|runner/i, cats: ['fashion-accessories'] },
  { pattern: /basket|bundle|sampler|collection|set.*gift/i, cats: ['gift-baskets'] },
  { pattern: /yoga|meditation|wellness|massage|theragun/i, cats: ['wellness'] },
  { pattern: /phone case|charger|cable|adapter|dock|stand/i, cats: ['tech'] },
  { pattern: /notebook|journal|planner|pen|stationery/i, cats: ['personalized', 'office'] },
  { pattern: /custom|personali|monogram|engrav/i, cats: ['personalized'] },
  { pattern: /plant|succulent|garden/i, cats: ['home'] },
  { pattern: /flower|bouquet|arrangement|rose|tulip|lily|orchid/i, cats: ['flowers'] },
  { pattern: /gift\s*card|gift\s*certificate/i, cats: ['gift-of-choice'] },
];

// Baby-kids name pattern — ONLY these specific words qualify
const BABY_KIDS_NAME_RE = /\b(baby|babies|toddler|infant|newborn|kid['']?s?\b|child|children|nursery|onesie|pacifier|teether|stroller)\b/i;

// ---------------------------------------------------------------------------
// Infer categories for a product
// ---------------------------------------------------------------------------
function inferCategories(product) {
  const brandLower = (product.brand_name || '').toLowerCase().trim();
  const name = product.name || '';
  const cats = new Set();

  // 1. Brand-based (highest priority)
  for (const [brand, slugs] of Object.entries(BRAND_CATEGORIES)) {
    if (brandLower === brand || brandLower.includes(brand)) {
      slugs.forEach(c => cats.add(c));
    }
  }

  // 2. Name-based patterns
  for (const { pattern, cats: slugs } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      slugs.forEach(c => cats.add(c));
    }
  }

  // 3. Baby-kids: ONLY if brand is an explicit baby brand OR name matches strict pattern
  //    AND brand is NOT on the deny list
  const isDeniedBrand = BABY_KIDS_DENY_BRANDS.has(brandLower);
  if (!isDeniedBrand && BABY_KIDS_NAME_RE.test(name)) {
    // Only add baby-kids if not already categorized by brand into something else
    // (e.g., a knife set with "kid-safe" in the name should not become baby-kids)
    const hasKnifePattern = /\b(knife|knives|cutlery|cleaver)\b/i.test(name);
    if (!hasKnifePattern) {
      cats.add('baby-kids');
    }
  }

  // 4. Gift card detection
  if (/gift\s*card|gift\s*certificate/i.test(name)) {
    cats.add('gift-of-choice');
  }

  // 5. REMOVE baby-kids if brand is on deny list (safety net)
  if (isDeniedBrand) {
    cats.delete('baby-kids');
  }

  // 6. Fallback: 'home' (not 'gift-baskets')
  if (cats.size === 0) {
    cats.add('home');
  }

  // Clean up excluded categories
  cats.delete('earth-month');
  cats.delete('nurse-appreciation');
  cats.delete('admin-appreciation');

  return [...cats];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log(`fix-categories.mjs ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  // Fetch ALL active products
  const { data: products, error } = await supabase
    .from('marketplace_products')
    .select('id, name, brand_name, brand_slug, categories')
    .eq('is_active', true);

  if (error) { console.error('Fetch error:', error); return; }
  console.log(`Total active products: ${products.length}`);

  // Count baby-kids BEFORE
  const babyBefore = products.filter(p =>
    Array.isArray(p.categories) && p.categories.includes('baby-kids')
  ).length;
  console.log(`Baby & Kids products BEFORE: ${babyBefore}`);

  let changed = 0;
  let babyAfter = 0;
  const changes = [];

  for (const p of products) {
    const newCats = inferCategories(p);
    const oldCats = Array.isArray(p.categories) ? p.categories : [];

    // Check if changed
    const oldSet = new Set(oldCats);
    const newSet = new Set(newCats);
    const isDiff = oldSet.size !== newSet.size || [...oldSet].some(c => !newSet.has(c));

    if (newCats.includes('baby-kids')) babyAfter++;

    if (isDiff) {
      changes.push({
        id: p.id,
        name: p.name,
        brand: p.brand_name,
        old: oldCats,
        new: newCats,
      });

      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from('marketplace_products')
          .update({ categories: newCats })
          .eq('id', p.id);

        if (upErr) {
          console.error(`Failed ${p.id}:`, upErr.message);
        } else {
          changed++;
        }
      } else {
        changed++;
      }
    }
  }

  console.log(`\nProducts recategorized: ${changed}`);
  console.log(`Baby & Kids AFTER: ${babyAfter}`);
  console.log(`Baby & Kids removed: ${babyBefore - babyAfter}`);

  // Log notable changes
  const notable = changes.filter(c =>
    c.old.includes('baby-kids') && !c.new.includes('baby-kids')
  );
  if (notable.length > 0) {
    console.log(`\nRemoved from baby-kids (${notable.length}):`);
    notable.forEach(c => {
      console.log(`  "${c.name}" (${c.brand}) : [${c.old.join(',')}] → [${c.new.join(',')}]`);
    });
  }

  // Log items staying in baby-kids
  const staying = products.filter(p => {
    const newCats = inferCategories(p);
    return newCats.includes('baby-kids');
  });
  if (staying.length > 0) {
    console.log(`\nRemaining in baby-kids (${staying.length}):`);
    staying.slice(0, 20).forEach(p => {
      console.log(`  "${p.name}" (${p.brand_name})`);
    });
  }
}

run().catch(err => { console.error(err); process.exit(1); });
