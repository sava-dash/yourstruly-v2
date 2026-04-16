'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Truck, Leaf } from 'lucide-react';

import ProductGrid, { type GridItem } from '@/components/marketplace/ProductGrid';
import type { BrandCard as BrandCardData, MarketplaceProduct } from '@/components/marketplace/types';

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string | undefined) || '';

  const [brand, setBrand] = useState<BrandCardData | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/marketplace/products?brand=${encodeURIComponent(slug)}&perPage=100`).then((r) =>
        r.ok ? r.json() : { products: [] }
      ),
      fetch(`/api/marketplace/brands`).then((r) => (r.ok ? r.json() : { brands: [] })),
    ])
      .then(([productsData, brandsData]) => {
        if (cancelled) return;
        setProducts(productsData.products || []);
        const found = (brandsData.brands || []).find(
          (b: BrandCardData) => b.slug === slug
        );
        setBrand(found || null);
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setBrand(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) =>
      p.categories.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)),
    );
    // Only keep categories that have at least 1 product
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name]) => name);
  }, [products]);

  const filtered = useMemo(
    () =>
      activeCategory === 'all'
        ? products
        : products.filter((p) => p.categories.includes(activeCategory)),
    [products, activeCategory]
  );

  const hasSustainable = products.some((p) => p.values?.includes('sustainable'));

  const gridItems: GridItem[] = filtered.map((p) => ({ kind: 'product', product: p }));

  return (
    <div className="min-h-screen bg-[#F2F1E5]">
      {/* Breadcrumb bar */}
      <div className="bg-white border-b border-[#406A56]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/marketplace')}
            className="flex items-center gap-1 text-[#406A56] hover:underline min-h-[44px]"
          >
            <ArrowLeft size={16} /> Marketplace
          </button>
          <span className="text-gray-300">›</span>
          <Link href="/marketplace?view=brands" className="text-[#406A56] hover:underline">
            Brands
          </Link>
          <span className="text-gray-300">›</span>
          <span className="text-[#2d2d2d]">{brand?.name || slug}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1
            className="text-4xl font-semibold text-[#406A56] leading-tight"
            style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
          >
            {brand?.name || 'Brand'}
          </h1>
          {brand?.blurb && (
            <p className="mt-2 text-[#666] max-w-2xl leading-relaxed">{brand.blurb}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D3E1DF] text-[#406A56] text-xs font-medium">
              <Truck size={12} /> Standard shipping
            </span>
            {hasSustainable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D3E1DF] text-[#406A56] text-xs font-medium">
                <Leaf size={12} /> Sustainable
              </span>
            )}
            {brand && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-[#406A56]/20 text-[#2d2d2d] text-xs font-medium">
                {brand.productCount} products
              </span>
            )}
          </div>
        </header>

        {/* Sub-category tabs */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 border-b border-[#406A56]/10 pb-4">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`min-h-[40px] px-4 rounded-full text-sm font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-[#406A56] text-white'
                  : 'text-[#406A56] hover:bg-[#D3E1DF]/50 border border-[#406A56]/20'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.categories.includes(c)).length;
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`min-h-[40px] px-4 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#406A56] text-white'
                      : 'text-[#406A56] hover:bg-[#D3E1DF]/50 border border-[#406A56]/20'
                  }`}
                >
                  {c.replace(/-/g, ' ')} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#406A56]" />
          </div>
        )}

        {/* Product grid */}
        {!loading && (
          <ProductGrid
            items={gridItems}
            emptyTitle="No products here yet"
            emptyDescription="This brand doesn't have products in that category. Try All."
          />
        )}
      </div>
    </div>
  );
}
