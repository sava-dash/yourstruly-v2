import { NextRequest, NextResponse } from 'next/server';
import {
  MarketplaceService,
  isValidProvider,
  type ProductProvider,
} from '@/lib/marketplace';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/marketplace/products/[id]
 *
 * Two modes:
 *   1. DB mode (default): fetches from marketplace_products by UUID.
 *   2. Legacy provider mode: ?provider=floristone|prodigi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const providerParam = searchParams.get('provider');

    // ── DB mode (no provider param) ──────────────────────────────────────
    if (!providerParam) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(
          'id, name, description, provider, brand_name, brand_slug, base_price_cents, sale_price_cents, starting_price_cents, images, in_stock, is_curated, curated_score, occasions, categories, scope, emotional_impact, why_we_love_it, is_active',
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const row = data as {
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
      };

      const product = {
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
      };

      return NextResponse.json(
        { product },
        { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=120' } },
      );
    }

    // ── Legacy provider mode ─────────────────────────────────────────────
    if (!isValidProvider(providerParam)) {
      return NextResponse.json(
        { error: `Invalid provider: ${providerParam}. Must be floristone or prodigi.` },
        { status: 400 },
      );
    }

    const provider = providerParam as ProductProvider;

    if (
      !process.env[`${provider.toUpperCase()}_API_KEY`] &&
      !process.env[`${provider.toUpperCase()}_APP_KEY`]
    ) {
      return NextResponse.json(
        { error: `Provider ${provider} is not configured` },
        { status: 503 },
      );
    }

    const service = new MarketplaceService(provider);
    const product = await service.getProductDetails(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ provider, product });
  } catch (error) {
    console.error('Marketplace product details API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return NextResponse.json(
          { error: 'Service not configured', message: error.message },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
