/**
 * One-shot idempotent script: seed "Flowers" root category and children
 * into marketplace_categories via Supabase REST.
 *
 * Children are derived from FLORISTONE_CATEGORIES in floristone.ts.
 * Funeral/sympathy-only categories are excluded per product direction.
 *
 * Run: node scripts/seed-flowers-category.mjs
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

// Funeral/sympathy slugs to exclude
const FUNERAL_SLUGS = new Set(['sympathy', 'funeral', 'memorial-service', 'bereavement']);

// Derived from FLORISTONE_CATEGORIES in src/lib/marketplace/providers/floristone.ts
// Occasions
const OCCASION_CHILDREN = [
  { slug: 'flowers-best-sellers',  name: 'Best Sellers',      sortOrder: 1 },
  { slug: 'flowers-all-occasions', name: 'All Occasions',     sortOrder: 2 },
  { slug: 'flowers-birthday',      name: 'Birthday',          sortOrder: 3 },
  { slug: 'flowers-anniversary',   name: 'Anniversary',       sortOrder: 4 },
  { slug: 'flowers-love-romance',  name: 'Love & Romance',    sortOrder: 5 },
  { slug: 'flowers-get-well',      name: 'Get Well',          sortOrder: 6 },
  { slug: 'flowers-new-baby',      name: 'New Baby',          sortOrder: 7 },
  { slug: 'flowers-thank-you',     name: 'Thank You',         sortOrder: 8 },
  // EXCLUDED: sympathy (sy) — funeral/sympathy category
  { slug: 'flowers-mothers-day',   name: "Mother's Day",      sortOrder: 9 },
  { slug: 'flowers-valentines-day',name: "Valentine's Day",   sortOrder: 10 },
  { slug: 'flowers-christmas',     name: 'Christmas',         sortOrder: 11 },
  { slug: 'flowers-easter',        name: 'Easter',            sortOrder: 12 },
];

// Product types
const PRODUCT_TYPE_CHILDREN = [
  { slug: 'flowers-centerpieces',       name: 'Centerpieces',        sortOrder: 13 },
  { slug: 'flowers-one-sided',          name: 'One-Sided',           sortOrder: 14 },
  { slug: 'flowers-vases',              name: 'Vases',               sortOrder: 15 },
  { slug: 'flowers-roses',              name: 'Roses',               sortOrder: 16 },
  { slug: 'flowers-mixed-arrangements', name: 'Mixed Arrangements',  sortOrder: 17 },
  { slug: 'flowers-plants',             name: 'Plants',              sortOrder: 18 },
  { slug: 'flowers-bouquets',           name: 'Bouquets',            sortOrder: 19 },
];

const ALL_CHILDREN = [...OCCASION_CHILDREN, ...PRODUCT_TYPE_CHILDREN];

async function main() {
  console.log('Seeding Flowers categories...');

  // Insert root
  const { error: rootErr } = await supabase
    .from('marketplace_categories')
    .upsert(
      {
        slug: 'flowers',
        name: 'Flowers',
        icon: 'Flower2',
        sort_order: 42,
        is_occasion: false,
        parent_slug: null,
      },
      { onConflict: 'slug' }
    );

  if (rootErr) {
    console.error('Failed to insert root flowers category:', rootErr.message);
    process.exit(1);
  }
  console.log('  Root: flowers');

  // Insert children
  const childRows = ALL_CHILDREN.map(c => ({
    slug: c.slug,
    name: c.name,
    icon: null,
    sort_order: c.sortOrder,
    is_occasion: false,
    parent_slug: 'flowers',
  }));

  const { error: childErr } = await supabase
    .from('marketplace_categories')
    .upsert(childRows, { onConflict: 'slug' });

  if (childErr) {
    console.error('Failed to insert child categories:', childErr.message);
    process.exit(1);
  }

  console.log(`  Children: ${ALL_CHILDREN.length} categories inserted`);
  console.log('  Excluded: sympathy (funeral/sympathy category)');
  console.log('Done. Flowers category tree seeded.');
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
