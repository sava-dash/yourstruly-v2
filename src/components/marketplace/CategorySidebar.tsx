'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, FolderOpen, Tag, X } from 'lucide-react';
import { Category, ProviderType } from '@/types/marketplace';
import { providerConfigs } from './mockData';

interface CategorySidebarProps {
  selectedCategory?: string;
  onSelectCategory: (category: string | undefined) => void;
  activeProvider: ProviderType | 'all';
  className?: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CategorySidebar({
  selectedCategory,
  onSelectCategory,
  activeProvider,
  className = '',
  collapsible = false,
  isOpen = true,
  onClose,
}: CategorySidebarProps) {
  const [expandedProviders, setExpandedProviders] = useState<ProviderType[]>(
    activeProvider === 'all' ? ['flowers', 'gifts', 'prints'] : [activeProvider as ProviderType]
  );

  const toggleProvider = (providerId: ProviderType) => {
    setExpandedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((p) => p !== providerId)
        : [...prev, providerId]
    );
  };

  const getProviderCategories = (providerId: ProviderType): Category[] => {
    const config = providerConfigs.find((p) => p.id === providerId);
    return config?.categories || [];
  };

  const providerMeta: Record<ProviderType, { name: string; color: string; bgColor: string }> = {
    flowers: { name: 'Flowers', color: '#B8562E', bgColor: 'bg-[#B8562E]/10' },
    gifts: { name: 'Gifts', color: '#2D5A3D', bgColor: 'bg-[#2D5A3D]/10' },
    prints: { name: 'Prints', color: '#4A3552', bgColor: 'bg-[#4A3552]/10' },
  };

  const providersToShow: ProviderType[] =
    activeProvider === 'all' ? ['flowers', 'gifts', 'prints'] : [activeProvider];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={collapsible ? { x: -300, opacity: 0 } : false}
          animate={collapsible ? { x: 0, opacity: 1 } : undefined}
          exit={collapsible ? { x: -300, opacity: 0 } : undefined}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`${className} ${collapsible ? 'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl' : ''}`}
        >
          <div className={`h-full ${collapsible ? 'p-4 overflow-y-auto' : ''}`}>
            {/* Mobile header */}
            {collapsible && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <h2 className="font-playfair text-lg font-semibold text-[#2d2d2d]">
                  Categories
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* All Categories option */}
            <button
              onClick={() => onSelectCategory(undefined)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 mb-2 ${
                !selectedCategory
                  ? 'bg-[#2D5A3D] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <FolderOpen size={18} />
              <span className="font-medium">All Categories</span>
            </button>

            {/* Provider sections */}
            <div className="space-y-2 mt-4">
              {providersToShow.map((providerId) => {
                const meta = providerMeta[providerId];
                const categories = getProviderCategories(providerId);
                const isExpanded = expandedProviders.includes(providerId);

                return (
                  <div key={providerId} className="border-b border-gray-100 last:border-0 pb-2">
                    {/* Provider header */}
                    <button
                      onClick={() => toggleProvider(providerId)}
                      className="w-full flex items-center justify-between px-2 py-2 text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full`}
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="font-handwritten text-lg" style={{ color: meta.color }}>
                          {meta.name}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={16} className="text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Categories list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 space-y-1 mt-1">
                            {categories.map((category) => (
                              <button
                                key={`${providerId}-${category.id}`}
                                onClick={() => onSelectCategory(category.slug)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                  selectedCategory === category.slug
                                    ? `${meta.bgColor} text-[#2d2d2d] font-medium`
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Tag size={12} className="opacity-50" />
                                  {category.name}
                                </span>
                                {category.productCount && (
                                  <span className={`text-xs ${
                                    selectedCategory === category.slug ? 'opacity-70' : 'text-gray-400'
                                  }`}>
                                    {category.productCount}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Price range filter */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="font-handwritten text-lg text-[#2D5A3D] mb-3">Price Range</h3>
              <div className="space-y-2">
                {[
                  { label: 'Under $25', min: 0, max: 25 },
                  { label: '$25 - $50', min: 25, max: 50 },
                  { label: '$50 - $100', min: 50, max: 100 },
                  { label: 'Over $100', min: 100, max: Infinity },
                ].map((range) => (
                  <label
                    key={range.label}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="price-range"
                      className="w-4 h-4 text-[#2D5A3D] border-gray-300 focus:ring-[#2D5A3D]"
                    />
                    <span className="text-sm text-gray-600">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort options */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="font-handwritten text-lg text-[#2D5A3D] mb-3">Sort By</h3>
              <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#2D5A3D]">
                <option>Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
                <option>Best Sellers</option>
                <option>Highest Rated</option>
              </select>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// Mobile category sheet
export function CategorySheet({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  activeProvider,
}: CategorySidebarProps & { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sheet */}
      <CategorySidebar
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          onSelectCategory(cat);
          onClose();
        }}
        activeProvider={activeProvider}
        collapsible
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  );
}

// Horizontal category chips for compact layouts
export function CategoryChips({
  selectedCategory,
  onSelectCategory,
  activeProvider,
}: CategorySidebarProps) {
  const providersToShow: ProviderType[] =
    activeProvider === 'all' ? ['flowers', 'gifts', 'prints'] : [activeProvider];

  const allCategories = providersToShow.flatMap((providerId) => {
    const config = providerConfigs.find((p) => p.id === providerId);
    return (config?.categories || []).map((cat) => ({ ...cat, provider: providerId }));
  });

  const providerColors: Record<ProviderType, string> = {
    flowers: '#B8562E',
    gifts: '#2D5A3D',
    prints: '#4A3552',
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
      <button
        onClick={() => onSelectCategory(undefined)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          !selectedCategory
            ? 'bg-[#2D5A3D] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#2D5A3D]/50'
        }`}
      >
        All
      </button>
      
      {allCategories.map((category) => (
        <button
          key={`${category.provider}-${category.id}`}
          onClick={() => onSelectCategory(category.slug)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
            selectedCategory === category.slug
              ? 'text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          style={{
            backgroundColor: selectedCategory === category.slug ? providerColors[category.provider] : undefined,
          }}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
