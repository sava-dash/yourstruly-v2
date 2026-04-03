/**
 * Marketplace Mock Data
 * Sample products for development and testing
 */

import { Product, ProviderConfig, Category, GiftRecommendation } from '@/types/marketplace';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

export const providerConfigs: ProviderConfig[] = [
  {
    id: 'flowers',
    name: 'Flowers',
    description: 'Fresh bouquets & arrangements for every occasion',
    icon: 'Flower2',
    color: '#B8562E',
    categories: [
      { id: 'birthday', name: 'Birthday', slug: 'birthday', provider: 'flowers', productCount: 156 },
      { id: 'anniversary', name: 'Anniversary', slug: 'anniversary', provider: 'flowers', productCount: 89 },
      { id: 'sympathy', name: 'Sympathy', slug: 'sympathy', provider: 'flowers', productCount: 124 },
      { id: 'get-well', name: 'Get Well', slug: 'get-well', provider: 'flowers', productCount: 67 },
      { id: 'love-romance', name: 'Love & Romance', slug: 'love-romance', provider: 'flowers', productCount: 98 },
      { id: 'thank-you', name: 'Thank You', slug: 'thank-you', provider: 'flowers', productCount: 54 },
      { id: 'new-baby', name: 'New Baby', slug: 'new-baby', provider: 'flowers', productCount: 43 },
      { id: 'congratulations', name: 'Congratulations', slug: 'congratulations', provider: 'flowers', productCount: 72 },
    ]
  },
  {
    id: 'gifts',
    name: 'Gifts',
    description: 'Thoughtful gifts for everyone on your list',
    icon: 'Gift',
    color: '#2D5A3D',
    categories: [
      { id: 'sports', name: 'Sports', slug: 'sports', provider: 'gifts', productCount: 234 },
      { id: 'toys-kids', name: 'Toys & Kids', slug: 'toys-kids', provider: 'gifts', productCount: 189 },
      { id: 'pets', name: 'Pets', slug: 'pets', provider: 'gifts', productCount: 156 },
      { id: 'electronics', name: 'Electronics', slug: 'electronics', provider: 'gifts', productCount: 312 },
      { id: 'arts-crafts', name: 'Arts & Crafts', slug: 'arts-crafts', provider: 'gifts', productCount: 145 },
      { id: 'entertainment', name: 'Entertainment', slug: 'entertainment', provider: 'gifts', productCount: 98 },
      { id: 'home', name: 'Home & Living', slug: 'home', provider: 'gifts', productCount: 267 },
      { id: 'fashion', name: 'Fashion', slug: 'fashion', provider: 'gifts', productCount: 198 },
      { id: 'food', name: 'Food & Gourmet', slug: 'food', provider: 'gifts', productCount: 124 },
    ]
  },
  {
    id: 'prints',
    name: 'Prints',
    description: 'Personalized photo products & keepsakes',
    icon: 'Image',
    color: '#4A3552',
    categories: [
      { id: 'canvas', name: 'Canvas Prints', slug: 'canvas', provider: 'prints', productCount: 24 },
      { id: 'wall-art', name: 'Wall Art', slug: 'wall-art', provider: 'prints', productCount: 36 },
      { id: 'mugs', name: 'Photo Mugs', slug: 'mugs', provider: 'prints', productCount: 18 },
      { id: 'pillows', name: 'Photo Pillows', slug: 'pillows', provider: 'prints', productCount: 12 },
      { id: 'blankets', name: 'Photo Blankets', slug: 'blankets', provider: 'prints', productCount: 8 },
      { id: 'phone-cases', name: 'Phone Cases', slug: 'phone-cases', provider: 'prints', productCount: 28 },
      { id: 'calendars', name: 'Photo Calendars', slug: 'calendars', provider: 'prints', productCount: 6 },
      { id: 'cards', name: 'Greeting Cards', slug: 'cards', provider: 'prints', productCount: 42 },
    ]
  }
];

// ============================================================================
// FLOWER PRODUCTS
// ============================================================================

export const flowerProducts: Product[] = [
  {
    id: 'fl-001',
    code: 'C15D',
    name: 'Sunlit Grace Bouquet',
    description: 'Bright sunflowers and cheerful yellow roses arranged with lush greenery. Perfect for bringing sunshine to any day.',
    price: 54.99,
    originalPrice: 64.99,
    provider: 'flowers',
    category: 'birthday',
    thumbnail: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1563241527-3004b7be0ee9?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1591886960571-74d43a9e4166?w=800&h=800&fit=crop',
    ],
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.8,
    reviewCount: 127,
    isBestseller: true,
    tags: ['sunflowers', 'yellow', 'cheerful']
  },
  {
    id: 'fl-002',
    code: 'C13D',
    name: 'Classic Rose Elegance',
    description: 'A dozen premium red roses hand-tied with eucalyptus and baby\'s breath. The timeless expression of love.',
    price: 79.99,
    provider: 'flowers',
    category: 'love-romance',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&h=800&fit=crop',
    ],
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.9,
    reviewCount: 342,
    isBestseller: true,
    tags: ['roses', 'red', 'romantic']
  },
  {
    id: 'fl-003',
    code: 'S27D',
    name: 'Peaceful White Lilies',
    description: 'Pure white lilies and roses in a serene arrangement. A thoughtful gesture of sympathy and remembrance.',
    price: 89.99,
    provider: 'flowers',
    category: 'sympathy',
    thumbnail: 'https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=800&h=800&fit=crop',
    ],
    inStock: true,
    deliveryType: 'next-day',
    rating: 4.9,
    reviewCount: 89,
    tags: ['lilies', 'white', 'sympathy']
  },
  {
    id: 'fl-004',
    code: 'B12D',
    name: 'Birthday Brights',
    description: 'A vibrant mix of gerbera daisies, carnations, and alstroemeria in a rainbow of colors. Celebration in bloom!',
    price: 49.99,
    provider: 'flowers',
    category: 'birthday',
    thumbnail: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=800&h=800&fit=crop',
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.7,
    reviewCount: 203,
    isNew: true,
    tags: ['colorful', 'mixed', 'birthday']
  },
  {
    id: 'fl-005',
    code: 'A21D',
    name: 'Orchid Dreams',
    description: 'Exquisite purple orchids in a modern ceramic pot. A sophisticated gift that lasts for weeks.',
    price: 69.99,
    provider: 'flowers',
    category: 'anniversary',
    thumbnail: 'https://images.unsplash.com/photo-1566928670968-a588257d4d5d?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1566928670968-a588257d4d5d?w=800&h=800&fit=crop',
    inStock: true,
    deliveryType: 'next-day',
    rating: 4.8,
    reviewCount: 67,
    tags: ['orchids', 'purple', 'elegant']
  },
  {
    id: 'fl-006',
    code: 'G09D',
    name: 'Garden Fresh Basket',
    description: 'A charming basket filled with seasonal blooms and greenery, reminiscent of a country garden.',
    price: 59.99,
    provider: 'flowers',
    category: 'get-well',
    thumbnail: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=800&h=800&fit=crop',
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.6,
    reviewCount: 112,
    tags: ['mixed', 'basket', 'garden']
  },
  {
    id: 'fl-007',
    code: 'T05D',
    name: 'Grateful Heart',
    description: 'Warm autumn tones of orange roses, yellow chrysanthemums, and rust-colored accents.',
    price: 64.99,
    provider: 'flowers',
    category: 'thank-you',
    thumbnail: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=800&h=800&fit=crop',
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.7,
    reviewCount: 78,
    tags: ['autumn', 'orange', 'gratitude']
  },
  {
    id: 'fl-008',
    code: 'N03D',
    name: 'New Baby Boy Bouquet',
    description: 'Soft blue and white flowers celebrating the arrival of a precious baby boy.',
    price: 54.99,
    provider: 'flowers',
    category: 'new-baby',
    thumbnail: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=800&fit=crop',
    inStock: true,
    deliveryType: 'same-day',
    rating: 4.8,
    reviewCount: 45,
    tags: ['baby', 'blue', 'celebration']
  },
];

// ============================================================================
// GIFT PRODUCTS
// ============================================================================

export const giftProducts: Product[] = [
  {
    id: 'gf-001',
    code: 'SPORT-2847',
    name: 'Premium Yoga Mat & Block Set',
    description: 'Eco-friendly cork yoga mat with matching foam blocks. Perfect for the wellness enthusiast.',
    price: 69.99,
    originalPrice: 89.99,
    provider: 'gifts',
    category: 'sports',
    thumbnail: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop',
    ],
    inStock: true,
    sku: 'YM-2847-CORK',
    brand: 'ZenFit',
    weight: 2.5,
    rating: 4.7,
    reviewCount: 234,
    isBestseller: true,
    tags: ['yoga', 'wellness', 'fitness']
  },
  {
    id: 'gf-002',
    code: 'TOYS-4521',
    name: 'Wooden Building Blocks Set',
    description: '100-piece natural wooden block set in a canvas storage bag. Encourages creativity and motor skills.',
    price: 44.99,
    provider: 'gifts',
    category: 'toys-kids',
    thumbnail: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'WB-4521-100',
    brand: 'LittleCraft',
    rating: 4.9,
    reviewCount: 567,
    isBestseller: true,
    tags: ['toys', 'educational', 'wooden']
  },
  {
    id: 'gf-003',
    code: 'PET-1892',
    name: 'Cozy Pet Bed - Medium',
    description: 'Ultra-soft memory foam pet bed with removable washable cover. Fits dogs up to 50 lbs.',
    price: 59.99,
    provider: 'gifts',
    category: 'pets',
    thumbnail: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'PB-1892-GRY',
    brand: 'PetComfort',
    rating: 4.8,
    reviewCount: 892,
    tags: ['pets', 'dogs', 'comfort']
  },
  {
    id: 'gf-004',
    code: 'TECH-7734',
    name: 'Wireless Charging Station',
    description: '3-in-1 wireless charger for phone, watch, and earbuds. Sleek minimalist design.',
    price: 49.99,
    originalPrice: 69.99,
    provider: 'gifts',
    category: 'electronics',
    thumbnail: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'WC-7734-BLK',
    brand: 'ChargeBase',
    rating: 4.6,
    reviewCount: 445,
    isNew: true,
    tags: ['tech', 'charging', 'gadgets']
  },
  {
    id: 'gf-005',
    code: 'ARTS-6234',
    name: 'Deluxe Watercolor Set',
    description: '48 vibrant watercolor paints with brushes, palette, and watercolor paper pad.',
    price: 39.99,
    provider: 'gifts',
    category: 'arts-crafts',
    thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'WC-6234-48',
    brand: 'ArtFlow',
    rating: 4.8,
    reviewCount: 123,
    tags: ['art', 'painting', 'creative']
  },
  {
    id: 'gf-006',
    code: 'GAME-9912',
    name: 'Strategy Board Game Collection',
    description: 'Three classic strategy games in a beautiful wooden box set. Hours of family fun.',
    price: 54.99,
    provider: 'gifts',
    category: 'entertainment',
    thumbnail: 'https://images.unsplash.com/photo-1610890716171-6b1c9eae1f53?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1c9eae1f53?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'BG-9912-SET',
    brand: 'GameCraft',
    rating: 4.7,
    reviewCount: 89,
    tags: ['games', 'family', 'strategy']
  },
  {
    id: 'gf-007',
    code: 'HOME-4456',
    name: 'Artisan Ceramic Vase Set',
    description: 'Handcrafted ceramic vases in earthy tones. Set of 3 varying sizes.',
    price: 79.99,
    provider: 'gifts',
    category: 'home',
    thumbnail: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'CV-4456-SET3',
    brand: 'EarthCraft',
    rating: 4.9,
    reviewCount: 67,
    tags: ['home', 'decor', 'ceramic']
  },
  {
    id: 'gf-008',
    code: 'FOOD-3345',
    name: 'Gourmet Chocolate Truffle Box',
    description: '24 handcrafted chocolate truffles in assorted flavors. Elegant gift box included.',
    price: 34.99,
    provider: 'gifts',
    category: 'food',
    thumbnail: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&h=800&fit=crop',
    inStock: true,
    sku: 'CH-3345-24',
    brand: 'ChocoArt',
    rating: 4.9,
    reviewCount: 445,
    isBestseller: true,
    tags: ['chocolate', 'gourmet', 'sweet']
  },
];

// ============================================================================
// PRINT PRODUCTS
// ============================================================================

export const printProducts: Product[] = [
  {
    id: 'pr-001',
    code: 'CNV-16X20',
    name: 'Classic Canvas Print - 16x20"',
    description: 'Museum-quality canvas print with gallery wrap. Turn your memories into timeless art.',
    price: 89.99,
    originalPrice: 119.99,
    provider: 'prints',
    category: 'canvas',
    thumbnail: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1507643179173-39db4ff5df6f?w=800&h=800&fit=crop',
    ],
    inStock: true,
    customizable: true,
    variants: [
      { id: 'v1', name: '16x20"', price: 89.99, inStock: true, options: { size: '16x20' } },
      { id: 'v2', name: '20x24"', price: 119.99, inStock: true, options: { size: '20x24' } },
      { id: 'v3', name: '24x36"', price: 159.99, inStock: true, options: { size: '24x36' } },
    ],
    rating: 4.8,
    reviewCount: 234,
    isBestseller: true,
    tags: ['canvas', 'wall-art', 'custom']
  },
  {
    id: 'pr-002',
    code: 'MUG-PHOTO',
    name: 'Personalized Photo Mug',
    description: 'Ceramic mug with your photo printed in vibrant, lasting color. 11oz capacity.',
    price: 19.99,
    provider: 'prints',
    category: 'mugs',
    thumbnail: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop',
    inStock: true,
    customizable: true,
    variants: [
      { id: 'v1', name: 'White', inStock: true, options: { color: 'white' } },
      { id: 'v2', name: 'Black', inStock: true, options: { color: 'black' } },
      { id: 'v3', name: 'Pink', inStock: true, options: { color: 'pink' } },
    ],
    rating: 4.7,
    reviewCount: 567,
    isBestseller: true,
    tags: ['mug', 'photo', 'daily']
  },
  {
    id: 'pr-003',
    code: 'PILLOW-18',
    name: 'Photo Pillow - 18x18"',
    description: 'Soft velvet pillow with your photo printed on one side. Includes insert.',
    price: 34.99,
    provider: 'prints',
    category: 'pillows',
    thumbnail: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&h=800&fit=crop',
    inStock: true,
    customizable: true,
    variants: [
      { id: 'v1', name: 'Velvet', inStock: true, options: { material: 'velvet' } },
      { id: 'v2', name: 'Linen', inStock: true, options: { material: 'linen' } },
    ],
    rating: 4.6,
    reviewCount: 123,
    tags: ['pillow', 'home', 'cozy']
  },
  {
    id: 'pr-004',
    code: 'CAL-2026',
    name: '2026 Photo Calendar',
    description: '12-month wall calendar with your photos. Premium paper with spiral binding.',
    price: 24.99,
    provider: 'prints',
    category: 'calendars',
    thumbnail: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=800&fit=crop',
    inStock: true,
    customizable: true,
    rating: 4.8,
    reviewCount: 89,
    isNew: true,
    tags: ['calendar', 'yearly', 'planning']
  },
  {
    id: 'pr-005',
    code: 'FLEECE-BLNK',
    name: 'Photo Fleece Blanket',
    description: 'Ultra-soft fleece blanket featuring your favorite photo. 50x60 inches.',
    price: 49.99,
    originalPrice: 69.99,
    provider: 'prints',
    category: 'blankets',
    thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
    inStock: true,
    customizable: true,
    rating: 4.9,
    reviewCount: 156,
    tags: ['blanket', 'cozy', 'warm']
  },
  {
    id: 'pr-006',
    code: 'CARD-SET10',
    name: 'Custom Greeting Cards - Set of 10',
    description: 'Personalized greeting cards with envelopes. Your photo on the front, custom message inside.',
    price: 29.99,
    provider: 'prints',
    category: 'cards',
    thumbnail: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&h=400&fit=crop',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&h=800&fit=crop',
    inStock: true,
    customizable: true,
    variants: [
      { id: 'v1', name: 'Thank You', inStock: true, options: { occasion: 'thank-you' } },
      { id: 'v2', name: 'Birthday', inStock: true, options: { occasion: 'birthday' } },
      { id: 'v3', name: 'Holiday', inStock: true, options: { occasion: 'holiday' } },
    ],
    rating: 4.7,
    reviewCount: 78,
    tags: ['cards', 'stationery', 'personal']
  },
];

// ============================================================================
// COMBINED PRODUCT LIST
// ============================================================================

export const allProducts: Product[] = [
  ...flowerProducts,
  ...giftProducts,
  ...printProducts,
];

// ============================================================================
// GIFT RECOMMENDATIONS BY OCCASION
// ============================================================================

export const giftRecommendations: Record<string, GiftRecommendation[]> = {
  birthday: [
    { product: flowerProducts[3], reason: 'Bright and celebratory', matchScore: 98 },
    { product: printProducts[1], reason: 'Personal daily reminder', matchScore: 92 },
    { product: giftProducts[1], reason: 'Fun for all ages', matchScore: 87 },
  ],
  anniversary: [
    { product: flowerProducts[1], reason: 'Classic symbol of love', matchScore: 99 },
    { product: printProducts[0], reason: 'Preserve shared memories', matchScore: 95 },
    { product: giftProducts[6], reason: 'Timeless home accent', matchScore: 88 },
  ],
  sympathy: [
    { product: flowerProducts[2], reason: 'Elegant and comforting', matchScore: 99 },
    { product: printProducts[0], reason: 'Memorial keepsake', matchScore: 94 },
    { product: giftProducts[2], reason: 'Thoughtful comfort gift', matchScore: 82 },
  ],
  'new-baby': [
    { product: flowerProducts[7], reason: 'Celebrate new life', matchScore: 96 },
    { product: printProducts[3], reason: 'Capture first year', matchScore: 93 },
    { product: giftProducts[1], reason: 'Safe, natural toy', matchScore: 89 },
  ],
};

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

export function getProductsByProvider(provider: string): Product[] {
  return allProducts.filter(p => p.provider === provider);
}

export function getProductsByCategory(category: string): Product[] {
  return allProducts.filter(p => p.category === category);
}

export function getProductById(id: string): Product | undefined {
  return allProducts.find(p => p.id === id);
}

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return allProducts.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function filterProducts(
  provider?: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number
): Product[] {
  return allProducts.filter(p => {
    if (provider && p.provider !== provider) return false;
    if (category && p.category !== category) return false;
    if (minPrice && p.price < minPrice) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });
}
