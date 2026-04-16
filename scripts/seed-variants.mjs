#!/usr/bin/env node
/**
 * seed-variants.mjs
 *
 * Populates the `variants` JSONB column on marketplace_products
 * using brand_slug + name ILIKE pattern matching.
 *
 * Variant types: size, color, scent, flavor, style, material
 *
 * Usage:
 *   node scripts/seed-variants.mjs              # Run seeding
 *   node scripts/seed-variants.mjs --dry-run    # Preview without writing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ffgetlejrwhpwvwtviqm.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2V0bGVqcndocHd2d3R2aXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU0OTMzNiwiZXhwIjoyMDg3MTI1MzM2fQ.N0T8rpaPAYSXERkv1GO05g_-1iYfgd0FeT_VNODu27w';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let variantCounter = 0;

function makeVariant(name, type, priceCents, inStock = true) {
  variantCounter++;
  return {
    id: `v${variantCounter}`,
    name,
    type,
    price_cents: priceCents,
    in_stock: inStock,
  };
}

function sizeVariants(sizes, basePriceCents, incrementCents = 0) {
  return sizes.map((s, i) =>
    makeVariant(s, 'size', basePriceCents + i * incrementCents)
  );
}

function colorVariants(colors, priceCents) {
  return colors.map((c) => makeVariant(c, 'color', priceCents));
}

function scentVariants(scents, priceCents) {
  return scents.map((s) => makeVariant(s, 'scent', priceCents));
}

function flavorVariants(flavors, priceCents) {
  return flavors.map((f) => makeVariant(f, 'flavor', priceCents));
}

// ---------------------------------------------------------------------------
// Variant rules: { brandSlug, namePattern (ILIKE), variants, minPrice? }
// ---------------------------------------------------------------------------

const rules = [];

// ── APPAREL: Marine Layer (sizes XS–XXL) ────────────────────────────────
const apparelSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

rules.push({
  brandSlug: 'marine-layer',
  namePattern: '%Pullover%',
  variants: sizeVariants(apparelSizes, 15000),
});
rules.push({
  brandSlug: 'marine-layer',
  namePattern: '%Sweatshirt%',
  variants: sizeVariants(apparelSizes, 9800),
});
rules.push({
  brandSlug: 'marine-layer',
  namePattern: '%Hoodie%',
  variants: sizeVariants(apparelSizes, 10000),
});

// ── APPAREL: Allbirds shoes (sizes 7–13) ────────────────────────────────
const shoeSizes = ['7', '8', '9', '10', '11', '12', '13'];
rules.push({
  brandSlug: 'allbirds',
  namePattern: '%',
  variants: sizeVariants(shoeSizes, 11000),
});

// ── APPAREL: Cuts Clothing ──────────────────────────────────────────────
rules.push({
  brandSlug: 'cuts-clothing',
  namePattern: '%Hoodie%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 11800),
});
rules.push({
  brandSlug: 'cuts-clothing',
  namePattern: '%Q-Zip%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 9800),
});
rules.push({
  brandSlug: 'cuts-clothing',
  namePattern: '%Jogger%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 11800),
});

// ── APPAREL: Mack Weldon ────────────────────────────────────────────────
rules.push({
  brandSlug: 'mack-weldon',
  namePattern: '%T-Shirt%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 6800),
});
rules.push({
  brandSlug: 'mack-weldon',
  namePattern: '%Vest%',
  variants: sizeVariants(['S', 'M', 'L', 'XL'], 17800),
});

// ── APPAREL: Honeylove ──────────────────────────────────────────────────
rules.push({
  brandSlug: 'honeylove',
  namePattern: '%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL', '2X', '3X'], 8400),
});

// ── APPAREL: Halfdays ───────────────────────────────────────────────────
rules.push({
  brandSlug: 'halfdays-apparel',
  namePattern: '%Jacket%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL'], 39500),
});
rules.push({
  brandSlug: 'halfdays-apparel',
  namePattern: '%Short%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL'], 6500),
});
rules.push({
  brandSlug: 'halfdays-apparel',
  namePattern: '%Legging%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL'], 9500),
});

// ── APPAREL: Carbon38 ───────────────────────────────────────────────────
rules.push({
  brandSlug: 'carbon-38',
  namePattern: '%',
  variants: sizeVariants(['XS', 'S', 'M', 'L'], 9800),
});

// ── APPAREL: Ten Thousand ───────────────────────────────────────────────
rules.push({
  brandSlug: 'ten-thousand',
  namePattern: '%Short%',
  variants: sizeVariants(['S', 'M', 'L', 'XL'], 8800),
});

// ── APPAREL: Lunya (apparel items only) ─────────────────────────────────
rules.push({
  brandSlug: 'lunya',
  namePattern: '%Tee%Set%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL'], 19800),
});

// ── APPAREL: Patagonia ──────────────────────────────────────────────────
rules.push({
  brandSlug: 'patagonia',
  namePattern: '%Nano Puff%',
  variants: sizeVariants(['XS', 'S', 'M', 'L', 'XL', 'XXL'], 24900),
});

// ── APPAREL: The North Face (apparel) ───────────────────────────────────
rules.push({
  brandSlug: 'the-north-face',
  namePattern: '%Hoodie%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 6500),
});
rules.push({
  brandSlug: 'the-north-face',
  namePattern: '%Beanie%',
  variants: sizeVariants(['S/M', 'L/XL'], 3000),
});

// ── APPAREL: Prodigi (custom photo apparel) ─────────────────────────────
rules.push({
  brandSlug: 'prodigi-apparel',
  namePattern: '%T-Shirt%',
  variants: sizeVariants(['S', 'M', 'L', 'XL', 'XXL'], 2999, 200),
});

// ── COLORS: YETI tumblers ───────────────────────────────────────────────
const yetiColors = ['Black', 'White', 'Navy', 'Seafoam', 'Coral', 'Chartreuse'];
rules.push({
  brandSlug: 'yeti',
  namePattern: '%Rambler%',
  variants: colorVariants(yetiColors, 3800),
});
rules.push({
  brandSlug: 'yeti',
  namePattern: '%Tumbler%',
  variants: colorVariants(yetiColors, 3800),
});
rules.push({
  brandSlug: 'yeti',
  namePattern: '%Water Bottle%',
  variants: colorVariants(yetiColors, 5000),
});
rules.push({
  brandSlug: 'yeti',
  namePattern: '%Cooler%',
  variants: colorVariants(['White', 'Tan', 'Navy', 'Coral'], 25000),
});
rules.push({
  brandSlug: 'yeti',
  namePattern: '%Flask%',
  variants: colorVariants(yetiColors, 6000),
});

// ── COLORS: Stanley ─────────────────────────────────────────────────────
const stanleyColors = ['Cream', 'Rose', 'Black', 'Green', 'Fog'];
rules.push({
  brandSlug: 'stanley',
  namePattern: '%Tumbler%',
  variants: colorVariants(stanleyColors, 3500),
});

// ── COLORS: Hydro Flask ─────────────────────────────────────────────────
const hydroColors = ['Pacific', 'Lava', 'Sunflower', 'Stone', 'Black'];
rules.push({
  brandSlug: 'hydro-flask',
  namePattern: '%',
  variants: colorVariants(hydroColors, 5500),
});

// ── COLORS: Away luggage ────────────────────────────────────────────────
const awayColors = ['Black', 'Green', 'Navy', 'Sand'];
rules.push({
  brandSlug: 'away',
  namePattern: '%',
  variants: colorVariants(awayColors, 27500),
});

// ── COLORS: Le Creuset ──────────────────────────────────────────────────
const lcColors = ['Cerise', 'Flame', 'Caribbean', 'White', 'Artichaut'];
rules.push({
  brandSlug: 'le-creuset',
  namePattern: '%Dutch Oven%',
  variants: colorVariants(lcColors, 42500),
});
rules.push({
  brandSlug: 'le-creuset',
  namePattern: '%Mug%',
  variants: colorVariants(lcColors, 8500),
});
rules.push({
  brandSlug: 'le-creuset',
  namePattern: '%Casserole%',
  variants: colorVariants(lcColors, 12300),
});
rules.push({
  brandSlug: 'le-creuset',
  namePattern: '%Loaf Pan%',
  variants: colorVariants(lcColors, 5600),
});

// ── PRINT SIZES: Prodigi canvas (price varies by size) ──────────────────
// Canvas already has separate products per size — add frame style variants
rules.push({
  brandSlug: 'prodigi-canvas',
  namePattern: '%12%12%',
  variants: [
    makeVariant('Gallery Wrap', 'style', 3499),
    makeVariant('Thin Wrap', 'style', 2999),
  ],
});
rules.push({
  brandSlug: 'prodigi-canvas',
  namePattern: '%16%20%',
  variants: [
    makeVariant('Gallery Wrap', 'style', 4999),
    makeVariant('Thin Wrap', 'style', 4499),
  ],
});
rules.push({
  brandSlug: 'prodigi-canvas',
  namePattern: '%24%36%',
  variants: [
    makeVariant('Gallery Wrap', 'style', 7999),
    makeVariant('Thin Wrap', 'style', 7499),
  ],
});

// ── PRINT SIZES: Prodigi framed (already separate by color — add sizes) ─
rules.push({
  brandSlug: 'prodigi-frames',
  namePattern: '%Black%',
  variants: sizeVariants(['8x10', '11x14', '16x20'], 4499, 1500),
});
rules.push({
  brandSlug: 'prodigi-frames',
  namePattern: '%White%',
  variants: sizeVariants(['8x10', '11x14', '16x20'], 4499, 1500),
});
rules.push({
  brandSlug: 'prodigi-frames',
  namePattern: '%Natural%',
  variants: sizeVariants(['8x10', '11x14', '16x20'], 5499, 1500),
});

// ── SCENTS: Diptyque ────────────────────────────────────────────────────
const diptyqueScents = ['Baies', 'Figuier', 'Roses', 'Tuberose'];
rules.push({
  brandSlug: 'diptyque',
  namePattern: '%Candle%',
  variants: scentVariants(diptyqueScents, 7500),
});

// ── SCENTS: Otherland ───────────────────────────────────────────────────
const otherlandScents = ['Daybed', 'Rattan', 'Chandelier', 'Garden Party'];
rules.push({
  brandSlug: 'otherland',
  namePattern: '%',
  variants: scentVariants(otherlandScents, 11000),
});

// ── SCENTS: Vitruvi ─────────────────────────────────────────────────────
const vitruviScents = ['Lavender', 'Eucalyptus', 'Forest', 'Pacific'];
rules.push({
  brandSlug: 'vitruvi',
  namePattern: '%Diffuser%',
  variants: scentVariants(vitruviScents, 12000),
});

// ── SCENTS: Homesick Candles ────────────────────────────────────────────
rules.push({
  brandSlug: 'homesick-candles',
  namePattern: '%',
  variants: scentVariants(
    ['California', 'New York', 'Hawaii', 'Texas', 'Oregon'],
    3400
  ),
});

// ── SCENTS: Pura ────────────────────────────────────────────────────────
rules.push({
  brandSlug: 'pura',
  namePattern: '%',
  variants: scentVariants(
    ['Linens & Surf', 'Pacific Aqua', 'Yuzu Citron', 'Simply Lavender'],
    4400
  ),
});

// ── SCENTS: Saje ────────────────────────────────────────────────────────
rules.push({
  brandSlug: 'saje',
  namePattern: '%',
  variants: scentVariants(
    ['Peppermint Halo', 'Stress Release', 'Rain Forest', 'Sleep Well'],
    3200
  ),
});

// ── FLAVORS: Godiva ─────────────────────────────────────────────────────
const godivaFlavors = [
  'Milk Chocolate',
  'Dark Chocolate',
  'Assorted',
  'White Chocolate',
];
rules.push({
  brandSlug: 'godiva',
  namePattern: '%',
  variants: flavorVariants(godivaFlavors, 5500),
});

// ── FLAVORS: Sugarfina (no alcohol names) ───────────────────────────────
const sugarfinaFlavors = [
  'Sugar Lips',
  'Fruity Pebbles',
  'Pink Lemonade',
  'Peach Bellini',
];
rules.push({
  brandSlug: 'sugarfina',
  namePattern: '%',
  variants: flavorVariants(sugarfinaFlavors, 2800),
});

// ── FLAVORS: Baked by Melissa ───────────────────────────────────────────
rules.push({
  brandSlug: 'baked-by-melissa',
  namePattern: '%',
  variants: flavorVariants(
    ['Original', 'Red Velvet', 'Tie-Dye', 'Cookie Dough', 'Peanut Butter'],
    3500
  ),
});

// ── FLAVORS: Levain Bakery ──────────────────────────────────────────────
rules.push({
  brandSlug: 'levain-bakery',
  namePattern: '%',
  variants: flavorVariants(
    [
      'Chocolate Chip Walnut',
      'Dark Chocolate Chocolate Chip',
      'Dark Chocolate Peanut Butter Chip',
      'Oatmeal Raisin',
    ],
    4000
  ),
});

// ── FLAVORS: Blue Bottle Coffee ─────────────────────────────────────────
rules.push({
  brandSlug: 'blue-bottle-coffee',
  namePattern: '%',
  variants: flavorVariants(
    ['Bella Donovan', 'Giant Steps', 'Three Africas', 'Beta Blend'],
    2000
  ),
});
rules.push({
  brandSlug: 'blue-bottle',
  namePattern: '%',
  variants: flavorVariants(
    ['Bella Donovan', 'Giant Steps', 'Three Africas', 'Beta Blend'],
    2000
  ),
});

// ── COLORS: Brooklinen ──────────────────────────────────────────────────
rules.push({
  brandSlug: 'brooklinen',
  namePattern: '%Sheet%',
  variants: colorVariants(
    ['Classic White', 'Cream', 'Graphite', 'Sky Blue'],
    19900
  ),
});

// ── COLORS: Fellow (coffee gear) ────────────────────────────────────────
rules.push({
  brandSlug: 'fellow',
  namePattern: '%',
  variants: colorVariants(['Matte Black', 'Matte White', 'Stone Blue'], 6500),
});

// ── COLORS: Our Place ───────────────────────────────────────────────────
rules.push({
  brandSlug: 'our-place',
  namePattern: '%',
  variants: colorVariants(
    ['Steam', 'Char', 'Sage', 'Lavender', 'Berry'],
    14500
  ),
});

// ── COLORS: Simple Modern ───────────────────────────────────────────────
rules.push({
  brandSlug: 'simple-modern',
  namePattern: '%',
  variants: colorVariants(
    ['Midnight Black', 'Winter White', 'Cream Leopard', 'Almond Birch'],
    2800
  ),
});

// ── COLORS: Ridge (wallets) ─────────────────────────────────────────────
rules.push({
  brandSlug: 'ridge',
  namePattern: '%',
  variants: colorVariants(
    ['Matte Black', 'Silver', 'Burnt Titanium', 'Rose Gold'],
    9500
  ),
});

// ── MATERIALS: Barefoot Dreams ──────────────────────────────────────────
rules.push({
  brandSlug: 'barefoot-dreams',
  namePattern: '%Throw%',
  variants: colorVariants(
    ['Dove Gray', 'Carbon', 'Stone', 'Cream', 'Dusty Rose'],
    18000
  ),
});

// ── COLORS: East Fork (pottery) ─────────────────────────────────────────
rules.push({
  brandSlug: 'east-fork',
  namePattern: '%',
  variants: colorVariants(
    ['Panna Cotta', 'Morel', 'Night Swim', 'Tequila Sunrise'],
    3400
  ),
});

// ── COLORS: Great Jones (cookware) ──────────────────────────────────────
rules.push({
  brandSlug: 'great-jones',
  namePattern: '%',
  variants: colorVariants(['Broccoli', 'Blueberry', 'Macaron', 'Earl Grey'], 7500),
});

// ── SIZE: Brooklinen bundles ────────────────────────────────────────────
rules.push({
  brandSlug: 'brooklinen',
  namePattern: '%Bundle%',
  variants: sizeVariants(['Twin', 'Full', 'Queen', 'King', 'Cal King'], 29900),
});

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function applyRule(rule) {
  const { brandSlug, namePattern, variants } = rule;

  // Compute min price for starting_price_cents update
  const minPrice = Math.min(...variants.map((v) => v.price_cents));

  let query = supabase
    .from('marketplace_products')
    .update({
      variants: JSON.stringify(variants),
      starting_price_cents: minPrice,
    })
    .eq('brand_slug', brandSlug)
    .ilike('name', namePattern);

  if (DRY_RUN) {
    // In dry-run mode just count matching rows
    const { data } = await supabase
      .from('marketplace_products')
      .select('id', { count: 'exact' })
      .eq('brand_slug', brandSlug)
      .ilike('name', namePattern);
    return { brand: brandSlug, pattern: namePattern, matched: data?.length || 0 };
  }

  const { data, error, count } = await query.select('id');
  if (error) {
    console.error(`  ERROR [${brandSlug}] ${namePattern}: ${error.message}`);
    return { brand: brandSlug, pattern: namePattern, matched: 0, error: error.message };
  }
  return { brand: brandSlug, pattern: namePattern, matched: data?.length || 0 };
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Seed Variants — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  ${rules.length} rules to apply`);
  console.log(`${'='.repeat(60)}\n`);

  let totalUpdated = 0;
  const typeCounts = {};

  for (const rule of rules) {
    const result = await applyRule(rule);
    const variantType = rule.variants[0]?.type || 'unknown';
    typeCounts[variantType] = (typeCounts[variantType] || 0) + result.matched;
    totalUpdated += result.matched;

    if (result.matched > 0) {
      console.log(
        `  ✓ ${result.brand} [${result.pattern}] → ${result.matched} product(s) — ${rule.variants.length} ${variantType} variants`
      );
    } else {
      console.log(`  - ${result.brand} [${result.pattern}] → 0 matches (skipped)`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TOTAL: ${totalUpdated} product rows updated`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(typeCounts).sort()) {
    console.log(`    ${type}: ${count} products`);
  }
  console.log(`${'='.repeat(60)}\n`);

  // Sample verification
  if (!DRY_RUN) {
    console.log('Sample check:\n');
    const { data: sample } = await supabase
      .from('marketplace_products')
      .select('name, brand_slug, variants')
      .neq('variants', '[]')
      .limit(5);

    if (sample) {
      for (const row of sample) {
        const variants = typeof row.variants === 'string'
          ? JSON.parse(row.variants)
          : row.variants;
        console.log(`  ${row.brand_slug} | ${row.name}`);
        console.log(`    → ${variants.length} variants: ${variants.map((v) => v.name).join(', ')}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
