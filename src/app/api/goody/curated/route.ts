/**
 * Goody Curated Products API
 * GET /api/goody/curated
 * 
 * Returns curated products from the marketplace_products database table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Category definitions
const CATEGORIES = [
  { id: 'all', name: 'All Gifts' },
  { id: 'food', name: 'Food & Treats' },
  { id: 'home', name: 'Home & Living' },
  { id: 'wellness', name: 'Wellness & Self-Care' },
  { id: 'electronics', name: 'Tech & Gadgets' },
];

// Occasion definitions
const OCCASIONS = [
  { id: 'birthday', name: 'Birthday', icon: '🎂' },
  { id: 'anniversary', name: 'Anniversary', icon: '💕' },
  { id: 'thank-you', name: 'Thank You', icon: '🙏' },
  { id: 'get-well', name: 'Get Well', icon: '💐' },
  { id: 'sympathy', name: 'Sympathy', icon: '🕊️' },
  { id: 'mothers-day', name: "Mother's Day", icon: '💐' },
  { id: 'fathers-day', name: "Father's Day", icon: '👔' },
  { id: 'valentines-day', name: "Valentine's Day", icon: '❤️' },
  { id: 'graduation', name: 'Graduation', icon: '🎓' },
  { id: 'new-job', name: 'New Job', icon: '💼' },
  { id: 'housewarming', name: 'Housewarming', icon: '🏠' },
  { id: 'thinking-of-you', name: 'Thinking of You', icon: '💭' },
];

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
    const supabase = await createClient();
    
    // Check if a specific product is requested
    const productId = searchParams.get('productId');
    if (productId) {
      const { data: product, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single();
      
      if (error || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        product: normalizeProduct(product) 
      });
    }
    
    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const occasion = searchParams.get('occasion') || undefined;
    const priceRange = searchParams.get('priceRange') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeCategories = searchParams.get('includeCategories') === 'true';
    
    // Build query
    let query = supabase
      .from('marketplace_products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    
    // Filter by search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Filter by occasion (stored in occasions array)
    if (occasion) {
      query = query.contains('occasions', [occasion.toLowerCase()]);
    }
    
    // Filter by category - check if it's in occasions array (our categories map to occasions)
    if (category && category !== 'all') {
      query = query.contains('occasions', [category.toLowerCase()]);
    }
    
    // Filter by price range
    if (priceRange) {
      const priceFilters: Record<string, { min: number; max: number }> = {
        'under50': { min: 0, max: 5000 },       // cents
        '50to100': { min: 5000, max: 10000 },
        '100to200': { min: 10000, max: 20000 },
        'over200': { min: 20000, max: 1000000 },
      };
      const range = priceFilters[priceRange];
      if (range) {
        query = query.gte('base_price_cents', range.min).lt('base_price_cents', range.max);
      }
    }
    
    // Order by curated score descending
    query = query.order('curated_score', { ascending: false, nullsFirst: false });
    
    // Apply limit
    query = query.limit(limit);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
    
    // Normalize products to expected format
    const products = (data || []).map(normalizeProduct);
    
    // Get category counts if requested
    let categoriesWithCounts = CATEGORIES;
    if (includeCategories) {
      // Get all products to count by category
      const { data: allProducts } = await supabase
        .from('marketplace_products')
        .select('occasions')
        .eq('is_active', true);
      
      const total = allProducts?.length || 0;
      categoriesWithCounts = CATEGORIES.map(cat => ({
        ...cat,
        count: cat.id === 'all' 
          ? total 
          : (allProducts?.filter(p => p.occasions?.includes(cat.id))?.length || 0),
      }));
    }
    
    // Build response
    const response: {
      products: ReturnType<typeof normalizeProduct>[];
      total: number;
      filters: {
        category?: string;
        occasion?: string;
        priceRange?: string;
        search?: string;
      };
      categories?: typeof categoriesWithCounts;
      occasions?: typeof OCCASIONS;
    } = {
      products,
      total: count || products.length,
      filters: {
        category,
        occasion,
        priceRange,
        search,
      },
    };
    
    // Include categories if requested
    if (includeCategories) {
      response.categories = categoriesWithCounts;
      response.occasions = OCCASIONS;
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

/**
 * Normalize database product to the format expected by GiftSelectionModal
 */
function normalizeProduct(row: {
  id: string;
  external_id: string | null;
  name: string;
  description: string | null;
  provider: string | null;
  category_id: string | null;
  base_price_cents: number;
  sale_price_cents: number | null;
  currency?: string;
  images: string[] | null;
  in_stock: boolean;
  is_curated: boolean;
  curated_score: number | null;
  occasions: string[] | null;
  emotional_impact: string | null;
  why_we_love_it: string | null;
  is_active: boolean;
  created_at: string;
}) {
  const price = row.sale_price_cents 
    ? row.sale_price_cents / 100 
    : row.base_price_cents / 100;
  
  const originalPrice = row.sale_price_cents 
    ? row.base_price_cents / 100 
    : undefined;
  
  // Determine price range
  let priceRange: 'under50' | '50to100' | '100to200' | 'over200' = 'under50';
  if (price >= 200) priceRange = 'over200';
  else if (price >= 100) priceRange = '100to200';
  else if (price >= 50) priceRange = '50to100';
  
  return {
    id: row.id,
    goodyProductId: row.external_id || row.id,
    code: `GOODY-${row.id.slice(0, 8).toUpperCase()}`,
    name: row.name,
    description: row.description || '',
    price,
    originalPrice,
    currency: row.currency || 'USD',
    provider: (row.provider || 'goody') as 'goody' | 'floristone' | 'doba' | 'printful',
    category: row.occasions?.[0] || 'gifts',
    brandName: row.provider || 'Curated Gift',
    priceRange,
    occasions: row.occasions || [],
    inStock: row.in_stock,
    thumbnail: row.images?.[0] || '',
    image: row.images?.[0] || '',
    images: row.images || [],
    allowShipping: true,
    allowGifting: true,
    tags: row.occasions || [],
    isNew: false,
    isBestseller: (row.curated_score || 0) >= 90,
    emotionalImpact: row.emotional_impact,
    whyWeLoveIt: row.why_we_love_it,
    curatedScore: row.curated_score,
  };
}
