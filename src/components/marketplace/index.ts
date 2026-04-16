/**
 * Marketplace Components
 * Export all marketplace-related components for easy imports
 */

// Components (v2 / ongoody IA)
export { default as ProductCard } from './ProductCard';
export { default as ProductGrid } from './ProductGrid';
export { default as BrandCard } from './BrandCard';
export { default as CategoryRail } from './CategoryRail';
export { default as CategoryHero } from './CategoryHero';
export { default as FilterRow } from './FilterRow';
export { default as ScopePills } from './ScopePills';
export type { MarketplaceProduct, BrandCard as BrandCardData, CategoryNode, MarketplaceScope, MarketplaceView } from './types';

// Legacy components (still used elsewhere)
export { default as ProviderTabs, ProviderTabsScrollable } from './ProviderTabs';
export { default as CategorySidebar, CategorySheet, CategoryChips } from './CategorySidebar';
export { default as CartDrawer, CartButton } from './CartDrawer';

// Mock data (for development)
export {
  allProducts,
  flowerProducts,
  giftProducts,
  printProducts,
  providerConfigs,
  giftRecommendations,
  getProductsByProvider,
  getProductsByCategory,
  getProductById,
  searchProducts,
  filterProducts,
} from './mockData';
