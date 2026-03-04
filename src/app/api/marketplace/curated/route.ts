import { NextRequest, NextResponse } from 'next/server';
import { CURATED_CATALOG, CURATED_CATEGORIES, getProductsByCollection, getProductsByCategory, getProductsByOccasion, getStaffPicks, type CuratedProduct } from '@/lib/marketplace/curated-catalog';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/marketplace/curated
 * Get curated products from our hand-picked catalog PLUS database products
 * 
 * Query parameters:
 * - productId: Specific product ID to fetch
 * - provider: 'floristone' | 'prodigi' | 'goody' | 'gifts' | 'all' (default: all)
 * - category: Category slug (e.g., 'flowers-occasions')
 * - collection: 'staff-picks' | 'perfect-for-memories' | 'heirloom-quality' | 'thoughtful-gestures'
 * - occasion: Occasion tag (e.g., 'sympathy', 'birthday', 'anniversary')
 * - search: Search term (searches name, description, tags)
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const provider = searchParams.get('provider') || 'all';
    const category = searchParams.get('category');
    const collection = searchParams.get('collection') as CuratedProduct['collections'][number] | null;
    const occasion = searchParams.get('occasion');
    const search = searchParams.get('search')?.toLowerCase();
    
    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '50')));
    
    // Check for single product lookup
    const productId = searchParams.get('productId');
    if (productId) {
      // Try static catalog first
      const staticProduct = CURATED_CATALOG.find(p => p.id === productId);
      if (staticProduct) {
        return NextResponse.json({
          products: [staticProduct],
          total: 1,
          page: 1,
          perPage: 1,
          categories: CURATED_CATEGORIES,
        });
      }
      
      // Try database
      try {
        const supabase = await createClient();
        const { data: dbProduct } = await supabase
          .from('marketplace_products')
          .select('*')
          .eq('id', productId)
          .eq('is_active', true)
          .single();
        
        if (dbProduct) {
          return NextResponse.json({
            products: [normalizeDbProduct(dbProduct)],
            total: 1,
            page: 1,
            perPage: 1,
            categories: CURATED_CATEGORIES,
          });
        }
      } catch (e) {
        // Database lookup failed, continue
      }
      
      return NextResponse.json({ products: [], total: 0, page: 1, perPage: 1 });
    }
    
    // Fetch database products (Goody marketplace products)
    let dbProducts: CuratedProduct[] = [];
    try {
      // Only fetch from DB if we want goody/gifts provider or all
      if (provider === 'all' || provider === 'goody' || provider === 'gifts') {
        const supabase = await createClient();
        let query = supabase
          .from('marketplace_products')
          .select('*')
          .eq('is_active', true);
        
        // Filter by search in DB
        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        // Filter by occasion in DB
        if (occasion) {
          query = query.contains('occasions', [occasion.toLowerCase()]);
        }
        
        query = query.order('curated_score', { ascending: false, nullsFirst: false });
        
        const { data } = await query;
        dbProducts = (data || []).map(normalizeDbProduct);
      }
    } catch (e) {
      console.error('Error fetching database products:', e);
      // Continue with static catalog only
    }
    
    // Start with static catalog
    let staticProducts: CuratedProduct[] = [...CURATED_CATALOG];
    
    // Filter static catalog by provider
    if (provider !== 'all' && provider !== 'goody' && provider !== 'gifts') {
      staticProducts = staticProducts.filter(p => p.provider === provider);
    } else if (provider === 'goody' || provider === 'gifts') {
      // For goody/gifts provider, only use database products
      staticProducts = [];
    }
    
    // Filter by category
    if (category) {
      staticProducts = staticProducts.filter(p => p.category === category);
      // DB products use occasions as categories
      dbProducts = dbProducts.filter(p => p.category === category || p.occasions.includes(category));
    }
    
    // Filter by collection (static catalog only)
    if (collection) {
      staticProducts = getProductsByCollection(collection);
      if (provider !== 'all') {
        staticProducts = staticProducts.filter(p => p.provider === provider);
      }
    }
    
    // Filter by occasion
    if (occasion) {
      staticProducts = staticProducts.filter(p => p.occasions.includes(occasion));
      // dbProducts already filtered above
    }
    
    // Search filter for static products
    if (search) {
      staticProducts = staticProducts.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.occasions.some(o => o.includes(search)) ||
        p.whyWeLoveIt.toLowerCase().includes(search)
      );
      // dbProducts already filtered above
    }
    
    // Combine static and database products
    const allProducts = [...staticProducts, ...dbProducts];
    
    // Sort by curated score (highest first)
    allProducts.sort((a, b) => (b.curatedScore || 0) - (a.curatedScore || 0));
    
    // Remove duplicates by ID
    const uniqueProducts = allProducts.filter((p, idx, arr) => 
      arr.findIndex(x => x.id === p.id) === idx
    );
    
    // Calculate pagination
    const total = uniqueProducts.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedProducts = uniqueProducts.slice(start, end);
    
    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      perPage,
      hasMore: end < total,
      categories: CURATED_CATEGORIES,
    });
    
  } catch (error) {
    console.error('Curated products API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize database product row to CuratedProduct format
 */
function normalizeDbProduct(row: {
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
}): CuratedProduct {
  const price = row.sale_price_cents 
    ? row.sale_price_cents / 100 
    : row.base_price_cents / 100;
  
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price,
    currency: row.currency || 'USD',
    images: row.images || [],
    thumbnail: row.images?.[0] || '',
    provider: 'goody', // DB products are Goody marketplace products
    category: row.occasions?.[0] || 'gifts',
    inStock: row.in_stock,
    curatedScore: row.curated_score || 80,
    collections: [], // DB products don't have collections
    whyWeLoveIt: row.why_we_love_it || '',
    occasions: row.occasions || [],
    emotionalImpact: (row.emotional_impact as 'high' | 'medium' | 'low') || 'medium',
    brand: row.provider || undefined,
    providerData: {
      goodyId: row.external_id,
      emotionalImpact: row.emotional_impact,
      curatedScore: row.curated_score,
    },
  };
}
