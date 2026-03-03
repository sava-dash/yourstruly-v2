/**
 * Marketplace Service - Unified Interface
 * Provides a single interface for all marketplace providers
 */

import type {
  Product,
  Category,
  PaginatedProducts,
  ShippingRate,
  ShippingAddress,
  ShippingItem,
  ProductProvider,
  ProviderConfig,
} from './types';
import * as Floristone from './providers/floristone';
import * as Prodigi from './providers/prodigi';
import * as Goody from './providers/goody';
import { getMarketplaceCache, setMarketplaceCache } from './cache';

// Re-export types
export * from './types';
export { Floristone, Prodigi, Goody };

// Provider configurations
const PROVIDER_CONFIGS: Record<ProductProvider, ProviderConfig> = {
  floristone: {
    name: 'floristone',
    enabled: Floristone.isConfigured(),
    markupPercent: 0, // No markup for Floristone
  },
  prodigi: {
    name: 'prodigi',
    enabled: Prodigi.isConfigured(),
    markupPercent: 0, // Prodigi pricing is already wholesale
  },
  goody: {
    name: 'goody',
    enabled: Goody.isConfigured(),
    markupPercent: 0, // Revenue share handled by Goody
  },
};

/**
 * MarketplaceService class - unified interface for all providers
 */
export class MarketplaceService {
  private provider: ProductProvider;
  
  constructor(provider: ProductProvider) {
    this.provider = provider;
    
    if (!this.isProviderEnabled()) {
      throw new Error(`Provider ${provider} is not configured or enabled`);
    }
  }
  
  /**
   * Check if the selected provider is enabled
   */
  isProviderEnabled(): boolean {
    return PROVIDER_CONFIGS[this.provider].enabled;
  }
  
  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return PROVIDER_CONFIGS[this.provider];
  }
  
  /**
   * Get products from the selected provider
   */
  async getProducts(
    category?: string,
    search?: string,
    tagId?: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<PaginatedProducts> {
    switch (this.provider) {
      case 'floristone':
        return Floristone.getProducts(category, search, page, perPage);

      case 'prodigi':
        // Prodigi supports category filtering
        return Prodigi.getProducts(category, page, perPage);

      case 'goody':
        // Goody Commerce API doesn't have product browsing - products are curated
        return Goody.getProducts(category, search, page, perPage);

      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
  
  /**
   * Get product details by ID
   */
  async getProductDetails(productId: string): Promise<Product | null> {
    switch (this.provider) {
      case 'floristone':
        return Floristone.getProductDetails(productId);

      case 'prodigi':
        return Prodigi.getProductDetails(productId);

      case 'goody':
        // Goody doesn't have a product details endpoint in Commerce API
        return Goody.getProductDetails(productId);

      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
  
  /**
   * Get categories from the selected provider
   */
  async getCategories(): Promise<Category[]> {
    switch (this.provider) {
      case 'floristone':
        // Floristone doesn't have a categories endpoint, return predefined
        return [
          { id: 'bs', name: 'Best Sellers' },
          { id: 'bd', name: 'Birthday' },
          { id: 'an', name: 'Anniversary' },
          { id: 'lr', name: 'Love & Romance' },
          { id: 'gw', name: 'Get Well' },
          { id: 'nb', name: 'New Baby' },
          { id: 'ty', name: 'Thank You' },
          { id: 'sy', name: 'Sympathy' },
        ];

      case 'prodigi':
        return Prodigi.getCategories();

      case 'goody':
        return Goody.getCategories();

      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
  
  /**
   * Calculate shipping rates
   */
  async calculateShipping(
    items: ShippingItem[],
    address: ShippingAddress
  ): Promise<ShippingRate[]> {
    switch (this.provider) {
      case 'floristone':
        return Floristone.calculateShipping(items, address);
      
      case 'prodigi':
        // Prodigi estimateOrder includes shipping rates
        const prodigiEstimate = await Prodigi.estimateOrder(items, address);
        return prodigiEstimate.rates;
      
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
  
  /**
   * Get templates for mockup generation (Prodigi only - for content layers)
   */
  async getContentLayers(productId: string): Promise<{
    name: string;
    fileName: string;
    pages: number;
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    };
  }[] | null> {
    if (this.provider !== 'prodigi') {
      return null;
    }
    
    const product = await Prodigi.getProductDetails(productId);
    const layers = product?.providerData?.contentLayers;
    return Array.isArray(layers) ? layers : null;
  }
  
  /**
   * Validate assets for fulfillment (Prodigi only)
   */
  async validateAssets(
    productId: string,
    variantId: string,
    assets: { printArea: string; url: string }[]
  ): Promise<{ valid: boolean; errors?: { printArea: string; error: string }[] } | null> {
    if (this.provider !== 'prodigi') {
      return null;
    }
    
    return Prodigi.validateAssets(productId, variantId, assets);
  }
  
  /**
   * Estimate full order costs including shipping and tax
   */
  async estimateOrder(
    items: ShippingItem[],
    address: ShippingAddress
  ): Promise<{
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
    rates: ShippingRate[];
  }> {
    switch (this.provider) {
      case 'prodigi':
        return Prodigi.estimateOrder(items, address);
      
      case 'floristone':
        // Floristone handles pricing differently
        const floristoneRates = await Floristone.calculateShipping(items, address);
        const floristoneShipping = floristoneRates.length > 0 
          ? Math.min(...floristoneRates.map(r => r.price))
          : 0;
        
        return {
          subtotal: 0, // Would need to fetch product prices
          shipping: floristoneShipping,
          tax: 0,
          total: floristoneShipping,
          currency: 'USD',
          rates: floristoneRates,
        };
      
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }
}

/**
 * Get all enabled providers
 */
export function getEnabledProviders(): ProductProvider[] {
  return (Object.keys(PROVIDER_CONFIGS) as ProductProvider[]).filter(
    provider => PROVIDER_CONFIGS[provider].enabled
  );
}

/**
 * Get provider configurations
 */
export function getProviderConfigs(): Record<ProductProvider, ProviderConfig> {
  return PROVIDER_CONFIGS;
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(provider: ProductProvider): boolean {
  switch (provider) {
    case 'floristone':
      return Floristone.isConfigured();
    case 'prodigi':
      return Prodigi.isConfigured();
    case 'goody':
      return Goody.isConfigured();
    default:
      return false;
  }
}

/**
 * Search products across all enabled providers
 */
export async function searchAllProviders(
  query: string,
  options: {
    floristone?: { category?: string };
    prodigi?: { categoryId?: string };
  } = {}
): Promise<{ provider: ProductProvider; products: Product[] }[]> {
  const enabledProviders = getEnabledProviders();
  const results: { provider: ProductProvider; products: Product[] }[] = [];
  
  const searchPromises = enabledProviders.map(async (provider) => {
    try {
      const service = new MarketplaceService(provider);
      
      let result: PaginatedProducts;
      
      switch (provider) {
        case 'floristone':
          result = await service.getProducts(
            options.floristone?.category,
            query,
            undefined,
            1,
            20
          );
          break;
        
        case 'prodigi':
          // Prodigi doesn't have native search, use category
          result = await service.getProducts(
            options.prodigi?.categoryId,
            undefined,
            undefined,
            1,
            20
          );
          break;
      }
      
      return { provider, products: result.products };
    } catch (error) {
      console.error(`Error searching ${provider}:`, error);
      return { provider, products: [] };
    }
  });
  
  const searchResults = await Promise.all(searchPromises);
  return searchResults.filter(r => r.products.length > 0);
}

/**
 * Get featured/recommended products from all providers
 * Useful for marketplace homepage
 */
export async function getFeaturedProducts(
  perProvider: number = 10
): Promise<{ provider: ProductProvider; products: Product[] }[]> {
  const enabledProviders = getEnabledProviders();
  const results: { provider: ProductProvider; products: Product[] }[] = [];
  
  const featuredPromises = enabledProviders.map(async (provider) => {
    try {
      let products: Product[] = [];
      
      switch (provider) {
        case 'floristone':
          // Get best sellers
          const floristoneResult = await Floristone.getProducts('bs', undefined, 1, perProvider);
          products = floristoneResult.products;
          break;
        
        case 'prodigi':
          // Get featured photobooks and wall art
          const prodigiResult = await Prodigi.getProducts('photobooks', 1, perProvider);
          products = prodigiResult.products;
          break;
      }
      
      return { provider, products };
    } catch (error) {
      console.error(`Error getting featured products from ${provider}:`, error);
      return { provider, products: [] };
    }
  });
  
  const featuredResults = await Promise.all(featuredPromises);
  return featuredResults.filter(r => r.products.length > 0);
}

/**
 * Helper function to validate provider string
 */
export function isValidProvider(provider: string): provider is ProductProvider {
  return ['floristone', 'prodigi', 'goody'].includes(provider);
}

/**
 * Get all categories from all enabled providers
 */
export async function getAllCategories(): Promise<{
  provider: ProductProvider;
  categories: Category[];
}[]> {
  const enabledProviders = getEnabledProviders();
  
  const categoryPromises = enabledProviders.map(async (provider) => {
    try {
      const service = new MarketplaceService(provider);
      const categories = await service.getCategories();
      return { provider, categories };
    } catch (error) {
      console.error(`Error getting categories from ${provider}:`, error);
      return { provider, categories: [] };
    }
  });
  
  const results = await Promise.all(categoryPromises);
  return results.filter(r => r.categories.length > 0);
}

/**
 * Create a Prodigi order (fulfillment-only)
 * This is specific to Prodigi's print-on-demand model
 */
export async function createProdigiOrder(params: Parameters<typeof Prodigi.createOrder>[0]): Promise<ReturnType<typeof Prodigi.createOrder>> {
  return Prodigi.createOrder(params);
}

/**
 * Get order status from Prodigi
 */
export async function getProdigiOrderStatus(orderId: string): Promise<ReturnType<typeof Prodigi.getOrderStatus>> {
  return Prodigi.getOrderStatus(orderId);
}
