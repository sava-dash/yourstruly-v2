import { NextRequest, NextResponse } from 'next/server';

// Category definitions for each provider type
const GIFT_CATEGORIES = [
  { id: 'all', name: 'All Gifts', slug: 'all', provider: 'gifts' },
  { id: 'food', name: 'Food & Treats', slug: 'food', provider: 'gifts' },
  { id: 'home', name: 'Home & Living', slug: 'home', provider: 'gifts' },
  { id: 'wellness', name: 'Wellness & Self-Care', slug: 'wellness', provider: 'gifts' },
  { id: 'tech', name: 'Tech & Gadgets', slug: 'tech', provider: 'gifts' },
  { id: 'drink', name: 'Drinks & Beverages', slug: 'drink', provider: 'gifts' },
  { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', provider: 'gifts' },
];

const FLOWER_CATEGORIES = [
  { id: 'all', name: 'All Flowers', slug: 'all', provider: 'flowers' },
  { id: 'birthday', name: 'Birthday', slug: 'birthday', provider: 'flowers' },
  { id: 'anniversary', name: 'Anniversary', slug: 'anniversary', provider: 'flowers' },
  { id: 'sympathy', name: 'Sympathy', slug: 'sympathy', provider: 'flowers' },
  { id: 'get-well', name: 'Get Well', slug: 'get-well', provider: 'flowers' },
  { id: 'love-romance', name: 'Love & Romance', slug: 'love-romance', provider: 'flowers' },
];

const PRINT_CATEGORIES = [
  { id: 'all', name: 'All Prints', slug: 'all', provider: 'prints' },
  { id: 'canvas', name: 'Canvas Prints', slug: 'canvas', provider: 'prints' },
  { id: 'wall-art', name: 'Wall Art', slug: 'wall-art', provider: 'prints' },
  { id: 'mugs', name: 'Photo Mugs', slug: 'mugs', provider: 'prints' },
  { id: 'pillows', name: 'Photo Pillows', slug: 'pillows', provider: 'prints' },
  { id: 'blankets', name: 'Photo Blankets', slug: 'blankets', provider: 'prints' },
];

/**
 * GET /api/marketplace/categories
 * Get categories from marketplace providers
 * 
 * Query parameters:
 * - provider: 'gifts' | 'flowers' | 'prints' | 'all' (optional, defaults to all)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerParam = searchParams.get('provider') || 'all';
    
    let categories: typeof GIFT_CATEGORIES = [];
    
    switch (providerParam) {
      case 'gifts':
      case 'goody':
        categories = GIFT_CATEGORIES;
        break;
      case 'flowers':
      case 'floristone':
        categories = FLOWER_CATEGORIES;
        break;
      case 'prints':
      case 'prodigi':
        categories = PRINT_CATEGORIES;
        break;
      case 'all':
      default:
        // Combine all categories with unique keys
        categories = [
          ...GIFT_CATEGORIES.map(c => ({ ...c, id: `gifts-${c.id}` })),
          ...FLOWER_CATEGORIES.map(c => ({ ...c, id: `flowers-${c.id}` })),
          ...PRINT_CATEGORIES.map(c => ({ ...c, id: `prints-${c.id}` })),
        ];
        break;
    }
    
    return NextResponse.json({
      provider: providerParam,
      categories,
    });
    
  } catch (error) {
    console.error('Marketplace categories API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
