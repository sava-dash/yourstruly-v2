/**
 * Marketplace Types
 * Common type definitions that normalize across all providers
 */

// Product provider types
export type ProductProvider = 'floristone' | 'prodigi' | 'goody';

// Unified Product type that normalizes across all providers
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // Before markup
  comparePrice?: number; // For showing "was $X" pricing
  currency: string;
  images: string[];
  thumbnail: string;
  provider: ProductProvider;
  category?: string;
  subcategory?: string;
  
  // Availability & inventory
  inStock: boolean;
  quantity?: number;
  
  // Product details
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  
  // Provider-specific metadata
  providerData?: Record<string, unknown>;
  
  // Tags for filtering
  tags?: string[];
  
  // Shipping info
  shippingWeight?: number;
  shippingDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
}

export interface ProductAttribute {
  name: string;
  value: string | string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  sku?: string;
  attributes: Record<string, string | number | undefined>;
  inStock: boolean;
  quantity?: number;
  image?: string;
}

// Category type
export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
}

// Shipping types
export interface ShippingAddress {
  name?: string;
  address1?: string;
  address2?: string;
  line1?: string; // Alias for address1
  line2?: string; // Alias for address2
  city?: string;
  state?: string;
  stateCode?: string;
  zip?: string;
  country?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
}

export interface ShippingItem {
  productId: string;
  variantId?: string;
  quantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, string>;
}

export interface ShippingRate {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  minDays: number;
  maxDays: number;
  provider: ProductProvider;
}

export interface ShippingCalculation {
  items: ShippingItem[];
  address: ShippingAddress;
  rates: ShippingRate[];
}

// Pagination
export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

// Provider configuration
export interface ProviderConfig {
  name: ProductProvider;
  enabled: boolean;
  markupPercent: number;
}

// Cache configuration
export interface CacheConfig {
  floristone: number; // TTL in seconds
  prodigi: number;
}

// Default cache durations
export const DEFAULT_CACHE_DURATIONS: CacheConfig = {
  floristone: 60 * 60, // 1 hour
  prodigi: 4 * 60 * 60, // 4 hours
};
