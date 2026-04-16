'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Sparkles,
  BookOpen,
} from 'lucide-react';

import ProductCard from '@/components/marketplace/ProductCard';
import type { MarketplaceProduct } from '@/components/marketplace/types';
import { formatCents } from '@/components/marketplace/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [related, setRelated] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  // Fetch product
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/marketplace/products/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.product) {
          if (!cancelled) setProduct(null);
          return;
        }
        const p = data.product as MarketplaceProduct;
        setProduct(p);

        // Fetch related products (same category or brand)
        const cat = p.categories?.[0];
        const qs = cat
          ? `category=${encodeURIComponent(cat)}&perPage=5`
          : p.brandSlug
            ? `brand=${encodeURIComponent(p.brandSlug)}&perPage=5`
            : 'scope=all&perPage=5';

        fetch(`/api/marketplace/products?${qs}`)
          .then((r2) => (r2.ok ? r2.json() : { products: [] }))
          .then((d2) => {
            if (!cancelled) {
              const others = (d2.products || []).filter(
                (r: MarketplaceProduct) => r.id !== p.id,
              );
              setRelated(others.slice(0, 4));
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasVariants = product
    ? product.startingPriceCents !== product.basePriceCents &&
      product.startingPriceCents < product.basePriceCents
    : false;

  const priceLabel = product
    ? hasVariants
      ? `${formatCents(product.startingPriceCents)}+`
      : formatCents(product.salePriceCents ?? product.basePriceCents)
    : '';

  const images = product?.images ?? [];
  const isBestSeller = product?.scope.includes('best_seller');
  const isPersonalized = product?.scope.includes('personalized');
  const isGiftOfChoice = product?.scope.includes('gift_of_choice');

  const breadcrumbCategory = product?.categories?.[0]?.replace(/-/g, ' ') ?? 'All';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F1E5] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#406A56]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F2F1E5] flex flex-col items-center justify-center gap-4">
        <p className="text-[#666] text-lg">Product not found.</p>
        <Link
          href="/marketplace"
          className="text-[#406A56] underline underline-offset-4"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F1E5]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#406A56]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/marketplace')}
            className="flex items-center gap-1 text-[#406A56] hover:underline min-h-[44px]"
          >
            <ArrowLeft size={16} /> Marketplace
          </button>
          <span className="text-gray-300">&rsaquo;</span>
          <Link
            href={`/marketplace?category=${product.categories?.[0] || ''}`}
            className="text-[#406A56] hover:underline capitalize"
          >
            {breadcrumbCategory}
          </Link>
          <span className="text-gray-300">&rsaquo;</span>
          <span className="text-[#2d2d2d] line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image gallery */}
          <div>
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#406A56]/10">
              {images[activeImg] ? (
                <Image
                  src={images[activeImg]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
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
              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                      activeImg === i
                        ? 'border-[#406A56]'
                        : 'border-transparent hover:border-[#406A56]/30'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="flex flex-col">
            {/* Brand tag */}
            {product.brand && (
              <p
                className="text-xs uppercase tracking-widest text-[#666] mb-2"
                style={{
                  fontFamily:
                    'var(--font-inter-tight, Inter Tight, sans-serif)',
                }}
              >
                {product.brand}
              </p>
            )}

            <h1
              className="text-[28px] leading-tight font-semibold text-[#2d2d2d] mb-4"
              style={{
                fontFamily:
                  'var(--font-playfair, Playfair Display, serif)',
              }}
            >
              {product.name}
            </h1>

            {/* Scope badges */}
            <div className="flex flex-wrap gap-2 mb-4">
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
            <p className="text-3xl font-bold text-[#406A56] mb-6">
              {priceLabel}
            </p>

            {/* Description */}
            {product.description && (
              <div className="mb-6 text-[#444] text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            )}

            {/* Why we love it */}
            {product.whyWeLoveIt && (
              <div className="mb-6 p-4 rounded-xl bg-white border border-[#406A56]/10">
                <p
                  className="text-sm font-semibold text-[#406A56] mb-1"
                  style={{
                    fontFamily:
                      'var(--font-inter-tight, Inter Tight, sans-serif)',
                  }}
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
              className="mt-auto w-full min-h-[52px] bg-[#406A56] text-white text-base font-medium rounded-full flex items-center justify-center gap-2 hover:bg-[#355a49] transition-colors"
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

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2
              className="text-2xl font-semibold text-[#2d2d2d] mb-6"
              style={{
                fontFamily:
                  'var(--font-playfair, Playfair Display, serif)',
              }}
            >
              You may also like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
