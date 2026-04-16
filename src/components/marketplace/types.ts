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

export type MarketplaceScope = 'all' | 'gift_of_choice' | 'best_seller' | 'personalized';
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

export const SCOPE_PILLS: { id: MarketplaceScope; label: string }[] = [
  { id: 'all', label: 'All Gifts' },
  { id: 'gift_of_choice', label: 'Gift of Choice' },
  { id: 'best_seller', label: 'Best Sellers' },
  { id: 'personalized', label: 'Personalized Gifts' },
];

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '';
  const dollars = Math.round(cents / 100);
  return `$${dollars}`;
}
