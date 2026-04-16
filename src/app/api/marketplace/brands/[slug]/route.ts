import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/marketplace/brands/[slug]
 *
 * Returns brand detail from marketplace_brands table (synced from Goody API).
 * Includes logo URL, shipping info, brand values.
 *
 * Response: { brand: BrandDetail | null }
 */

interface BrandDetail {
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  shippingPriceCents: number | null;
  freeShippingMinCents: number | null;
  brandValues: string[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ brand: null }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('marketplace_brands')
      .select('slug, name, logo_url, description, shipping_price_cents, free_shipping_min_cents, brand_values')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      // Gracefully handle missing table (migration not yet run)
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ brand: null }, { status: 404 });
      }
      console.error('GET /api/marketplace/brands/[slug] error:', error);
      return NextResponse.json({ brand: null }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ brand: null }, { status: 404 });
    }

    const brand: BrandDetail = {
      slug: data.slug,
      name: data.name,
      logoUrl: data.logo_url,
      description: data.description,
      shippingPriceCents: data.shipping_price_cents,
      freeShippingMinCents: data.free_shipping_min_cents,
      brandValues: data.brand_values || [],
    };

    return NextResponse.json(
      { brand },
      {
        headers: {
          'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/marketplace/brands/[slug] failed:', err);
    return NextResponse.json({ error: 'Failed to load brand' }, { status: 500 });
  }
}
