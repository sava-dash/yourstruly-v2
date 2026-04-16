'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';

import ProductCard from './ProductCard';
import type { MarketplaceProduct } from './types';
import { formatCents } from './types';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface BrandMeta {
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  shippingPriceCents: number | null;
  freeShippingMinCents: number | null;
  brandValues: string[];
}

interface HistoryEntry {
  kind: 'brand' | 'product';
  brandSlug?: string;
  productId?: string;
  brandName?: string;
}

interface MarketplacePanelProps {
  brandSlug: string | null;
  productId: string | null;
  onClose: () => void;
  onAddToCart?: (product: MarketplaceProduct) => void;
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function MarketplacePanel({
  brandSlug,
  productId,
  onClose,
  onAddToCart,
}: MarketplacePanelProps) {
  const isOpen = !!(brandSlug || productId);

  /* internal navigation stack */
  const [stack, setStack] = useState<HistoryEntry[]>([]);
  const current = stack[stack.length - 1] ?? null;

  /* data */
  const [brandMeta, setBrandMeta] = useState<BrandMeta | null>(null);
  const [brandProducts, setBrandProducts] = useState<MarketplaceProduct[]>([]);
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);

  /* Reset stack when external props change */
  useEffect(() => {
    if (brandSlug) {
      setStack([{ kind: 'brand', brandSlug }]);
    } else if (productId) {
      setStack([{ kind: 'product', productId }]);
    } else {
      setStack([]);
    }
  }, [brandSlug, productId]);

  /* Fetch brand data */
  useEffect(() => {
    if (current?.kind !== 'brand' || !current.brandSlug) return;
    let cancelled = false;
    setLoading(true);
    setBrandMeta(null);
    setBrandProducts([]);

    Promise.all([
      fetch(`/api/marketplace/brands/${encodeURIComponent(current.brandSlug)}`).then(
        (r) => (r.ok ? r.json() : { brand: null }),
      ),
      fetch(
        `/api/marketplace/products?brand=${encodeURIComponent(current.brandSlug)}&perPage=50`,
      ).then((r) => (r.ok ? r.json() : { products: [] })),
    ])
      .then(([brandData, productsData]) => {
        if (cancelled) return;
        setBrandMeta(brandData.brand ?? null);
        setBrandProducts(productsData.products ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setBrandMeta(null);
          setBrandProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [current?.kind, current?.brandSlug]);

  /* Fetch product data */
  useEffect(() => {
    if (current?.kind !== 'product' || !current.productId) return;
    let cancelled = false;
    setLoading(true);
    setProduct(null);
    setActiveImg(0);

    fetch(`/api/marketplace/products/${encodeURIComponent(current.productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setProduct(data?.product ?? null);
      })
      .catch(() => { if (!cancelled) setProduct(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [current?.kind, current?.productId]);

  /* Scroll panel to top on navigation */
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [current]);

  /* Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* Navigation helpers */
  const goToProduct = useCallback(
    (p: MarketplaceProduct) => {
      const entry: HistoryEntry = {
        kind: 'product',
        productId: p.id,
        brandName: p.brand ?? undefined,
      };
      setStack((prev) => [...prev, entry]);
    },
    [],
  );

  const goToBrand = useCallback((slug: string) => {
    setStack((prev) => [...prev, { kind: 'brand', brandSlug: slug }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const canGoBack = stack.length > 1;

  /* Shipping label */
  const shippingLabel = useMemo(() => {
    if (!brandMeta) return null;
    if (brandMeta.shippingPriceCents === 0) return 'Free shipping';
    if (brandMeta.freeShippingMinCents != null) {
      return `Free shipping over $${Math.round(brandMeta.freeShippingMinCents / 100)}`;
    }
    if (brandMeta.shippingPriceCents != null) {
      return `$${(brandMeta.shippingPriceCents / 100).toFixed(0)} shipping`;
    }
    return 'Free shipping available';
  }, [brandMeta]);

  /* Product price */
  const priceLabel = useMemo(() => {
    if (!product) return '';
    const hasVariants =
      product.startingPriceCents !== product.basePriceCents &&
      product.startingPriceCents < product.basePriceCents;
    return hasVariants
      ? `${formatCents(product.startingPriceCents)}+`
      : formatCents(product.salePriceCents ?? product.basePriceCents);
  }, [product]);

  const images = product?.images ?? [];

  /* Back label */
  const backLabel = useMemo(() => {
    if (!canGoBack) return null;
    const prev = stack[stack.length - 2];
    if (prev.kind === 'brand') {
      return `Back to ${prev.brandSlug?.replace(/-/g, ' ') ?? 'brand'}`;
    }
    return 'Back';
  }, [canGoBack, stack]);

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="panel-overlay"
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel-drawer"
            className="fixed right-0 top-0 h-full w-[90vw] max-w-5xl bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#406A56]/10 shrink-0">
              <div className="flex items-center gap-3">
                {canGoBack && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1 text-sm text-[#406A56] hover:underline min-h-[44px]"
                  >
                    <ArrowLeft size={16} /> {backLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[#D3E1DF]/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div ref={panelRef} className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-[#406A56]" />
                </div>
              )}

              {!loading && current?.kind === 'brand' && (
                <BrandView
                  brandMeta={brandMeta}
                  products={brandProducts}
                  slug={current.brandSlug ?? ''}
                  shippingLabel={shippingLabel}
                  onSelectProduct={goToProduct}
                />
              )}

              {!loading && current?.kind === 'product' && product && (
                <ProductDetailView
                  product={product}
                  images={images}
                  activeImg={activeImg}
                  setActiveImg={setActiveImg}
                  priceLabel={priceLabel}
                  onBrandClick={goToBrand}
                />
              )}

              {!loading && current?.kind === 'product' && !product && (
                <div className="flex flex-col items-center justify-center py-20 text-[#666]">
                  <ShoppingBag size={48} className="text-[#406A56]/20 mb-4" />
                  <p>Product not found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Brand View ───────────────────────────────────────────────────────── */

function BrandView({
  brandMeta,
  products,
  slug,
  shippingLabel,
  onSelectProduct,
}: {
  brandMeta: BrandMeta | null;
  products: MarketplaceProduct[];
  slug: string;
  shippingLabel: string | null;
  onSelectProduct: (p: MarketplaceProduct) => void;
}) {
  const displayName = brandMeta?.name ?? slug.replace(/-/g, ' ');

  return (
    <div className="p-5 sm:p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {brandMeta?.logoUrl ? (
          <div className="w-16 h-16 rounded-lg bg-white border border-[#406A56]/10 flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src={brandMeta.logoUrl}
              alt={`${displayName} logo`}
              width={64}
              height={64}
              className="object-contain p-1"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-white border border-[#406A56]/15 flex items-center justify-center shrink-0">
            <Package size={24} className="text-[#406A56]" />
          </div>
        )}
        <div className="min-w-0">
          <h2
            className="text-[28px] font-semibold text-[#406A56] leading-tight"
            style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
          >
            {displayName}
          </h2>
          {brandMeta?.description && (
            <p className="mt-2 text-sm text-[#666] leading-relaxed max-w-lg">
              {brandMeta.description}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {shippingLabel && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D3E1DF] text-[#406A56] text-xs font-medium">
            <Truck size={12} /> {shippingLabel}
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-[#406A56]/20 text-[#2d2d2d] text-xs font-medium">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </span>
        {brandMeta?.brandValues?.map((val) => (
          <span
            key={val}
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#D3E1DF]/50 text-[#406A56] text-xs font-medium"
          >
            {val}
          </span>
        ))}
      </div>

      {/* Product grid (3-col) */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-[#666]">
          <ShoppingBag size={48} className="text-[#406A56]/20 mb-4" />
          <p className="text-sm">No products found for this brand.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              compact
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Product Detail View ──────────────────────────────────────────────── */

function ProductDetailView({
  product,
  images,
  activeImg,
  setActiveImg,
  priceLabel,
  onBrandClick,
}: {
  product: MarketplaceProduct;
  images: string[];
  activeImg: number;
  setActiveImg: (i: number) => void;
  priceLabel: string;
  onBrandClick: (slug: string) => void;
}) {
  const isBestSeller = product.scope.includes('best_seller');
  const isPersonalized = product.scope.includes('personalized');
  const isGiftOfChoice = product.scope.includes('gift_of_choice');

  return (
    <div className="p-5 sm:p-8">
      {/* Hero image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2F1E5] border border-[#406A56]/10 max-w-xl mx-auto">
        {images[activeImg] ? (
          <Image
            src={images[activeImg]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 90vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={64} className="text-[#406A56]/20" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto max-w-xl mx-auto pb-1">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImg(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                activeImg === i
                  ? 'border-[#406A56]'
                  : 'border-transparent hover:border-[#406A56]/30'
              }`}
            >
              <Image
                src={img}
                alt={`${product.name} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 max-w-xl mx-auto">
        {/* Brand tag */}
        {product.brand && (
          <button
            type="button"
            onClick={() => product.brandSlug && onBrandClick(product.brandSlug)}
            className={`text-xs uppercase tracking-widest mb-2 block ${
              product.brandSlug
                ? 'text-[#406A56] hover:underline cursor-pointer'
                : 'text-[#666] cursor-default'
            }`}
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            disabled={!product.brandSlug}
          >
            {product.brand}
          </button>
        )}

        <h2
          className="text-2xl font-semibold text-[#2d2d2d] leading-tight"
          style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
        >
          {product.name}
        </h2>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {isBestSeller && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#C35F33] text-white text-xs font-medium rounded-full">
              <Sparkles size={12} /> Best Seller
            </span>
          )}
          {isPersonalized && (
            <span className="inline-flex items-center px-3 py-1 bg-[#406A56] text-white text-xs font-medium rounded-full">
              Personalized
            </span>
          )}
          {isGiftOfChoice && (
            <span className="inline-flex items-center px-3 py-1 bg-white text-[#406A56] text-xs font-medium rounded-full border border-[#406A56]/20">
              Gift of Choice
            </span>
          )}
        </div>

        {/* Price */}
        <p className="text-3xl font-bold text-[#406A56] mt-4">{priceLabel}</p>

        {/* Description */}
        {product.description && (
          <div className="mt-4 text-sm text-[#444] leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        )}

        {/* Why we love it */}
        {product.whyWeLoveIt && (
          <div className="mt-4 p-4 rounded-xl bg-[#F2F1E5] border border-[#406A56]/10">
            <p
              className="text-sm font-semibold text-[#406A56] mb-1"
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              Why we love it
            </p>
            <p className="text-sm text-[#444] leading-relaxed">
              {product.whyWeLoveIt}
            </p>
          </div>
        )}

        {/* Add to Cart */}
        <button
          type="button"
          onClick={() => onAddToCart?.(product)}
          className="mt-6 w-full min-h-[52px] bg-[#406A56] text-white text-base font-medium rounded-full flex items-center justify-center gap-2 hover:bg-[#355a49] transition-colors"
        >
          <ShoppingBag size={18} /> Add to Cart
        </button>

        {/* Emotional impact */}
        {product.emotionalImpact && (
          <p className="mt-3 text-center text-xs text-[#666]">
            {product.emotionalImpact}
          </p>
        )}
      </div>
    </div>
  );
}
