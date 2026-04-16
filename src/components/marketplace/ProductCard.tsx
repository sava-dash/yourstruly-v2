'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Gift, Sparkles, BookOpen } from 'lucide-react';
import { useState } from 'react';
import type { MarketplaceProduct } from './types';
import { formatCents } from './types';

/**
 * Display mode controls action buttons and click behavior.
 * - 'marketplace' (default): hover-reveal Add / Gift buttons, card links to PDP.
 * - 'modal': single terra-cotta "Select" button, click fires `onSelect`.
 */
export type ProductCardMode = 'marketplace' | 'modal';

interface ProductCardProps {
  product: MarketplaceProduct;
  compact?: boolean;
  /** Display mode — controls which action buttons appear. */
  mode?: ProductCardMode;
  onAddToCart?: (p: MarketplaceProduct) => void;
  /** When provided, clicking the card fires this instead of navigating (e.g. gift modal). */
  onSelect?: (p: MarketplaceProduct) => void;
  href?: string;
}

export default function ProductCard({
  product,
  compact = false,
  mode = 'marketplace',
  onAddToCart,
  onSelect,
  href,
}: ProductCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const image = !imgErr && product.images[0] ? product.images[0] : '';
  const hasVariants =
    product.startingPriceCents !== product.basePriceCents &&
    product.startingPriceCents < product.basePriceCents;

  const priceLabel = hasVariants
    ? `${formatCents(product.startingPriceCents)}+`
    : formatCents(product.salePriceCents ?? product.basePriceCents);

  const isBestSeller = product.scope.includes('best_seller');
  const isPersonalized = product.scope.includes('personalized');
  const isGiftOfChoice = product.scope.includes('gift_of_choice');

  // Photobook detection — route to the book creation flow instead of PDP
  const isPhotobook =
    product.prodigiCategory === 'photobooks' ||
    product.categories?.some((c) => c.toLowerCase().includes('photobook'));

  const destination =
    href ??
    (isPhotobook
      ? `/dashboard/photobook/create?sku=${encodeURIComponent(product.id)}`
      : `/marketplace/product/${product.id}`);

  const inner = (
    <div
      className={`group bg-white rounded-2xl border border-[#406A56]/10 overflow-hidden transition-all duration-200 hover:border-[#406A56]/30 hover:shadow-md ${
        compact ? 'text-sm' : ''
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#F2F1E5]">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes={compact ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 50vw, 33vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={48} className="text-[#406A56]/20" />
          </div>
        )}

        {/* Scope badges (top-left) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isBestSeller && (
            <span className="px-2 py-0.5 bg-[#C35F33] text-white text-[10px] font-medium rounded-full flex items-center gap-1">
              <Sparkles size={10} /> Best Seller
            </span>
          )}
          {isPersonalized && (
            <span className="px-2 py-0.5 bg-[#406A56] text-white text-[10px] font-medium rounded-full">
              Personalized
            </span>
          )}
          {isGiftOfChoice && !isBestSeller && (
            <span className="px-2 py-0.5 bg-white/90 text-[#406A56] text-[10px] font-medium rounded-full border border-[#406A56]/20">
              Gift of Choice
            </span>
          )}
          {isPhotobook && (
            <span className="px-2 py-0.5 bg-[#406A56] text-white text-[10px] font-medium rounded-full flex items-center gap-1">
              <BookOpen size={10} /> Book
            </span>
          )}
        </div>
      </div>

      <div className={compact ? 'p-3' : 'p-4'}>
        {product.brand && (
          <div
            className="text-[11px] uppercase tracking-wide text-[#666] mb-1"
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            {product.brand}
          </div>
        )}
        <h3
          className={`font-semibold text-[#2d2d2d] line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}
          style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
        >
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-[#406A56]">{priceLabel}</span>
          {isPhotobook && (
            <span className="text-xs font-medium text-[#C35F33]">
              Create your book &rarr;
            </span>
          )}
        </div>

        {/* Actions — mode-dependent */}
        {mode === 'modal' && onSelect && (
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(product);
              }}
              className="w-full min-h-[44px] bg-[#C35F33] text-white text-xs font-medium rounded-full flex items-center justify-center gap-1.5 hover:bg-[#a84e2a] transition-colors"
            >
              <Gift size={14} /> Select
            </button>
          </div>
        )}
        {mode === 'marketplace' && onAddToCart && (
          <div className="mt-3 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              className="w-full min-h-[40px] bg-[#406A56] text-white text-xs font-medium rounded-full flex items-center justify-center gap-1.5 hover:bg-[#355a49]"
            >
              <ShoppingBag size={14} /> Add to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="text-left w-full"
      >
        {inner}
      </button>
    );
  }

  return <Link href={destination}>{inner}</Link>;
}
