/**
 * Goody Commerce API - Products
 * GET /api/goody/products
 * 
 * Note: Goody Commerce API does not have a public product catalog endpoint.
 * Products must be curated through the Goody dashboard and product IDs
 * obtained via Developer Mode.
 * 
 * This endpoint returns curated product information stored in our database
 * or returns instructions on how to add products.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Goody from '@/lib/marketplace/providers/goody';

/**
 * GET /api/goody/products
 * 
 * Query parameters:
 * - category: Filter by category (food, home, wellness, tech, drink, lifestyle)
 * - search: Search term
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 50)
 * 
 * Note: Since Goody doesn't have a product listing API, this returns
 * curated products from our database or an empty list with instructions.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Goody is configured
    if (!Goody.isConfigured()) {
      return NextResponse.json(
        { 
          error: 'Goody Commerce API not configured',
          message: 'Please set GOODY_COMMERCE_API_KEY in environment variables',
          setupGuide: 'https://developer.ongoody.com/commerce-api/authentication'
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '50')));

    // Get products (from curated list or empty)
    const result = await Goody.getProducts(category, search, page, perPage);

    // Return response with additional context
    return NextResponse.json({
      provider: 'goody',
      ...result,
      note: 'Goody Commerce API requires product IDs to be obtained via Developer Mode. ' +
            'Visit your Goody dashboard → Organization → Commerce API to browse and select products.',
      categories: await Goody.getCategories(),
    });

  } catch (error) {
    console.error('Goody products API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
