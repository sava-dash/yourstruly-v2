/**
 * Goody Curated Products API
 * GET /api/goody/curated
 * 
 * Returns curated products from the Goody marketplace catalog.
 * Since Goody Commerce API doesn't have a product browsing endpoint,
 * we maintain a curated list of popular products.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCuratedProducts,
  getCategoriesWithCounts,
  getCuratedProductById,
  GOODY_OCCASIONS,
} from '@/lib/marketplace/providers/goody-catalog';

/**
 * GET /api/goody/curated
 * 
 * Query parameters:
 * - category: Filter by category (food, home, wellness, electronics, etc.)
 * - occasion: Filter by occasion (birthday, anniversary, thank-you, etc.)
 * - priceRange: Filter by price range (under50, 50to100, 100to200, over200)
 * - search: Search term for product name/description
 * - productId: Get specific product by ID
 * - limit: Maximum number of products to return (default: 50)
 * - includeCategories: If true, includes category list in response
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Check if a specific product is requested
    const productId = searchParams.get('productId');
    if (productId) {
      const product = getCuratedProductById(productId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ product });
    }
    
    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const occasion = searchParams.get('occasion') || undefined;
    const priceRange = searchParams.get('priceRange') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeCategories = searchParams.get('includeCategories') === 'true';
    
    // Get filtered products
    const products = getCuratedProducts({
      category,
      occasion,
      priceRange,
      search,
      limit,
    });
    
    // Build response
    const response: {
      products: ReturnType<typeof getCuratedProducts>;
      total: number;
      filters: {
        category?: string;
        occasion?: string;
        priceRange?: string;
        search?: string;
      };
      categories?: ReturnType<typeof getCategoriesWithCounts>;
      occasions?: typeof GOODY_OCCASIONS;
    } = {
      products,
      total: products.length,
      filters: {
        category,
        occasion,
        priceRange,
        search,
      },
    };
    
    // Include categories if requested
    if (includeCategories) {
      response.categories = getCategoriesWithCounts();
      response.occasions = GOODY_OCCASIONS;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Goody curated products API error:', error);
    
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
