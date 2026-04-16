'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Gift, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { MarketplaceProduct } from './types';
import { formatCents } from './types';

interface ProductCardProps {
  product: MarketplaceProduct;
  compact?: boolean;
  onAddToCart?: (p: MarketplaceProduct) => void;
  onSendAsGift?: (p: MarketplaceProduct) => void;
  /** When provided, clicking the card fires this instead of navigating (e.g. gift modal). */
  onSelect?: (p: MarketplaceProduct) => void;
  href?: string;
}

export default function ProductCard({
  product,
  compact = false,
  onAddToCart,
  onSendAsGift,
  onSelect,
  href,
}: ProductCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const image = !imgErr && product.images[0] ? product.images[0] : '/placeholder-product.png';
  const hasVariants =
    product.startingPriceCents !== product.basePriceCents &&
    product.startingPriceCents < product.basePriceCents;

  const priceLabel = hasVariants
    ? `${formatCents(product.startingPriceCents)}+`
    : formatCents(product.salePriceCents ?? product.basePriceCents);

  const isBestSeller = product.scope.includes('best_seller');
  const isPersonalized = product.scope.includes('personalized');
  const isGiftOfChoice = product.scope.includes('gift_of_choice');

  const destination =
    href ?? (product.brandSlug ? `/marketplace/brand/${product.brandSlug}?product=${product.id}` : `/marketplace`);

  const inner = (
    <div
      className={`group bg-white rounded-2xl border border-[#406A56]/10 overflow-hidden transition-all duration-200 hover:border-[#406A56]/30 hover:shadow-md ${
        compact ? 'text-sm' : ''
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#F2F1E5]">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes={compact ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 50vw, 33vw'}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgErr(true)}
        />

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
        </div>

        {/* Actions — hover-reveal on desktop, always visible on mobile */}
        {(onAddToCart || onSendAsGift) && (
          <div className="mt-3 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity">
            {onAddToCart && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="flex-1 min-h-[40px] bg-[#406A56] text-white text-xs font-medium rounded-full flex items-center justify-center gap-1.5 hover:bg-[#355a49]"
              >
                <ShoppingBag size={14} /> Add
              </button>
            )}
            {onSendAsGift && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSendAsGift(product);
                }}
                className="flex-1 min-h-[40px] border border-[#C35F33] text-[#C35F33] text-xs font-medium rounded-full flex items-center justify-center gap-1.5 hover:bg-[#C35F33] hover:text-white"
              >
                <Gift size={14} /> Gift
              </button>
            )}
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
