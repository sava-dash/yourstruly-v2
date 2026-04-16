/**
 * Marketplace UI types (new IA, PR 2).
 *
 * Shapes mirror the PR 1 API responses:
 *  - /api/marketplace/brands
 *  - /api/marketplace/categories?tab=categories|occasions
 *  - /api/marketplace/products (new mode)
 *
 * Kept separate from `src/types/marketplace.ts` (the legacy provider-based
 * types) so the old cart/ProductCard legacy flow is untouched.
 */

export type MarketplaceScope = 'all' | 'gift_of_choice' | 'best_seller' | 'personalized' | 'postscript_credits';
export type MarketplaceView = 'brands' | 'products';
export type CategoryTab = 'categories' | 'occasions';

export interface BrandCard {
  slug: string;
  name: string;
  productCount: number;
  startingPriceCents: number;
  sampleImage: string | null;
  blurb?: string | null;
}

export interface CategoryNode {
  slug: string;
  name: string;
  icon: string | null;
  children: CategoryNode[];
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  brandSlug: string | null;
  basePriceCents: number;
  salePriceCents: number | null;
  startingPriceCents: number;
  images: string[];
  inStock: boolean;
  isCurated: boolean | null;
  curatedScore: number | null;
  occasions: string[];
  categories: string[];
  scope: string[];
  emotionalImpact: string | null;
  whyWeLoveIt: string | null;
  /** Optional, forward-looking. No seed data today — see FilterRow "Values" TODO. */
  values?: string[];
  /** Source provider — defaults to 'goody' for DB products. */
  provider?: 'goody' | 'prodigi';
  /** Prodigi product category (e.g. 'photobooks', 'canvas'). */
  prodigiCategory?: string;
}

export interface ProductsResponse {
  products: MarketplaceProduct[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface BrandsResponse {
  brands: BrandCard[];
}

export interface CategoriesResponse {
  tab: CategoryTab;
  categories: CategoryNode[];
}

export const SCOPE_PILLS: { id: MarketplaceScope; label: string; icon?: string }[] = [
  { id: 'all', label: 'All Gifts' },
  { id: 'gift_of_choice', label: 'Gift of Choice' },
  { id: 'best_seller', label: 'Best Sellers' },
  { id: 'personalized', label: 'Personalized Gifts' },
  { id: 'postscript_credits', label: 'PostScript Credits', icon: 'mail' },
];

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '';
  const dollars = Math.round(cents / 100);
  return `$${dollars}`;
}

// ---------------------------------------------------------------------------
// Prints / Prodigi integration helpers
// ---------------------------------------------------------------------------

/** The root prints slug and all child slugs that trigger Prodigi fetching. */
export const PRINTS_CATEGORY_SLUGS = new Set([
  'prints',
  'photo-prints',
  'canvas-prints',
  'wall-art',
  'posters',
  'calendars',
  'cards',
  'apparel-prints',
  'home-living-prints',
]);

/**
 * Map our marketplace child slug to the Prodigi API `category` param.
 * The root `prints` slug fetches all (no filter).
 */
export const SLUG_TO_PRODIGI_CATEGORY: Record<string, string | undefined> = {
  'prints': undefined, // all
  'photo-prints': undefined, // generic prints — no Prodigi filter
  'canvas-prints': 'canvas',
  'wall-art': 'wall-art',
  'posters': 'posters',
  'calendars': 'calendars',
  'cards': 'cards',
  'apparel-prints': 'apparel',
  'home-living-prints': 'home',
};

/**
 * Convert a legacy Prodigi `Product` (from the provider client) into a
 * `MarketplaceProduct` so ProductCard / ProductGrid can render it identically
 * to Goody products.
 */
export function prodigiProductToMarketplace(
  p: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    category?: string;
    inStock: boolean;
    brand?: string;
    providerData?: Record<string, unknown>;
  }
): MarketplaceProduct {
  const priceCents = Math.round(p.price * 100);
  return {
    id: p.id,
    name: p.name,
    description: p.description || null,
    brand: p.brand || 'Prodigi',
    brandSlug: null,
    basePriceCents: priceCents,
    salePriceCents: null,
    startingPriceCents: priceCents,
    images: p.images,
    inStock: p.inStock,
    isCurated: null,
    curatedScore: null,
    occasions: [],
    categories: p.category ? [p.category] : [],
    scope: [],
    emotionalImpact: null,
    whyWeLoveIt: null,
    provider: 'prodigi',
    prodigiCategory: p.category,
  };
}
