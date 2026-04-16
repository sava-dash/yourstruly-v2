'use client';

import { Loader2, SearchX } from 'lucide-react';
import ProductCard, { type ProductCardMode } from './ProductCard';
import BrandCard from './BrandCard';
import type { BrandCard as BrandCardData, MarketplaceProduct } from './types';

export type GridItem =
  | { kind: 'product'; product: MarketplaceProduct }
  | { kind: 'brand'; brand: BrandCardData }
  | { kind: 'hero'; href: string; title: string; subtitle: string; image?: string };

interface ProductGridProps {
  items: GridItem[];
  isLoading?: boolean;
  compact?: boolean;
  /** Passed through to each ProductCard. */
  mode?: ProductCardMode;
  onAddToCart?: (p: MarketplaceProduct) => void;
  onSendAsGift?: (p: MarketplaceProduct) => void;
  onSelectProduct?: (p: MarketplaceProduct) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function ProductGrid({
  items,
  isLoading,
  compact,
  mode,
  onAddToCart,
  onSendAsGift,
  onSelectProduct,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Try a different category or clear your filters.',
}: ProductGridProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#406A56]/10 overflow-hidden"
          >
            <div className="aspect-square bg-[#F2F1E5] animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#F2F1E5]/40 rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-[#D3E1DF] flex items-center justify-center mb-4">
          <SearchX size={28} className="text-[#406A56]" />
        </div>
        <h3
          className="text-xl font-semibold text-[#2d2d2d] mb-1"
          style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
        >
          {emptyTitle}
        </h3>
        <p className="text-sm text-[#666] text-center max-w-sm">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {items.map((item, idx) => {
        if (item.kind === 'product') {
          return (
            <ProductCard
              key={`p-${item.product.id}`}
              product={item.product}
              compact={compact}
              mode={mode}
              onAddToCart={onAddToCart}
              onSendAsGift={onSendAsGift}
              onSelect={onSelectProduct}
            />
          );
        }
        if (item.kind === 'brand') {
          return <BrandCard key={`b-${item.brand.slug}`} brand={item.brand} />;
        }
        return <HeroCard key={`h-${idx}`} item={item} />;
      })}
      {isLoading && items.length > 0 && (
        <div className="col-span-full flex justify-center py-4">
          <Loader2 className="animate-spin text-[#406A56]" size={20} />
        </div>
      )}
    </div>
  );
}

function HeroCard({
  item,
}: {
  item: Extract<GridItem, { kind: 'hero' }>;
}) {
  return (
    <a
      href={item.href}
      className="group relative rounded-2xl overflow-hidden bg-[#406A56] text-white min-h-[280px] flex items-end p-6 md:col-span-2"
      style={{
        backgroundImage: item.image
          ? `linear-gradient(180deg, rgba(64,106,86,0.2) 0%, rgba(64,106,86,0.85) 100%), url(${item.image})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div>
        <h3
          className="text-2xl md:text-3xl font-semibold leading-tight"
          style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
        >
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-white/90 max-w-md">{item.subtitle}</p>
        <span className="mt-3 inline-block text-sm underline underline-offset-4">
          Shop now →
        </span>
      </div>
    </a>
  );
}
