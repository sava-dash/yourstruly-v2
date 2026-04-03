'use client';

import { motion } from 'framer-motion';
import { Package, SearchX } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '@/types/marketplace';

interface ProductGridProps {
  products: Product[];
  variant?: 'default' | 'compact' | 'polaroid';
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
  favoriteIds?: string[];
  isLoading?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
}

export default function ProductGrid({
  products,
  variant = 'default',
  columns = 4,
  gap = 'md',
  onAddToCart,
  onToggleFavorite,
  favoriteIds = [],
  isLoading = false,
  emptyState,
}: ProductGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };

  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-[#2D5A3D]/10 overflow-hidden"
          >
            {/* Image skeleton */}
            <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
            
            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-20 h-20 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mb-4">
          <SearchX size={32} className="text-[#2D5A3D]" />
        </div>
        <h3 className="font-playfair text-xl font-semibold text-[#2d2d2d] mb-2">
          {emptyState?.title || 'No products found'}
        </h3>
        <p className="text-gray-500 text-center max-w-sm mb-4">
          {emptyState?.description || 'Try adjusting your filters or search query to find what you\'re looking for.'}
        </p>
        {emptyState?.action}
      </motion.div>
    );
  }

  // Staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
  } as const;

  // Polaroid grid has different layout
  if (variant === 'polaroid') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid ${gridClasses[columns]} ${gapClasses[gap]}`}
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            variants={itemVariants}
            style={{
              transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)`,
            }}
          >
            <ProductCard
              product={product}
              variant="polaroid"
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favoriteIds.includes(product.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid ${gridClasses[columns]} ${gapClasses[gap]}`}
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductCard
            product={product}
            variant={variant}
            onAddToCart={onAddToCart}
            onToggleFavorite={onToggleFavorite}
            isFavorite={favoriteIds.includes(product.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// Compact list view variant
export function ProductList({
  products,
  onAddToCart,
  onToggleFavorite,
  favoriteIds = [],
  isLoading = false,
}: Omit<ProductGridProps, 'variant' | 'columns' | 'gap'>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 bg-white rounded-xl border border-[#2D5A3D]/10">
            <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Package size={40} className="text-gray-300 mb-3" />
        <p className="text-gray-500">No products found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant="compact"
          onAddToCart={onAddToCart}
          onToggleFavorite={onToggleFavorite}
          isFavorite={favoriteIds.includes(product.id)}
        />
      ))}
    </div>
  );
}
