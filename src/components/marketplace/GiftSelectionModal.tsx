'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Gift, Sparkles, Filter, Check, SlidersHorizontal, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Product, ProviderType, GiftSelectionContext } from '@/types/marketplace';
import { useMarketplaceProducts, useGiftSuggestions, useCategories } from '@/hooks/useMarketplace';
import ProductCard from './ProductCard';
import ProviderTabs from './ProviderTabs';

interface GiftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGift: (product: Product) => void;
  context?: GiftSelectionContext;
  title?: string;
  maxWidth?: string;
}

// Price range presets
const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200+', min: 200, max: 10000 },
];

export default function GiftSelectionModal({
  isOpen,
  onClose,
  onSelectGift,
  context,
  title = 'Select a Gift',
  maxWidth = 'max-w-5xl',
}: GiftSelectionModalProps) {
  const [activeProvider, setActiveProvider] = useState<ProviderType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Price filter state
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | undefined>(
    context?.budget
  );
  const [customPriceMin, setCustomPriceMin] = useState<string>(
    context?.budget?.min?.toString() || ''
  );
  const [customPriceMax, setCustomPriceMax] = useState<string>(
    context?.budget?.max?.toString() || ''
  );

  // Fetch products from API
  const {
    products: apiProducts,
    isLoading: isLoadingProducts,
    error: productsError,
    hasMore,
    loadMore,
  } = useMarketplaceProducts({
    provider: activeProvider,
    category: selectedCategory,
    search: searchQuery,
    enabled: isOpen,
  });

  // Fetch AI suggestions based on context
  const {
    suggestions: aiSuggestions,
    isLoading: isLoadingSuggestions,
  } = useGiftSuggestions({
    context: context ? { ...context, budget: priceRange } : undefined,
    enabled: isOpen && !!context?.eventType,
  });

  // Fetch categories
  const { categories } = useCategories({
    provider: activeProvider,
    enabled: isOpen,
  });

  // Filter products by price range
  const filteredProducts = useMemo(() => {
    let products = apiProducts;
    
    if (priceRange) {
      products = products.filter(
        (p) => p.price >= priceRange.min && p.price <= priceRange.max
      );
    }
    
    return products;
  }, [apiProducts, priceRange]);

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleConfirmSelection = () => {
    if (selectedProduct) {
      onSelectGift(selectedProduct);
      onClose();
    }
  };

  const handlePriceRangeSelect = (range: { min: number; max: number }) => {
    setPriceRange(range);
    setCustomPriceMin(range.min.toString());
    setCustomPriceMax(range.max.toString());
  };

  const handleCustomPriceApply = () => {
    const min = parseFloat(customPriceMin) || 0;
    const max = parseFloat(customPriceMax) || 10000;
    setPriceRange({ min, max });
  };

  const clearFilters = () => {
    setActiveProvider('all');
    setSelectedCategory(undefined);
    setSearchQuery('');
    setPriceRange(undefined);
    setCustomPriceMin('');
    setCustomPriceMax('');
  };

  const hasActiveFilters = activeProvider !== 'all' || selectedCategory || searchQuery || priceRange;

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal content */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`relative w-full ${maxWidth} max-h-[90vh] sm:max-h-[85vh] bg-white/90 backdrop-blur-[24px] border border-white/50 rounded-[20px] shadow-[0_4px_16px_rgba(195,95,51,0.06),0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/50">
          <div>
            <h3 className="font-playfair text-xl font-semibold text-[#2d2d2d] flex items-center gap-2">
              <Gift size={22} className="text-[#406A56]" />
              {title}
            </h3>
            {context && (
              <p className="text-sm text-gray-500 mt-1">
                {context.eventType && (
                  <span className="capitalize">{context.eventType}</span>
                )}
                {context.relationship && (
                  <span className="ml-1 text-gray-400">• {context.relationship}</span>
                )}
                {priceRange && (
                  <span className="ml-2 text-[#406A56] font-medium">
                    • ${priceRange.min}-${priceRange.max}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#406A56]/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 space-y-4 bg-white/30 border-b border-[#406A56]/10">
          {/* Search bar */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search" placeholder="Search gifts..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#406A56] transition-colors"
            />
          </div>

          {/* Provider tabs */}
          <ProviderTabs
            activeProvider={activeProvider}
            onChange={(provider) => {
              setActiveProvider(provider);
              setSelectedCategory(undefined);
            }}
            variant="minimal"
          />

          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-[#406A56] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {categories.map((cat, idx) => (
              <button
                key={`${cat.provider || 'cat'}-${cat.id}-${idx}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#406A56] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ml-auto flex-shrink-0 ${
                showFilters ? 'bg-[#406A56] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-xl p-4 space-y-4">
                  {/* Price range presets */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                    <div className="flex flex-wrap gap-2">
                      {PRICE_RANGES.map((range) => (
                        <button
                          key={range.label}
                          onClick={() => handlePriceRangeSelect(range)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            priceRange?.min === range.min && priceRange?.max === range.max
                              ? 'bg-[#406A56] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom price range */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Custom:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={customPriceMin}
                        onChange={(e) => setCustomPriceMin(e.target.value)}
                        placeholder="Min"
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#406A56]"
                      />
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        value={customPriceMax}
                        onChange={(e) => setCustomPriceMax(e.target.value)}
                        placeholder="Max"
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#406A56]"
                      />
                      <button
                        onClick={handleCustomPriceApply}
                        className="px-3 py-1 bg-[#406A56] text-white rounded-lg text-sm hover:bg-[#365c4a] transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeProvider !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#406A56]/10 text-[#406A56] rounded-full text-xs">
                  {activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)}
                  <button onClick={() => setActiveProvider('all')} className="hover:text-[#C35F33]">
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#406A56]/10 text-[#406A56] rounded-full text-xs">
                  {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button onClick={() => setSelectedCategory(undefined)} className="hover:text-[#C35F33]">
                    <X size={12} />
                  </button>
                </span>
              )}
              {priceRange && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#406A56]/10 text-[#406A56] rounded-full text-xs">
                  ${priceRange.min}-${priceRange.max}
                  <button onClick={() => setPriceRange(undefined)} className="hover:text-[#C35F33]">
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery('')} className="hover:text-[#C35F33]">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-[#406A56] underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Error state */}
        {productsError && (
          <div className="p-4 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{productsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-red-600 underline mt-1"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* AI Recommendations section */}
          {context?.eventType && !searchQuery && !selectedCategory && activeProvider === 'all' && (
            <section>
              <h4 className="font-handwritten text-lg text-[#406A56] mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                {isLoadingSuggestions ? 'Finding perfect gifts...' : 'Recommended for this occasion'}
              </h4>
              
              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#406A56]" />
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {aiSuggestions.slice(0, 6).map((product: any) => (
                    <motion.div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`cursor-pointer ${selectedProduct?.id === product.id ? 'ring-2 ring-[#406A56] rounded-2xl' : ''}`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ProductCard
                        product={product}
                        variant="compact"
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={favorites.includes(product.id)}
                      />
                      {product.suggestionReason && (
                        <p className="text-xs text-[#406A56] mt-1 text-center font-handwritten">
                          {product.suggestionReason}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No specific recommendations available</p>
              )}
            </section>
          )}

          {/* All products */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-handwritten text-lg text-[#406A56]">
                {searchQuery ? 'Search Results' : 'All Gifts'}
              </h4>
              <span className="text-xs text-gray-500">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            {isLoadingProducts && filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#406A56]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Gift size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No gifts found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-[#406A56] text-white rounded-lg text-sm hover:bg-[#365c4a] transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`cursor-pointer ${selectedProduct?.id === product.id ? 'ring-2 ring-[#406A56] rounded-2xl' : ''}`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ProductCard
                        product={product}
                        variant="compact"
                        onToggleFavorite={handleToggleFavorite}
                        isFavorite={favorites.includes(product.id)}
                      />
                    </motion.div>
                  ))}
                </div>
                
                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingProducts}
                      className="px-6 py-2 border border-[#406A56] text-[#406A56] rounded-full text-sm hover:bg-[#406A56] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isLoadingProducts ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load more'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Selected product preview */}
        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-4 bg-white border-t border-[#406A56]/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProduct.thumbnail}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-playfair font-semibold text-[#2d2d2d] truncate">
                    {selectedProduct.name}
                  </h4>
                  <p className="text-[#406A56] font-bold">${selectedProduct.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedProduct.provider}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 text-gray-500 hover:text-[#2d2d2d] transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleConfirmSelection}
                    className="flex items-center gap-2 px-6 py-2 bg-[#406A56] text-white rounded-xl font-medium"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Check size={16} />
                    Select Gift
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}

// Compact inline gift selector for PostScript editor
interface InlineGiftSelectorProps {
  onSelectGift: (product: Product) => void;
  selectedGift?: Product | null;
  onRemoveGift?: () => void;
}

export function InlineGiftSelector({
  onSelectGift,
  selectedGift,
  onRemoveGift,
}: InlineGiftSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (selectedGift) {
    return (
      <div className="flex items-center gap-3 p-3 bg-[#406A56]/10 rounded-xl border border-[#406A56]/20">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedGift.thumbnail}
            alt={selectedGift.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-handwritten text-[#406A56] text-sm">Attached Gift</p>
          <h4 className="font-playfair font-semibold text-[#2d2d2d] truncate text-sm">
            {selectedGift.name}
          </h4>
          <p className="text-[#406A56] font-bold text-sm">${selectedGift.price.toFixed(2)}</p>
        </div>
        <button
          onClick={onRemoveGift}
          className="p-2 text-gray-400 hover:text-[#C35F33] transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-[#406A56]/30 rounded-xl text-[#406A56] hover:bg-[#406A56]/5 hover:border-[#406A56]/50 transition-all"
      >
        <div className="w-10 h-10 rounded-full bg-[#406A56]/10 flex items-center justify-center">
          <Gift size={20} />
        </div>
        <div className="text-left">
          <p className="font-medium">Add a Gift</p>
          <p className="text-sm opacity-70">Attach a physical gift to this PostScript</p>
        </div>
      </button>

      <GiftSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectGift={(product) => {
          onSelectGift(product);
          setIsModalOpen(false);
        }}
        title="Choose a Gift"
        maxWidth="max-w-4xl"
      />
    </>
  );
}
