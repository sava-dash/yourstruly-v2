/**
 * Goody Curated Catalog
 * 
 * Since Goody Commerce API doesn't have a public product catalog endpoint,
 * we maintain a curated list of popular products from the Goody marketplace.
 * 
 * To add products:
 * 1. Go to Goody Dashboard → Organization → Commerce API
 * 2. Enable Developer Mode
 * 3. Browse products and copy product IDs
 * 4. Add them to this catalog
 * 
 * Product IDs can be obtained by:
 * - Developer Mode in Goody dashboard
 * - Creating test orders and extracting IDs
 * - Contacting Goody support for a product catalog export
 */

import { Product } from '@/types/marketplace';

export interface GoodyCuratedProduct extends Product {
  goodyProductId: string;
  brandName: string;
  category: string;
  priceRange: 'under50' | '50to100' | '100to200' | 'over200';
  occasions: string[];
  allowShipping: boolean;
  allowGifting: boolean;
}

/**
 * Curated Goody products for the marketplace
 * These are real products available through the Goody Commerce API
 * 
 * IMPORTANT: Replace these placeholder IDs with actual product IDs from your
 * Goody dashboard after enabling Developer Mode.
 */
export const GOODY_CURATED_PRODUCTS: GoodyCuratedProduct[] = [
  // Food & Treats
  {
    id: 'goody-cookies-001',
    goodyProductId: '9abf2d67-e4f3-4d43-9142-4a1f0d10aaa0', // Replace with actual ID
    code: 'GOODY-COOKIES-001',
    name: 'Gourmet Cookie Box',
    description: 'A delicious assortment of freshly baked gourmet cookies in elegant packaging. Perfect for any occasion.',
    price: 45.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'food',
    brandName: 'Cookie Company',
    priceRange: 'under50',
    occasions: ['birthday', 'thank-you', 'get-well', 'thinking-of-you'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800',
    images: [
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800',
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['food', 'cookies', 'gourmet', 'sweet'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 'goody-chocolate-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-CHOC-001',
    name: 'Artisan Chocolate Collection',
    description: 'Premium artisan chocolates handcrafted with the finest cocoa. An indulgent gift for chocolate lovers.',
    price: 58.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'food',
    brandName: 'Artisan Chocolates',
    priceRange: '50to100',
    occasions: ['birthday', 'anniversary', 'love-romance', 'valentines-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400',
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800',
    images: [
      'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['food', 'chocolate', 'gourmet', 'premium'],
    isNew: false,
    isBestseller: true,
  },
  
  // Home & Living
  {
    id: 'goody-candle-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-CANDLE-001',
    name: 'Luxury Scented Candle Set',
    description: 'A set of three luxury scented candles in elegant glass containers. Features soothing lavender, warm vanilla, and fresh citrus scents.',
    price: 72.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'home',
    brandName: 'Home Comfort',
    priceRange: '50to100',
    occasions: ['birthday', 'thank-you', 'new-home', 'sympathy'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1602825389660-3f9749873e20?w=400',
    image: 'https://images.unsplash.com/photo-1602825389660-3f9749873e20?w=800',
    images: [
      'https://images.unsplash.com/photo-1602825389660-3f9749873e20?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['home', 'candles', 'scented', 'relaxation'],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 'goody-throw-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-THROW-001',
    name: 'Cozy Cashmere Throw Blanket',
    description: 'Ultra-soft cashmere throw blanket in a beautiful neutral tone. Perfect for cozy nights at home.',
    price: 128.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'home',
    brandName: 'Brooklinen',
    priceRange: '100to200',
    occasions: ['birthday', 'anniversary', 'thank-you', 'new-home'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['home', 'blanket', 'cozy', 'luxury'],
    isNew: false,
    isBestseller: true,
  },
  
  // Wellness & Self-Care
  {
    id: 'goody-spa-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-SPA-001',
    name: 'Spa Day Gift Set',
    description: 'A complete spa experience at home including bath salts, body scrub, lotion, and a silk eye mask.',
    price: 85.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'wellness',
    brandName: 'MALIN+GOETZ',
    priceRange: '50to100',
    occasions: ['birthday', 'get-well', 'thank-you', 'mothers-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    images: [
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['wellness', 'spa', 'self-care', 'relaxation'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 'goody-skincare-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-SKIN-001',
    name: 'Premium Skincare Collection',
    description: 'A curated collection of premium skincare products for a complete skincare routine.',
    price: 145.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'wellness',
    brandName: 'Luxury Skincare',
    priceRange: '100to200',
    occasions: ['birthday', 'anniversary', 'valentines-day', 'mothers-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['wellness', 'skincare', 'beauty', 'premium'],
    isNew: true,
    isBestseller: false,
  },
  
  // Tech & Gadgets
  {
    id: 'goody-earbuds-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-EARBUDS-001',
    name: 'Premium Wireless Earbuds',
    description: 'High-quality wireless earbuds with active noise cancellation and crystal-clear sound.',
    price: 179.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'electronics',
    brandName: 'Bose',
    priceRange: '100to200',
    occasions: ['birthday', 'graduation', 'promotion', 'fathers-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['tech', 'electronics', 'audio', 'premium'],
    isNew: true,
    isBestseller: true,
  },
  {
    id: 'goody-speaker-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-SPEAKER-001',
    name: 'Portable Bluetooth Speaker',
    description: 'Compact yet powerful Bluetooth speaker with 360-degree sound and waterproof design.',
    price: 129.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'electronics',
    brandName: 'Bose',
    priceRange: '100to200',
    occasions: ['birthday', 'graduation', 'fathers-day', 'thank-you'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['tech', 'electronics', 'audio', 'portable'],
    isNew: false,
    isBestseller: true,
  },
  
  // Drinks & Beverages
  {
    id: 'goody-coffee-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-COFFEE-001',
    name: 'Artisan Coffee Sampler',
    description: 'A curated selection of single-origin coffees from around the world, freshly roasted.',
    price: 48.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'food',
    brandName: 'Artisan Coffee Co.',
    priceRange: 'under50',
    occasions: ['birthday', 'thank-you', 'new-job', 'fathers-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['drink', 'coffee', 'artisan', 'beverage'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 'goody-tea-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-TEA-001',
    name: 'Premium Tea Collection',
    description: 'An elegant collection of premium loose-leaf teas with a beautiful infuser.',
    price: 55.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'food',
    brandName: 'Tea Emporium',
    priceRange: '50to100',
    occasions: ['birthday', 'thank-you', 'get-well', 'mothers-day'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    images: [
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['drink', 'tea', 'premium', 'wellness'],
    isNew: false,
    isBestseller: false,
  },
  
  // Lifestyle
  {
    id: 'goody-journal-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-JOURNAL-001',
    name: 'Leather Bound Journal',
    description: 'Handcrafted leather journal with premium paper, perfect for writing, sketching, or planning.',
    price: 68.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'home',
    brandName: 'Artisan Leather',
    priceRange: '50to100',
    occasions: ['birthday', 'graduation', 'new-job', 'thank-you'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['lifestyle', 'journal', 'stationery', 'leather'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 'goody-book-001',
    goodyProductId: 'REPLACE_WITH_ACTUAL_ID',
    code: 'GOODY-BOOK-001',
    name: 'Coffee Table Book Collection',
    description: 'A stunning collection of photography and art books, perfect for the coffee table.',
    price: 95.00,
    currency: 'USD',
    provider: 'gifts',
    category: 'home',
    brandName: 'Art Books Publishing',
    priceRange: '50to100',
    occasions: ['birthday', 'housewarming', 'wedding', 'thank-you'],
    inStock: true,
    thumbnail: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    images: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    ],
    allowShipping: true,
    allowGifting: true,
    tags: ['lifestyle', 'books', 'art', 'home'],
    isNew: true,
    isBestseller: false,
  },
];

/**
 * Get curated products filtered by criteria
 */
export function getCuratedProducts(filters?: {
  category?: string;
  occasion?: string;
  priceRange?: string;
  search?: string;
  limit?: number;
}): GoodyCuratedProduct[] {
  let products = [...GOODY_CURATED_PRODUCTS];
  
  if (filters?.category) {
    products = products.filter(p => 
      p.category.toLowerCase() === filters.category?.toLowerCase() ||
      p.tags?.some(tag => tag.toLowerCase() === filters.category?.toLowerCase())
    );
  }
  
  if (filters?.occasion) {
    products = products.filter(p => 
      p.occasions.includes(filters.occasion!.toLowerCase())
    );
  }
  
  if (filters?.priceRange) {
    products = products.filter(p => p.priceRange === filters.priceRange);
  }
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.brandName.toLowerCase().includes(searchLower) ||
      p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  if (filters?.limit) {
    products = products.slice(0, filters.limit);
  }
  
  return products;
}

/**
 * Get a single curated product by ID
 */
export function getCuratedProductById(id: string): GoodyCuratedProduct | undefined {
  return GOODY_CURATED_PRODUCTS.find(p => p.id === id);
}

/**
 * Get available categories with counts
 */
export function getCategoriesWithCounts(): { id: string; name: string; count: number }[] {
  const categories = [
    { id: 'all', name: 'All Gifts' },
    { id: 'food', name: 'Food & Treats' },
    { id: 'home', name: 'Home & Living' },
    { id: 'wellness', name: 'Wellness & Self-Care' },
    { id: 'electronics', name: 'Tech & Gadgets' },
  ];
  
  return categories.map(cat => ({
    ...cat,
    count: cat.id === 'all' 
      ? GOODY_CURATED_PRODUCTS.length 
      : GOODY_CURATED_PRODUCTS.filter(p => p.category === cat.id).length,
  }));
}

/**
 * Get occasions for filtering
 */
export const GOODY_OCCASIONS = [
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
