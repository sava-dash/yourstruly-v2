'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, ShoppingBag, X, Loader2, SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import ProductGrid from '@/components/marketplace/ProductGrid';
import { useMarketplaceProducts, useCategories } from '@/hooks/useMarketplace';
import { ProviderType, Product } from '@/types/marketplace';

const PROVIDERS: { id: ProviderType | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'flowers', label: 'Flowers', icon: '🌸' },
  { id: 'gifts', label: 'Gifts', icon: '🎁' },
  { id: 'prints', label: 'Prints', icon: '🖼️' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
];

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial state from URL
  const [activeProvider, setActiveProvider] = useState<ProviderType | 'all'>(
    (searchParams.get('provider') as ProviderType | 'all') || 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    searchParams.get('cat') || undefined
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [priceMax, setPriceMax] = useState<number>(500);
  const [sortBy, setSortBy] = useState('popular');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  const {
    products: apiProducts, isLoading, error, hasMore, total, loadMore, refetch,
  } = useMarketplaceProducts({
    provider: activeProvider,
    category: selectedCategory,
    search: searchQuery,
    perPage: 24,
  });

  const { categories, isLoading: categoriesLoading } = useCategories({
    provider: activeProvider,
  });

  // Client-side price + sort filtering
  const filteredProducts = useMemo(() => {
    let result = priceMax < 500
      ? apiProducts.filter((p) => p.price <= priceMax)
      : apiProducts;

    if (sortBy === 'price-low') result = [...result].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') result = [...result].sort((a, b) => b.price - a.price);
    // 'newest' and 'popular' use the API's default order
    return result;
  }, [apiProducts, priceMax, sortBy]);

  const handleProviderChange = useCallback((provider: ProviderType | 'all') => {
    setActiveProvider(provider);
    setSelectedCategory(undefined);
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    setCartCount((prev) => prev + 1);
  }, []);

  const handleToggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const hasActiveFilters = activeProvider !== 'all' || selectedCategory || searchQuery || priceMax < 500;

  const clearFilters = () => {
    setActiveProvider('all');
    setSelectedCategory(undefined);
    setSearchQuery('');
    setPriceMax(500);
    setSortBy('popular');
  };

  // --- Sidebar filter content (shared between desktop sidebar and mobile sheet) ---
  const filterContent = (
    <div className="space-y-6">
      {/* Provider */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Shop</h3>
        <div className="space-y-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeProvider === p.id
                  ? 'bg-[#2D5A3D] text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Category</h3>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !selectedCategory ? 'text-[#2D5A3D] font-medium bg-[#2D5A3D]/5' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {categories.map((cat, idx) => (
              <button
                key={`${cat.id}-${idx}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedCategory === cat.id ? 'text-[#2D5A3D] font-medium bg-[#2D5A3D]/5' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {categoriesLoading && <Loader2 size={14} className="animate-spin text-gray-400 mx-3 my-2" />}
          </div>
        </div>
      )}

      {/* Price */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Price {priceMax < 500 ? `(under $${priceMax})` : ''}
        </h3>
        <input
          type="range"
          min={10}
          max={500}
          step={10}
          value={priceMax}
          onChange={(e) => setPriceMax(Number(e.target.value))}
          className="w-full accent-[#2D5A3D]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$10</span>
          <span>{priceMax >= 500 ? 'Any' : `$${priceMax}`}</span>
        </div>
      </div>

      {/* Sort — shown in mobile filter sheet only (desktop has it in toolbar) */}
      <div className="sm:hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Sort by</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-4">
            <h1
              className="text-2xl font-bold text-[#1A1F1C]"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              Keepsakes & Gifts
            </h1>
            <Link
              href="/marketplace/cart"
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ShoppingBag size={22} className="text-[#5A6660]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#2D5A3D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flowers, gifts, prints..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main: Sidebar + Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-20">
              {filterContent}
            </div>
          </aside>

          {/* Product area */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#1A1F1C]">
                  {searchQuery
                    ? 'Search Results'
                    : selectedCategory
                      ? categories.find((c) => c.id === selectedCategory)?.name || 'Products'
                      : activeProvider !== 'all'
                        ? PROVIDERS.find((p) => p.id === activeProvider)?.label || 'Products'
                        : 'All Products'}
                </h2>
                <span className="text-sm text-gray-400">
                  {isLoading && filteredProducts.length === 0 ? '' : `${filteredProducts.length} items`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="hidden sm:block px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-full border border-gray-200 hover:border-gray-300 transition-colors">
                    <X size={12} /> Clear
                  </button>
                )}

                {/* Mobile filter toggle */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-center py-10 bg-red-50 rounded-2xl mb-6">
                <p className="text-red-600 mb-2 text-sm">{error}</p>
                <button onClick={refetch} className="px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                  Try Again
                </button>
              </div>
            )}

            {/* Products */}
            <ProductGrid
              products={filteredProducts}
              variant="default"
              columns={3}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              favoriteIds={favorites}
              isLoading={isLoading && filteredProducts.length === 0}
              emptyState={{
                title: 'No products found',
                description: searchQuery
                  ? `No results for "${searchQuery}".`
                  : 'Try adjusting your filters.',
                action: hasActiveFilters ? (
                  <button onClick={clearFilters} className="px-5 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#244B32] transition-colors">
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
                  className="px-8 py-2.5 border border-[#2D5A3D] text-[#2D5A3D] rounded-full text-sm font-medium hover:bg-[#2D5A3D] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}

            {/* Keepsakes section removed — will live under Prints provider filter */}
          </main>
        </div>
      </div>

      {/* ── Mobile filter sheet ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Filters</h3>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4">
              {filterContent}
            </div>
            <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-2.5 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium"
              >
                Show {filteredProducts.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
