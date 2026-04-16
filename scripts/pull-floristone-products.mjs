/**
 * One-shot idempotent script: pull Floristone flower products into
 * marketplace_products via Supabase REST.
 *
 * - Paginates the Floristone API (50 per page)
 * - Skips funeral/sympathy-only products
 * - Maps Floristone category codes to our marketplace_categories slugs
 * - Deduplicates on external_id (product CODE)
 *
 * Run: node scripts/pull-floristone-products.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Support both main repo and git worktree layouts
const envLocal = resolve(__dirname, '..', '.env.local');
const envFallback = resolve(__dirname, '..', '..', '..', '..', '.env.local');
config({ path: existsSync(envLocal) ? envLocal : envFallback });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FLORISTONE_API_URL = 'https://www.floristone.com/api/rest/flowershop';
const API_KEY = process.env.FLORISTONE_API_KEY;
const API_PASS = process.env.FLORISTONE_API_PASSWORD;

if (!API_KEY || !API_PASS) {
  console.error('Missing FLORISTONE_API_KEY or FLORISTONE_API_PASSWORD');
  process.exit(1);
}

const AUTH_HEADER = 'Basic ' + Buffer.from(`${API_KEY}:${API_PASS}`).toString('base64');

// Funeral/sympathy keywords (case-insensitive matching)
const FUNERAL_KEYWORDS = ['sympathy', 'funeral', 'memorial', 'bereavement', 'condolence'];

// Funeral category codes to exclude
const FUNERAL_CODES = new Set(['sy', 'fhm', 'fm', 'fu']);

// Floristone category code → our slug mapping
const CODE_TO_SLUG = {
  bs: 'flowers-best-sellers',
  ao: 'flowers-all-occasions',
  bd: 'flowers-birthday',
  an: 'flowers-anniversary',
  lr: 'flowers-love-romance',
  gw: 'flowers-get-well',
  nb: 'flowers-new-baby',
  ty: 'flowers-thank-you',
  sy: null, // sympathy — excluded
  md: 'flowers-mothers-day',
  vd: 'flowers-valentines-day',
  ch: 'flowers-christmas',
  ea: 'flowers-easter',
  c:  'flowers-centerpieces',
  o:  'flowers-one-sided',
  v:  'flowers-vases',
  r:  'flowers-roses',
  x:  'flowers-mixed-arrangements',
  p:  'flowers-plants',
  b:  'flowers-bouquets',
  // Additional codes found in live API
  fa: 'flowers-centerpieces', // Table Arrangements → map to centerpieces
  fhm: null, // Funeral Flowers — excluded
  fm: null,  // Funeral — excluded
  fu: null,  // Funeral — excluded
};

/**
 * Extract category codes from product.CATEGORIES array of {DISPLAY, CATEGORY}.
 */
function getCategoryCodes(product) {
  const categories = product.CATEGORIES;
  if (!Array.isArray(categories)) return [];
  return categories
    .map(c => (c.CATEGORY || '').toLowerCase().trim())
    .filter(Boolean);
}

/**
 * Determine if a product is funeral/sympathy-only (all its categories are funeral).
 */
function isFuneralOnly(product) {
  const catCodes = getCategoryCodes(product);

  if (catCodes.length === 0) {
    // No categories — check name/description
    const text = `${product.NAME || ''} ${product.DESCRIPTION || ''}`.toLowerCase();
    const hasFuneralKw = FUNERAL_KEYWORDS.some(kw => text.includes(kw));
    const hasNonFuneralKw = ['birthday', 'anniversary', 'love', 'romance', 'baby',
      'thank', 'get well', 'mother', 'valentine', 'christmas', 'easter',
      'bouquet', 'rose', 'centerpiece', 'plant', 'vase', 'arrangement']
      .some(kw => text.includes(kw));
    return hasFuneralKw && !hasNonFuneralKw;
  }

  // Has category codes — check if ALL are funeral
  const nonFuneral = catCodes.filter(code => !FUNERAL_CODES.has(code));
  return nonFuneral.length === 0;
}

/**
 * Map a product's category codes to our marketplace slugs, excluding funeral.
 */
function mapCategories(product) {
  const cats = ['flowers']; // always include root
  const catCodes = getCategoryCodes(product);

  for (const code of catCodes) {
    if (FUNERAL_CODES.has(code)) continue; // skip funeral
    const slug = CODE_TO_SLUG[code];
    if (slug) cats.push(slug);
  }

  return [...new Set(cats)];
}

/**
 * Clean description: strip HTML, truncate to 300 chars.
 */
function cleanDescription(desc) {
  if (!desc) return '';
  let clean = desc
    .replace(/<[^>]*>/g, '')  // strip HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length > 300) {
    clean = clean.slice(0, 297) + '...';
  }
  return clean;
}

/**
 * Pick the best image URL from the product.
 */
function pickImage(product) {
  return product.LARGE || product.EXTRALARGE || product.SMALL || null;
}

/**
 * Fetch all products from Floristone API.
 */
async function fetchAllProducts() {
  const url = `${FLORISTONE_API_URL}/getproducts`;
  const resp = await fetch(url, {
    headers: {
      Authorization: AUTH_HEADER,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Floristone API ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();

  // Handle different response formats
  if (Array.isArray(data)) return data;
  if (data.products && Array.isArray(data.products)) return data.products;
  if (data.PRODUCTS && Array.isArray(data.PRODUCTS)) return data.PRODUCTS;
  return [];
}

/**
 * Fetch existing external_ids so we can skip duplicates.
 */
async function getExistingIds() {
  const { data, error } = await supabase
    .from('marketplace_products')
    .select('external_id')
    .eq('provider', 'floristone')
    .not('external_id', 'is', null);

  if (error) {
    console.warn('Could not fetch existing IDs:', error.message);
    return new Set();
  }
  return new Set((data || []).map(r => r.external_id));
}

async function main() {
  console.log('Pulling Floristone products...');

  const existingIds = await getExistingIds();
  console.log(`  ${existingIds.size} existing Floristone products in DB`);

  console.log('  Fetching all products from Floristone API...');
  const allProducts = await fetchAllProducts();

  console.log(`  Fetched ${allProducts.length} total products from Floristone API`);

  // Sort by price for best_seller tagging (cheapest/most popular first)
  const sorted = [...allProducts].sort((a, b) =>
    parseFloat(a.PRICE || '9999') - parseFloat(b.PRICE || '9999')
  );
  const bestSellerCodes = new Set(sorted.slice(0, 10).map(p => p.CODE));

  let inserted = 0;
  let skippedFuneral = 0;
  let skippedDuplicate = 0;
  let errors = 0;

  // Process in batches of 20
  const BATCH_SIZE = 20;
  const toInsert = [];

  for (const product of allProducts) {
    const code = product.CODE;
    if (!code) continue;

    // Skip duplicates
    if (existingIds.has(code)) {
      skippedDuplicate++;
      continue;
    }

    // Skip funeral-only
    if (isFuneralOnly(product)) {
      skippedFuneral++;
      continue;
    }

    const image = pickImage(product);
    const categories = mapCategories(product);
    const scope = bestSellerCodes.has(code) ? ['best_seller'] : [];

    toInsert.push({
      name: product.NAME || cleanDescription(product.DESCRIPTION).slice(0, 100) || `Flower ${code}`,
      brand_name: 'Floristone',
      brand_slug: 'floristone',
      description: cleanDescription(product.DESCRIPTION),
      provider: 'floristone',
      base_price_cents: Math.round(parseFloat(product.PRICE || '0') * 100),
      starting_price_cents: Math.round(parseFloat(product.PRICE || '0') * 100),
      images: image ? [image] : [],
      in_stock: true,
      is_active: true,
      is_curated: true,
      curated_score: 80,
      emotional_impact: 'high',
      categories,
      scope,
      external_id: code,
      occasions: [],
    });
  }

  // Insert (no upsert — external_id has no unique constraint)
  // We already filtered out existing IDs above, so just insert.
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('marketplace_products')
      .insert(batch);

    if (error) {
      console.error(`  Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log('\nResults:');
  console.log(`  Inserted:           ${inserted}`);
  console.log(`  Skipped (funeral):  ${skippedFuneral}`);
  console.log(`  Skipped (existing): ${skippedDuplicate}`);
  console.log(`  Errors:             ${errors}`);
  console.log(`  Image source:       LARGE field (CDN URLs from floristone.com)`);
  console.log('Done.');
}

main().catch(err => {
  console.error('Pull script failed:', err);
  process.exit(1);
});
