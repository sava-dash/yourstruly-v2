'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Star, Sparkles, BadgePercent } from 'lucide-react';
import { Product } from '@/types/marketplace';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'polaroid';
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

export default function ProductCard({
  product,
  variant = 'default',
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
}: ProductCardProps) {
  const providerColors = {
    flowers: 'bg-[#B8562E]/10 text-[#B8562E] border-[#B8562E]/20',
    gifts: 'bg-[#2D5A3D]/10 text-[#2D5A3D] border-[#2D5A3D]/20',
    prints: 'bg-[#4A3552]/10 text-[#4A3552] border-[#4A3552]/20',
  };

  const providerLabels = {
    flowers: 'Flowers',
    gifts: 'Gifts',
    prints: 'Prints',
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  if (variant === 'polaroid') {
    return (
      <Link href={`/marketplace/${product.provider}/${product.id}`}>
        <motion.div
          className="group relative bg-white p-3 pb-16 shadow-md transition-all duration-300 hover:shadow-xl"
          style={{
            transform: 'rotate(-1deg)',
            boxShadow: '2px 3px 8px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.06)',
          }}
          whileHover={{ 
            y: -4, 
            rotate: 0,
            boxShadow: '4px 8px 20px rgba(0,0,0,0.12), 0 12px 30px rgba(0,0,0,0.08)',
          }}
        >
          {/* Tape decoration */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-[#F5F3EE]/80 rotate-1 opacity-60" 
            style={{ 
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          />
          
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-gray-100 mb-3">
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNew && (
                <span className="px-2 py-0.5 bg-[#2D5A3D] text-white text-xs font-handwritten rounded-sm">
                  New!
                </span>
              )}
              {product.isBestseller && (
                <span className="px-2 py-0.5 bg-[#C4A235] text-[#2d2d2d] text-xs font-handwritten rounded-sm flex items-center gap-1">
                  <Sparkles size={10} />
                  Bestseller
                </span>
              )}
              {product.originalPrice && (
                <span className="px-2 py-0.5 bg-[#B8562E] text-white text-xs font-handwritten rounded-sm flex items-center gap-1">
                  <BadgePercent size={10} />
                  Sale
                </span>
              )}
            </div>

            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 ${
                isFavorite 
                  ? 'bg-[#B8562E] text-white' 
                  : 'bg-white/80 text-gray-400 hover:text-[#B8562E]'
              }`}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* Provider badge */}
            <div className="absolute bottom-2 right-2">
              <span className={`px-2 py-0.5 text-xs font-handwritten rounded-full border ${providerColors[product.provider]}`}>
                {providerLabels[product.provider]}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="font-playfair text-sm font-semibold text-[#2d2d2d] mb-1 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-[#2D5A3D]">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Add to cart button */}
          <motion.button
            onClick={handleAddToCart}
            className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 py-2 bg-[#2D5A3D] text-white rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            whileTap={{ scale: 0.98 }}
          >
            <ShoppingBag size={14} />
            Add to Cart
          </motion.button>
        </motion.div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/marketplace/${product.provider}/${product.id}`}>
        <motion.div
          className="group flex gap-3 p-3 bg-white rounded-xl border border-[#2D5A3D]/10 hover:border-[#2D5A3D]/30 transition-all duration-200"
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(64, 106, 86, 0.08)' }}
        >
          {/* Thumbnail */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-handwritten rounded border ${providerColors[product.provider]} mb-1`}>
                  {providerLabels[product.provider]}
                </span>
                <h3 className="font-playfair text-sm font-semibold text-[#2d2d2d] line-clamp-1">
                  {product.name}
                </h3>
              </div>
              <button
                onClick={handleToggleFavorite}
                className={`p-1 rounded-full transition-colors ${
                  isFavorite ? 'text-[#B8562E]' : 'text-gray-300 hover:text-[#B8562E]'
                }`}
              >
                <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-[#2D5A3D]">${product.price.toFixed(2)}</span>
              <button
                onClick={handleAddToCart}
                className="p-1.5 text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
              >
                <ShoppingBag size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/marketplace/${product.provider}/${product.id}`}>
      <motion.div
        className="group bg-white rounded-2xl border border-[#2D5A3D]/10 overflow-hidden hover:border-[#2D5A3D]/30 transition-all duration-200"
        whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(64, 106, 86, 0.1)' }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.isNew && (
              <span className="px-2 py-0.5 bg-[#2D5A3D] text-white text-xs font-handwritten rounded-full">
                New!
              </span>
            )}
            {product.isBestseller && (
              <span className="px-2 py-0.5 bg-[#C4A235] text-[#2d2d2d] text-xs font-handwritten rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                Bestseller
              </span>
            )}
            {product.originalPrice && (
              <span className="px-2 py-0.5 bg-[#B8562E] text-white text-xs font-handwritten rounded-full flex items-center gap-1">
                <BadgePercent size={10} />
                Sale
              </span>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={handleToggleFavorite}
            className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
              isFavorite 
                ? 'bg-[#B8562E] text-white' 
                : 'bg-white/90 text-gray-400 hover:text-[#B8562E] opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Quick add overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <motion.button
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-2 py-2 bg-white text-[#2d2d2d] rounded-xl text-sm font-medium"
              whileTap={{ scale: 0.98 }}
            >
              <ShoppingBag size={16} />
              Add to Cart
            </motion.button>
          </div>

          {/* Provider badge */}
          <div className="absolute bottom-3 left-3">
            <span className={`px-2.5 py-1 text-xs font-handwritten rounded-full border backdrop-blur-sm ${providerColors[product.provider]}`}>
              {providerLabels[product.provider]}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-playfair text-base font-semibold text-[#2d2d2d] mb-1 line-clamp-1">
            {product.name}
          </h3>
          
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {product.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#2D5A3D]">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            {product.rating && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star size={14} className="text-[#C4A235] fill-[#C4A235]" />
                <span>{product.rating}</span>
                <span className="text-gray-400">({product.reviewCount})</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
