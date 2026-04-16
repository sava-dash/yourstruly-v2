#!/usr/bin/env node
/**
 * remove-floristone.mjs
 *
 * Removes all Floristone provider products and flower categories from the
 * marketplace. Goody now supplies flowers via UrbanStems, The Bouqs, etc.
 *
 * Run: node scripts/remove-floristone.mjs
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Removing Floristone products and flower categories...\n');

  // 1. Delete all products where provider = 'floristone'
  const { data: products, error: prodCountErr } = await supabase
    .from('marketplace_products')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'floristone');

  const prodCount = products?.length ?? 0;

  const { error: prodErr } = await supabase
    .from('marketplace_products')
    .delete()
    .eq('provider', 'floristone');

  if (prodErr) {
    console.error('Error deleting Floristone products:', prodErr.message);
  } else {
    console.log(`Deleted Floristone products (provider = 'floristone')`);
  }

  // 2. Delete flower child categories first (FK constraint: parent_slug)
  const { data: childCats, error: childErr } = await supabase
    .from('marketplace_categories')
    .delete()
    .eq('parent_slug', 'flowers')
    .select('slug');

  if (childErr) {
    console.error('Error deleting flower child categories:', childErr.message);
  } else {
    console.log(`Deleted ${childCats?.length ?? 0} flower child categories`);
  }

  // 3. Delete the root 'flowers' category
  const { data: rootCat, error: rootErr } = await supabase
    .from('marketplace_categories')
    .delete()
    .eq('slug', 'flowers')
    .select('slug');

  if (rootErr) {
    console.error('Error deleting flowers root category:', rootErr.message);
  } else {
    console.log(`Deleted ${rootCat?.length ?? 0} flowers root category`);
  }

  // 4. Also remove any straggler categories with flowers- prefix
  const { data: stragglers, error: stragErr } = await supabase
    .from('marketplace_categories')
    .delete()
    .like('slug', 'flowers-%')
    .select('slug');

  if (stragErr) {
    console.error('Error deleting flowers-* categories:', stragErr.message);
  } else if (stragglers?.length > 0) {
    console.log(`Deleted ${stragglers.length} additional flowers-* categories`);
  }

  console.log('\nFloristone removal complete.');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
