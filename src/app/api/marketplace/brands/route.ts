import { NextRequest, NextResponse } from 'next/server';
import { getBrands } from '@/lib/marketplace/providers/goody';

/**
 * GET /api/marketplace/brands
 *
 * Returns aggregated brand cards for the marketplace landing page.
 *
 * Query parameters:
 *  - scope    Optional. One of 'best_seller' | 'gift_of_choice' | 'personalized' | 'all'.
 *             Filters the underlying products set before aggregating.
 *  - category Optional. A category slug (e.g. 'tech', 'home'). Matches against
 *             products whose categories[] contains this slug.
 *
 * Response: { brands: BrandCard[] } where BrandCard =
 *   { slug, name, productCount, startingPriceCents, sampleImage, blurb? }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scope = searchParams.get('scope') || undefined;
    const category = searchParams.get('category') || undefined;

    const brands = await getBrands({ scope, category });

    return NextResponse.json(
      { brands },
      {
        headers: {
          // 10-minute public cache
          'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/marketplace/brands failed:', err);
    return NextResponse.json({ error: 'Failed to load brands' }, { status: 500 });
  }
}
