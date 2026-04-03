'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ShoppingBag, Heart, X, Loader2, BookOpen, Calendar, Printer, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ProductGrid from '@/components/marketplace/ProductGrid';
import ProviderTabs from '@/components/marketplace/ProviderTabs';
import { CategoryChips } from '@/components/marketplace/CategorySidebar';
import { useMarketplaceProducts, useCategories } from '@/hooks/useMarketplace';
import { ProviderType, Product } from '@/types/marketplace';
import PostscriptCreditsSection from '@/components/marketplace/PostscriptCreditsSection';

// Price filter options
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200+', min: 200, max: Infinity },
];

export default function MarketplacePage() {
  const [activeProvider, setActiveProvider] = useState<ProviderType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ label: string; min: number; max: number }>(PRICE_RANGES[0]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch products from API
  const {
    products: apiProducts,
    isLoading,
    error,
    hasMore,
    total,
    loadMore,
    refetch,
  } = useMarketplaceProducts({
    provider: activeProvider,
    category: selectedCategory,
    search: searchQuery,
    perPage: 24,
  });

  // Fetch categories
  const { categories, isLoading: categoriesLoading } = useCategories({
    provider: activeProvider,
  });

  // Filter products by price
  const filteredProducts = useMemo(() => {
    if (priceRange.min === 0 && priceRange.max === Infinity) {
      return apiProducts;
    }
    return apiProducts.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max
    );
  }, [apiProducts, priceRange]);

  // Get product counts by provider
  const providerCounts = useMemo(() => {
    // In a real implementation, you'd get these from the API
    // For now, we'll estimate based on the current fetch
    return {
      all: total,
      flowers: activeProvider === 'flowers' ? total : 0,
      gifts: activeProvider === 'gifts' ? total : 0,
      prints: activeProvider === 'prints' ? total : 0,
    };
  }, [total, activeProvider]);

  const handleAddToCart = (product: Product) => {
    setCartCount((prev) => prev + 1);
    // TODO: Implement actual cart logic
    console.log('Added to cart:', product.name);
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const clearFilters = () => {
    setActiveProvider('all');
    setSelectedCategory(undefined);
    setSearchQuery('');
    setPriceRange(PRICE_RANGES[0]);
  };

  const hasActiveFilters = activeProvider !== 'all' || selectedCategory || searchQuery || priceRange.min > 0;

  // Provider display names
  const getProviderLabel = (provider: ProviderType | 'all') => {
    switch (provider) {
      case 'flowers': return 'Flowers';
      case 'gifts': return 'Gifts';
      case 'prints': return 'Prints';
      default: return 'All';
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Header Section */}
      <div className="glass-warm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title and cart */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-playfair text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Keepsakes & Gifts
              </h1>
              <p className="text-gray-800/60 font-handwritten text-lg">
                Thoughtful gifts to accompany your messages
              </p>
            </div>
            
            {/* Cart button */}
            <button className="relative p-3 glass rounded-xl hover:bg-white/15 transition-colors">
              <ShoppingBag size={24} className="text-[#d4a574]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B8562E] text-gray-800 text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl mb-6">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-800/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search" placeholder="Search for flowers, gifts, or personalized prints..."
              className="w-full pl-12 pr-4 py-3.5 glass rounded-xl text-gray-800 placeholder:text-gray-800/40 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-800/40 hover:text-gray-800"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Horizontal Category Tabs */}
          <div className="flex flex-wrap gap-2">
            <ProviderTabs
              activeProvider={activeProvider}
              onChange={(provider) => {
                setActiveProvider(provider);
                setSelectedCategory(undefined);
              }}
              counts={providerCounts}
              variant="pills"
            />
          </div>
        </div>
      </div>

      {/* Printing Section */}
      <div className="bg-gradient-to-r from-[#2D5A3D]/5 via-[#C4A235]/5 to-[#B8562E]/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Printer size={20} className="text-[#B8562E]" />
            <h2 className="font-playfair text-xl font-semibold text-gray-800">
              📚 Printing & Keepsakes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Photo Book Card */}
            <Link
              href="/dashboard/photobook/create?source=marketplace&product=photobook"
              className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-[#2D5A3D]/10 hover:border-[#2D5A3D]/30 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C4A235] to-[#B8562E] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#B8562E] transition-colors flex items-center gap-2">
                    Photo Book
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Turn your memories into a beautiful printed book with QR-linked videos
                  </p>
                  <p className="text-xs text-[#2D5A3D] mt-2 font-medium">
                    Starting at $24.99
                  </p>
                </div>
              </div>
            </Link>

            {/* Calendar Card */}
            <Link
              href="/dashboard/photobook/create?source=marketplace&product=calendar"
              className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-[#2D5A3D]/10 hover:border-[#2D5A3D]/30 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D5A3D] to-[#5A8A76] flex items-center justify-center flex-shrink-0">
                  <Calendar size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#2D5A3D] transition-colors flex items-center gap-2">
                    Photo Calendar
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Create a custom wall calendar featuring your favorite moments
                  </p>
                  <p className="text-xs text-[#2D5A3D] mt-2 font-medium">
                    Starting at $19.99
                  </p>
                </div>
              </div>
            </Link>

            {/* Prints Card */}
            <Link
              href="/dashboard/photobook/create?source=marketplace&product=prints"
              className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-[#2D5A3D]/10 hover:border-[#2D5A3D]/30 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#B8562E] to-[#E07A4E] flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🖼️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#B8562E] transition-colors flex items-center gap-2">
                    Photo Prints
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    High-quality prints in various sizes to frame and display
                  </p>
                  <p className="text-xs text-[#2D5A3D] mt-2 font-medium">
                    Starting at $4.99
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Postscript Credits Section */}
      <PostscriptCreditsSection />

      {/* Horizontal Categories Bar */}
      <div className="glass-subtle border-b border-white/5 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-[#2D5A3D] text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white'
              }`}
            >
              All Categories
            </button>
            {categoriesLoading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              categories.map((cat, idx) => (
                <button
                  key={`${cat.provider || 'cat'}-${cat.id}-${idx}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-white/50 text-gray-700 hover:bg-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Price Filter Bar */}
      <div className="bg-white/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-sm text-gray-600 mr-2">Price:</span>
            {PRICE_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setPriceRange(range)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  priceRange.label === range.label
                    ? 'bg-[#d4a574] text-white'
                    : 'bg-white/50 text-gray-700 hover:bg-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Product Grid - Full Width */}
          <main className="flex-1 min-w-0 w-full">
            {/* Filter bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="font-playfair text-xl font-semibold text-gray-800">
                  {searchQuery ? 'Search Results' : selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || selectedCategory : `All ${getProviderLabel(activeProvider)}`}
                </h2>
                <span className="text-sm text-gray-800/50">
                  {isLoading && filteredProducts.length === 0 ? 'Loading...' : `${filteredProducts.length} items`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-800/60 hover:text-gray-800 transition-colors"
                  >
                    <X size={14} />
                    Clear filters
                  </button>
                )}
                
                {/* Mobile filter button */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden p-2 glass rounded-lg hover:bg-white/15 transition-colors"
                >
                  <SlidersHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Active filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {activeProvider !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 glass text-gray-800 rounded-full text-sm">
                    {getProviderLabel(activeProvider)}
                    <button
                      onClick={() => setActiveProvider('all')}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#d4a574]/20 text-[#8b6914] rounded-full text-sm">
                    {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                    <button
                      onClick={() => setSelectedCategory(undefined)}
                      className="ml-1 p-0.5 hover:bg-[#d4a574]/30 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {priceRange.min > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 glass text-gray-800 rounded-full text-sm">
                    {priceRange.label}
                    <button
                      onClick={() => setPriceRange(PRICE_RANGES[0])}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 glass text-gray-800 rounded-full text-sm">
                    &quot;{searchQuery}&quot;
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center py-12 bg-red-50 rounded-2xl mb-6">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                  onClick={refetch}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Products */}
            <ProductGrid
              products={filteredProducts}
              variant="polaroid"
              columns={4}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              favoriteIds={favorites}
              isLoading={isLoading && filteredProducts.length === 0}
              emptyState={{
                title: 'No products found',
                description: searchQuery 
                  ? `No results for &quot;${searchQuery}&quot;. Try a different search term.`
                  : 'Try adjusting your filters or search for something else.',
                action: hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-[#d4a574] text-[#1a1512] rounded-xl font-medium hover:bg-[#c9886d] transition-colors"
                  >
                    Clear all filters
                  </button>
                ) : undefined,
              }}
            />

            {/* Load more */}
            {hasMore && filteredProducts.length > 0 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-8 py-3 border-2 border-[#2D5A3D] text-[#2D5A3D] rounded-full font-medium hover:bg-[#2D5A3D] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More Products'
                  )}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
