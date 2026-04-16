#!/usr/bin/env node
/**
 * sync-goody-brands.mjs
 *
 * Fetches ALL brands from Goody /v1/brands API and upserts into
 * marketplace_brands table (logo, shipping info, brand values).
 * Idempotent: uses slug as dedup key.
 *
 * Usage:
 *   node scripts/sync-goody-brands.mjs
 *   node scripts/sync-goody-brands.mjs --dry-run
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
const envParent = resolve(__dirname, '..', '..', '..', '..', '.env.local');
config({ path: existsSync(envLocal) ? envLocal : envParent });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GOODY_API_KEY = process.env.GOODY_COMMERCE_API_KEY;
const GOODY_BASE = 'https://api.ongoody.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOODY_API_KEY) { console.error('Missing GOODY_COMMERCE_API_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
// Fetch all brands from Goody (paginated)
// ---------------------------------------------------------------------------
async function fetchAllBrands() {
  const allBrands = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${GOODY_BASE}/v1/brands?per_page=${perPage}&page=${page}`;
    console.log(`Fetching ${url} ...`);

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GOODY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Goody API error ${res.status}: ${text}`);
      break;
    }

    const data = await res.json();

    // Goody returns an array directly (or wrapped in { data: [...] })
    const brands = Array.isArray(data) ? data : (data.data || data.brands || []);

    if (brands.length === 0) break;

    allBrands.push(...brands);
    console.log(`  Page ${page}: ${brands.length} brands (total: ${allBrands.length})`);

    if (brands.length < perPage) break;
    page++;
  }

  return allBrands;
}

// ---------------------------------------------------------------------------
// Ensure table exists (bootstrap)
// ---------------------------------------------------------------------------
async function ensureTable() {
  // Check if table exists by trying a simple select
  const { error } = await supabase.from('marketplace_brands').select('slug').limit(1);
  if (!error) return true;

  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║  marketplace_brands table does not exist.                ║');
    console.error('║  Run the migration first via Supabase SQL Editor:        ║');
    console.error('║  File: supabase/migrations/20260416_marketplace_brands_table.sql ║');
    console.error('╚══════════════════════════════════════════════════════════╝\n');
    return false;
  }
  return true; // Other errors (e.g. RLS) are OK
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log(`sync-goody-brands.mjs ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  // Check table exists
  const tableReady = await ensureTable();
  if (!tableReady && !DRY_RUN) {
    process.exit(1);
  }

  const brands = await fetchAllBrands();
  console.log(`\nFetched ${brands.length} brands from Goody API`);

  if (brands.length === 0) {
    console.log('No brands found. Exiting.');
    return;
  }

  // Count brands with logos
  const withLogo = brands.filter(b => b.logo_image?.url).length;
  console.log(`Brands with logos: ${withLogo}/${brands.length} (${Math.round(withLogo / brands.length * 100)}%)`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — not writing to database. Sample:');
    brands.slice(0, 5).forEach(b => {
      console.log(`  ${b.name} → ${slugify(b.name)} | logo: ${b.logo_image?.url ? 'yes' : 'no'} | shipping: ${b.shipping_price}c`);
    });
    return;
  }

  // Upsert in batches of 50
  const BATCH_SIZE = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE).map(b => ({
      slug: slugify(b.name),
      name: b.name,
      goody_id: b.id || null,
      logo_url: b.logo_image?.url || null,
      description: b.description || null,
      shipping_price_cents: typeof b.shipping_price === 'number' ? b.shipping_price : null,
      free_shipping_min_cents: typeof b.free_shipping_minimum === 'number' ? b.free_shipping_minimum : null,
      brand_values: Array.isArray(b.brand_values) ? b.brand_values.map(v => v.name || v) : [],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('marketplace_brands')
      .upsert(batch, { onConflict: 'slug' });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${errors} errors`);
}

run().catch(err => { console.error(err); process.exit(1); });
