import { NextRequest, NextResponse } from 'next/server';
import {
  MarketplaceService,
  isValidProvider,
  type ProductProvider,
  getFeaturedProducts,
} from '@/lib/marketplace';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/marketplace/products
 *
 * Two modes:
 *
 * 1. Legacy provider mode (floristone / prodigi):
 *      ?provider=floristone&category=...&search=...&page=1&perPage=50
 *      ?featured=true
 *
 * 2. New IA mode (marketplace_products table direct):
 *      ?brand=therabody
 *      ?scope=best_seller|gift_of_choice|personalized|all
 *      ?category=tech  or  ?category=tech/headphones-audio
 *      ?search=...&page=1&perPage=50
 *
 *    The new mode is picked whenever `provider` is omitted AND at least one
 *    of brand/scope/category is provided (or search only). Response includes
 *    starting_price_cents for every product.
 */

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  base_price_cents: number;
  sale_price_cents: number | null;
  starting_price_cents: number | null;
  images: string[] | null;
  in_stock: boolean;
  is_curated: boolean | null;
  curated_score: number | null;
  occasions: string[] | null;
  categories: string[] | null;
  scope: string[] | null;
  emotional_impact: string | null;
  why_we_love_it: string | null;
  is_active: boolean;
}

function shouldUseNewMode(params: URLSearchParams): boolean {
  if (params.get('provider')) return false;
  if (params.get('featured') === 'true') return false;
  return (
    !!params.get('brand') ||
    !!params.get('scope') ||
    !!params.get('category') ||
    !!params.get('search')
  );
}

async function handleNewMode(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const brand = searchParams.get('brand')?.trim().toLowerCase() || undefined;
  const scopeRaw = searchParams.get('scope')?.trim().toLowerCase();
  const scope = scopeRaw && scopeRaw !== 'all' ? scopeRaw : undefined;
  const categoryRaw = searchParams.get('category')?.trim().toLowerCase() || undefined;
  const search = searchParams.get('search') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '50', 10)));

  // Nested category path "tech/headphones-audio" → match the leaf slug; the
  // leaf is the most specific filter so it's what we apply. (Multi-slug OR
  // support can be layered in PR 2.)
  const category = categoryRaw?.includes('/')
    ? categoryRaw.split('/').pop()
    : categoryRaw;

  const supabase = await createClient();
  let query = supabase
    .from('marketplace_products')
    .select(
      'id, name, description, provider, brand_name, brand_slug, base_price_cents, sale_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active',
      { count: 'exact' }
    )
    .eq('is_active', true);

  if (brand) query = query.eq('brand_slug', brand);
  if (scope) query = query.contains('scope', [scope]);
  if (category && category !== 'all') {
    // Match against both categories[] and occasions[] — occasion slugs like
    // 'birthday', 'wedding' live in occasions[], not categories[].
    query = query.or(`categories.cs.{${category}},occasions.cs.{${category}}`);
  }
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

  query = query.order('curated_score', { ascending: false, nullsFirst: false });

  const start = (page - 1) * perPage;
  query = query.range(start, start + perPage - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('products new-mode query error:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }

  const rows = (data || []) as DbProduct[];
  const products = rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    brand: row.brand_name,
    brandSlug: row.brand_slug,
    basePriceCents: row.base_price_cents,
    salePriceCents: row.sale_price_cents,
    startingPriceCents: row.starting_price_cents ?? row.base_price_cents,
    images: row.images || [],
    inStock: row.in_stock,
    isCurated: row.is_curated,
    curatedScore: row.curated_score,
    occasions: row.occasions || [],
    categories: row.categories || [],
    scope: row.scope || [],
    emotionalImpact: row.emotional_impact,
    whyWeLoveIt: row.why_we_love_it,
  }));

  return NextResponse.json(
    {
      products,
      total: count || 0,
      page,
      perPage,
      hasMore: start + products.length < (count || 0),
      filters: { brand, scope, category },
    },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=120' } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // New IA mode takes priority when appropriate
    if (shouldUseNewMode(searchParams)) {
      return await handleNewMode(request);
    }

    // ── Legacy provider mode (unchanged) ────────────────────────────────
    const featured = searchParams.get('featured') === 'true';
    if (featured) {
      const perProvider = parseInt(searchParams.get('perProvider') || '10');
      const featuredProducts = await getFeaturedProducts(perProvider);
      return NextResponse.json({ featured: featuredProducts });
    }

    const providerParam = searchParams.get('provider');
    if (!providerParam) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidProvider(providerParam)) {
      return NextResponse.json(
        { error: `Invalid provider: ${providerParam}. Must be floristone or prodigi.` },
        { status: 400 }
      );
    }

    const provider = providerParam as ProductProvider;

    if (!process.env[`${provider.toUpperCase()}_API_KEY`] &&
        !process.env[`${provider.toUpperCase()}_APP_KEY`]) {
      return NextResponse.json(
        { error: `Provider ${provider} is not configured` },
        { status: 503 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '50')));
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const service = new MarketplaceService(provider);
    const result = await service.getProducts(category, search, undefined, page, perPage);

    return NextResponse.json({ provider, ...result });
  } catch (error) {
    console.error('Marketplace products API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return NextResponse.json(
          { error: 'Service not configured', message: error.message },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
