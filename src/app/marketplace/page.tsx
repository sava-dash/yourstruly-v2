'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, ShoppingBag, X, Loader2, Mail } from 'lucide-react';

import CategoryRail, { findCategoryBySlug } from '@/components/marketplace/CategoryRail';
import ScopePills from '@/components/marketplace/ScopePills';
import FilterRow from '@/components/marketplace/FilterRow';
import ProductGrid, { type GridItem } from '@/components/marketplace/ProductGrid';
import CategoryHero from '@/components/marketplace/CategoryHero';
import PostScriptCreditsSection from '@/components/marketplace/PostScriptCreditsSection';
import MarketplacePanel from '@/components/marketplace/MarketplacePanel';
import CartPanel from '@/components/marketplace/CartPanel';
import { useCart } from '@/lib/marketplace/useCart';
import type {
  BrandCard as BrandCardData,
  CategoryNode,
  CategoryTab,
  MarketplaceProduct,
  MarketplaceScope,
  MarketplaceView,
} from '@/components/marketplace/types';
import {
  PRINTS_CATEGORY_SLUGS,
  SLUG_TO_PRODIGI_CATEGORY,
  prodigiProductToMarketplace,
} from '@/components/marketplace/types';

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-backed state
  const [tab, setTab] = useState<CategoryTab>(
    (searchParams.get('tab') as CategoryTab) || 'categories'
  );
  const [scope, setScope] = useState<MarketplaceScope>(
    (searchParams.get('scope') as MarketplaceScope) || 'all'
  );
  const [view, setView] = useState<MarketplaceView>(
    (searchParams.get('view') as MarketplaceView) || 'products'
  );
  const [category, setCategory] = useState<string | undefined>(
    searchParams.get('category') || undefined
  );
  const [childCategory, setChildCategory] = useState<string | undefined>(
    searchParams.get('child') || undefined
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [priceMin, setPriceMin] = useState(Number(searchParams.get('priceMin') || 0));
  const [priceMax, setPriceMax] = useState(Number(searchParams.get('priceMax') || 500));
  const [valueFilter, setValueFilter] = useState(searchParams.get('value') || '');

  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [brands, setBrands] = useState<BrandCardData[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);

  // Cart
  const cart = useCart();
  const [showCart, setShowCart] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);

  // Slide-out panel state
  const [panelBrandSlug, setPanelBrandSlug] = useState<string | null>(null);
  const [panelProductId, setPanelProductId] = useState<string | null>(null);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'categories') params.set('tab', tab);
    if (scope !== 'all') params.set('scope', scope);
    if (view !== 'products') params.set('view', view);
    if (category) params.set('category', category);
    if (childCategory) params.set('child', childCategory);
    if (search) params.set('search', search);
    if (priceMin > 0) params.set('priceMin', String(priceMin));
    if (priceMax < 500) params.set('priceMax', String(priceMax));
    if (valueFilter) params.set('value', valueFilter);
    const qs = params.toString();
    router.replace(qs ? `/marketplace?${qs}` : '/marketplace', { scroll: false });
  }, [tab, scope, view, category, childCategory, search, priceMin, priceMax, valueFilter, router]);

  // Fetch category tree for hero
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/marketplace/categories?tab=${tab}`)
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => {
        if (!cancelled) setCategoryTree(data.categories || []);
      })
      .catch(() => !cancelled && setCategoryTree([]));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Check for credits=purchased query param (Stripe return)
  const creditsPurchased = searchParams.get('credits') === 'purchased';

  const isCreditsScope = scope === 'postscript_credits';

  // Fetch products — switches to Prodigi provider when a prints category is active
  useEffect(() => {
    if (view !== 'products' || isCreditsScope) return;
    let cancelled = false;
    setLoading(true);

    const effectiveCategory = childCategory || category;
    const isPrints = !!effectiveCategory && PRINTS_CATEGORY_SLUGS.has(effectiveCategory);

    if (isPrints) {
      // Prodigi provider mode via legacy route
      const qs = new URLSearchParams();
      qs.set('provider', 'prodigi');
      const prodigiCat = SLUG_TO_PRODIGI_CATEGORY[effectiveCategory];
      if (prodigiCat) qs.set('category', prodigiCat);
      if (search) qs.set('search', search);
      qs.set('perPage', '48');
      fetch(`/api/marketplace/products?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((data) => {
          if (!cancelled) {
            const raw: Array<{
              id: string; name: string; description: string; price: number;
              currency: string; images: string[]; category?: string;
              inStock: boolean; brand?: string; providerData?: Record<string, unknown>;
            }> = data.products || [];
            setProducts(raw.map(prodigiProductToMarketplace));
          }
        })
        .catch(() => !cancelled && setProducts([]))
        .finally(() => !cancelled && setLoading(false));
    } else {
      // Standard Goody / DB mode
      const qs = new URLSearchParams();
      qs.set('scope', scope);
      if (effectiveCategory) qs.set('category', effectiveCategory);
      if (search) qs.set('search', search);
      qs.set('perPage', '48');
      fetch(`/api/marketplace/products?${qs.toString()}`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((data) => {
          if (!cancelled) setProducts(data.products || []);
        })
        .catch(() => !cancelled && setProducts([]))
        .finally(() => !cancelled && setLoading(false));
    }

    return () => {
      cancelled = true;
    };
  }, [view, scope, category, childCategory, search, isCreditsScope]);

  // Fetch brands
  useEffect(() => {
    if (view !== 'brands' || isCreditsScope) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('scope', scope); // always send — API treats 'all' as no-filter
    const effectiveCategory = childCategory || category;
    if (effectiveCategory) qs.set('category', effectiveCategory);
    fetch(`/api/marketplace/brands?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : { brands: [] }))
      .then((data) => {
        if (!cancelled) setBrands(data.brands || []);
      })
      .catch(() => !cancelled && setBrands([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [view, scope, category, childCategory, isCreditsScope]);

  const handleTabChange = useCallback((t: CategoryTab) => {
    setTab(t);
    setCategory(undefined);
    setChildCategory(undefined);
  }, []);

  const handleSelectCategory = useCallback((slug: string | undefined) => {
    setCategory(slug);
    setChildCategory(undefined);
    setMobileCatsOpen(false);
  }, []);

  const handlePriceChange = useCallback((min: number, max: number) => {
    setPriceMin(min);
    setPriceMax(max);
  }, []);

  // Filter: price (client-side on startingPriceCents) + values (cosmetic)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const priceDollars = Math.round(p.startingPriceCents / 100);
      if (priceDollars < priceMin) return false;
      if (priceMax < 500 && priceDollars > priceMax) return false;
      // Values filter: gracefully no-op when data missing
      if (valueFilter && p.values && p.values.length > 0 && !p.values.includes(valueFilter)) {
        return false;
      }
      return true;
    });
  }, [products, priceMin, priceMax, valueFilter]);

  const currentCategory = useMemo(
    () => (category ? findCategoryBySlug(categoryTree, category) : null),
    [categoryTree, category]
  );

  const gridItems: GridItem[] = useMemo(() => {
    const items: GridItem[] = [];
    // Hero card for "All Gifts, no search, no filter" on products view
    if (
      view === 'products' &&
      scope === 'all' &&
      !category &&
      !search &&
      filteredProducts.length > 0
    ) {
      items.push({
        kind: 'hero',
        href: '/marketplace?scope=gift_of_choice',
        title: 'Treat them to a Gift of Choice',
        subtitle:
          'Let them pick something they love. Physical gifts and select digital gifts, curated by us.',
        image: filteredProducts[0]?.images[0] || undefined,
      });
    }
    if (view === 'brands') {
      items.push(...brands.map((b) => ({ kind: 'brand' as const, brand: b })));
    } else {
      const productItems = filteredProducts.map((p) => ({ kind: 'product' as const, product: p }));
      // Insert promo card at position 3 (4th slot) when not in credits scope
      if (!isCreditsScope && productItems.length > 3) {
        items.push(...productItems.slice(0, 3));
        items.push({
          kind: 'hero' as const,
          href: '/marketplace?scope=postscript_credits',
          title: 'Need PostScript credits?',
          subtitle: 'Trade XP or buy a pack to send heartfelt messages.',
        });
        items.push(...productItems.slice(3));
      } else {
        items.push(...productItems);
      }
    }
    return items;
  }, [view, scope, category, search, filteredProducts, brands, isCreditsScope]);

  const handleAddToCart = useCallback(
    (p: MarketplaceProduct) => {
      cart.add(p);
      // Toast feedback
      setAddedToast(true);
      setBadgeBounce(true);
      setTimeout(() => setAddedToast(false), 1500);
      setTimeout(() => setBadgeBounce(false), 600);
    },
    [cart],
  );

  const handleSelectProduct = useCallback((p: MarketplaceProduct) => {
    setPanelProductId(p.id);
    setPanelBrandSlug(null);
  }, []);

  const handleSelectBrand = useCallback((b: BrandCardData) => {
    setPanelBrandSlug(b.slug);
    setPanelProductId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelBrandSlug(null);
    setPanelProductId(null);
  }, []);


  return (
    <div className="min-h-screen bg-[#F2F1E5]">
      {/* Header */}
      <header className="bg-white border-b border-[#406A56]/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-3">
            <h1
              className="text-2xl font-semibold text-[#406A56]"
              style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              Marketplace
            </h1>
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-full hover:bg-[#D3E1DF]/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Cart"
            >
              <ShoppingBag size={22} className="text-[#406A56]" />
              {cart.count > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C35F33] text-white text-[10px] font-bold rounded-full flex items-center justify-center${
                    badgeBounce ? ' animate-bounce' : ''
                  }`}
                >
                  {cart.count}
                </span>
              )}
            </button>

            {/* "Added to cart" toast */}
            {addedToast && (
              <div
                className="absolute top-full right-0 mt-2 whitespace-nowrap bg-[#406A56] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 z-20 fade-in"
              >
                <Check size={12} /> Added to cart
              </div>
            )}
          </div>
        </div>

        {/* Scope pills row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <ScopePills scope={scope} onChange={setScope} />
        </div>
      </header>

      {/* Credits purchased banner */}
      {creditsPurchased && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium bg-[#406A56]/10 text-[#406A56] border border-[#406A56]/20">
            <Mail size={16} />
            Credits added to your account!
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Left rail — desktop (hidden for credits scope) */}
          {!isCreditsScope && (
            <div className="hidden lg:block w-60 flex-shrink-0">
              <div className="sticky top-40 max-h-[calc(100vh-10rem)] overflow-y-auto pb-8">
                <CategoryRail
                  tab={tab}
                  onTabChange={handleTabChange}
                  selectedSlug={category}
                  onSelect={handleSelectCategory}
                />
              </div>
            </div>
          )}

          {/* Main column */}
          <main className="flex-1 min-w-0">
            {isCreditsScope ? (
              <PostScriptCreditsSection />
            ) : (
              <>
                {/* Filter row */}
                <div className="mb-5">
                  <FilterRow
                    view={view}
                    onViewChange={setView}
                    priceMin={priceMin}
                    priceMax={priceMax}
                    onPriceChange={handlePriceChange}
                    search={search}
                    onSearchChange={setSearch}
                    onOpenMobileCategories={() => setMobileCatsOpen(true)}
                  />
                </div>

                {/* Category hero */}
                {currentCategory && (
                  <CategoryHero
                    category={currentCategory}
                    selectedChildSlug={childCategory}
                    onSelectChild={(slug) => setChildCategory(slug)}
                  />
                )}

                {/* Count */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[#666]">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" /> Loading
                      </span>
                    ) : view === 'brands' ? (
                      `${brands.length} brand${brands.length === 1 ? '' : 's'}`
                    ) : (
                      `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`
                    )}
                  </p>
                </div>

                <ProductGrid
                  items={gridItems}
                  isLoading={loading}
                  onAddToCart={handleAddToCart}
                  onSelectProduct={handleSelectProduct}
                  onSelectBrand={handleSelectBrand}
                  emptyTitle={view === 'brands' ? 'No brands match' : 'No gifts match'}
                  emptyDescription="Try a different category, scope, or clear your filters."
                />
              </>
            )}
          </main>
        </div>
      </div>

      {/* Slide-out panel for brand / product detail */}
      <MarketplacePanel
        brandSlug={panelBrandSlug}
        productId={panelProductId}
        onClose={handleClosePanel}
        onAddToCart={handleAddToCart}
      />

      {/* Cart slide-out panel */}
      <CartPanel
        open={showCart}
        items={cart.items}
        total={cart.total}
        onClose={() => setShowCart(false)}
        onRemove={cart.remove}
        onUpdateQty={cart.updateQty}
        onClear={cart.clear}
      />

      {/* Mobile categories drawer */}
      {mobileCatsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileCatsOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white overflow-y-auto p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-semibold text-[#406A56]"
                style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
              >
                Browse
              </h2>
              <button
                onClick={() => setMobileCatsOpen(false)}
                className="p-2 rounded-full hover:bg-[#D3E1DF]/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <CategoryRail
              tab={tab}
              onTabChange={handleTabChange}
              selectedSlug={category}
              onSelect={handleSelectCategory}
            />
          </div>
        </div>
      )}
    </div>
  );
}
