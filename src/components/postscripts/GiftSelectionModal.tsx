'use client'

/**
 * Gift selection modal for the PostScript creation flow.
 *
 * Uses shared marketplace components (ProductGrid, ScopePills) so UI fixes
 * flow both ways. Gift of Choice flex-amount flow is in GiftOfChoicePicker.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X, Gift, Search, Calendar, Clock, Sparkles, Loader2,
  CheckCircle2, AlertCircle, DollarSign
} from 'lucide-react'

import ProductGrid from '@/components/marketplace/ProductGrid'
import type { GridItem } from '@/components/marketplace/ProductGrid'
import ScopePills from '@/components/marketplace/ScopePills'
import type { MarketplaceProduct, MarketplaceScope, ProductsResponse } from '@/components/marketplace/types'
import GiftOfChoicePicker, { GiftOfChoiceFooter } from './GiftOfChoicePicker'

// ---------------------------------------------------------------------------
// Public types — kept for backward compatibility with postscripts/new/page
// ---------------------------------------------------------------------------

export type ProductProvider = 'floristone' | 'doba' | 'printful' | 'goody'

export interface GiftProduct {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  currency: string
  images: string[]
  thumbnail: string
  provider: ProductProvider
  category?: string
  inStock: boolean
  brandName?: string
  allowShipping?: boolean
  allowGifting?: boolean
  tags?: string[]
  isBestseller?: boolean
  isNew?: boolean
  variants?: Array<{
    id: string
    name: string
    price: number
    inStock: boolean
  }>
}

export interface GiftSelection {
  product?: GiftProduct
  variantId?: string
  quantity: number
  deliveryTiming: 'with_postscript' | 'specific_date' | 'relative_event'
  deliveryDate?: string
  deliveryEvent?: string
  deliveryOffsetDays?: number
  giftType: 'product' | 'choice'
  flexGiftAmount?: number
  cartItems?: { product: GiftProduct; qty: number }[]
}

interface GiftSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selection: GiftSelection) => void
  preselectedContactId?: string
  preselectedContactName?: string
  deliveryDate?: string
  deliveryType?: 'date' | 'event' | 'after_passing'
  context?: {
    eventType?: string
    relationship?: string
    budget?: { min: number; max: number }
  }
}

// ---------------------------------------------------------------------------
// Delivery timing constants
// ---------------------------------------------------------------------------

const TIMING_OPTIONS = [
  { key: 'with_postscript', label: 'With Message', description: 'Gift delivered at the same time as your PostScript', icon: Clock },
  { key: 'specific_date', label: 'Specific Date', description: 'Choose a specific calendar date for delivery', icon: Calendar },
  { key: 'relative_event', label: 'Special Occasion', description: 'Deliver for holidays or life events', icon: Sparkles },
]

const HOLIDAY_OPTIONS = [
  { key: 'christmas', label: 'Christmas', icon: '\uD83C\uDF84' },
  { key: 'easter', label: 'Easter', icon: '\uD83D\uDC30' },
  { key: 'thanksgiving', label: 'Thanksgiving', icon: '\uD83E\uDD83' },
  { key: 'mothers_day', label: "Mother's Day", icon: '\uD83D\uDC90' },
  { key: 'fathers_day', label: "Father's Day", icon: '\uD83D\uDC54' },
  { key: 'valentines', label: "Valentine's Day", icon: '\u2764\uFE0F' },
]

const EVENT_OPTIONS = [
  { key: 'birthday', label: 'Birthday', icon: '\uD83C\uDF82' },
  { key: 'anniversary', label: 'Anniversary', icon: '\uD83D\uDC95' },
  { key: 'wedding', label: 'Wedding', icon: '\uD83D\uDC92' },
  { key: 'graduation', label: 'Graduation', icon: '\uD83C\uDF93' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert MarketplaceProduct → legacy GiftProduct (for the onSelect callback). */
function toGiftProduct(mp: MarketplaceProduct): GiftProduct {
  return {
    id: mp.id,
    name: mp.name,
    description: mp.description || '',
    price: (mp.salePriceCents ?? mp.basePriceCents) / 100,
    originalPrice: mp.salePriceCents ? mp.basePriceCents / 100 : undefined,
    currency: 'USD',
    images: mp.images,
    thumbnail: mp.images[0] || '/placeholder-product.png',
    provider: 'goody' as ProductProvider,
    category: mp.categories[0] || undefined,
    inStock: mp.inStock,
    brandName: mp.brand || undefined,
    isBestseller: mp.scope.includes('best_seller'),
  }
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GiftSelectionModal({
  isOpen,
  onClose,
  onSelect,
  preselectedContactName,
  deliveryDate,
  deliveryType,
}: GiftSelectionModalProps) {
  const isNearTermDelivery = useMemo(() => {
    if (deliveryType === 'after_passing') return false
    if (!deliveryDate) return true
    const delivery = new Date(deliveryDate)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    return delivery <= oneYearFromNow
  }, [deliveryDate, deliveryType])

  // --- State ---
  const [step, setStep] = useState<'browse' | 'flex_amount' | 'configure'>('browse')
  const [selectedMpProduct, setSelectedMpProduct] = useState<MarketplaceProduct | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [flexAmount, setFlexAmount] = useState(50)
  const [deliveryTiming, setDeliveryTiming] = useState<'with_postscript' | 'specific_date' | 'relative_event'>('with_postscript')
  const [giftDeliveryDate, setGiftDeliveryDate] = useState('')
  const [deliveryEvent, setDeliveryEvent] = useState('')
  const [deliveryOffsetDays, setDeliveryOffsetDays] = useState(0)

  // Browse state
  const [scope, setScope] = useState<MarketplaceScope>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mini cart
  const [cart, setCart] = useState<{ product: MarketplaceProduct; qty: number }[]>([])

  const PER_PAGE = 48
  const pageRef = React.useRef(1)
  const fetchVersionRef = React.useRef(0)

  // Debounce search
  useEffect(() => {
    if (localSearch === searchQuery) return
    const id = setTimeout(() => setSearchQuery(localSearch), 300)
    return () => clearTimeout(id)
  }, [localSearch, searchQuery])

  // Fetch products from new API
  useEffect(() => {
    if (!isOpen || step !== 'browse') return
    const version = ++fetchVersionRef.current
    pageRef.current = 1
    setError(null)
    setIsLoading(true)
    setProducts([])

    const qs = new URLSearchParams()
    qs.append('scope', scope) // always send — API treats 'all' as no-filter
    if (searchQuery) qs.append('search', searchQuery)
    qs.append('page', '1')
    qs.append('perPage', PER_PAGE.toString())

    fetch(`/api/marketplace/products?${qs}`)
      .then(r => r.ok ? r.json() as Promise<ProductsResponse> : Promise.reject('Failed'))
      .then(data => {
        if (fetchVersionRef.current !== version) return
        setProducts(data.products || [])
        setHasMore(data.hasMore || false)
      })
      .catch(() => { if (fetchVersionRef.current === version) setError('Failed to load products.') })
      .finally(() => { if (fetchVersionRef.current === version) setIsLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, scope, searchQuery])

  const loadMore = useCallback(async () => {
    if (!hasMore) return
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage

    const qs = new URLSearchParams()
    qs.append('scope', scope) // always send — API treats 'all' as no-filter
    if (searchQuery) qs.append('search', searchQuery)
    qs.append('page', nextPage.toString())
    qs.append('perPage', PER_PAGE.toString())

    try {
      const r = await fetch(`/api/marketplace/products?${qs}`)
      if (!r.ok) throw new Error()
      const data: ProductsResponse = await r.json()
      setProducts(prev => [...prev, ...data.products])
      setHasMore(data.hasMore || false)
    } catch { /* swallow */ }
  }, [hasMore, scope, searchQuery])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('browse')
      setSelectedMpProduct(null)
      setQuantity(1)
      setFlexAmount(50)
      setDeliveryTiming('with_postscript')
      setGiftDeliveryDate('')
      setDeliveryEvent('')
      setDeliveryOffsetDays(0)
      setSearchQuery('')
      setLocalSearch('')
      setScope('all')
      setHasMore(false)
      setCart([])
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // --- Handlers ---

  const handleProductSelect = (mp: MarketplaceProduct) => {
    // Add to cart (multi-gift)
    if (cart.some(c => c.product.id === mp.id)) return
    setCart(prev => [...prev, { product: mp, qty: 1 }])
  }

  const handleSingleProductConfigure = (mp: MarketplaceProduct) => {
    setSelectedMpProduct(mp)
    setStep('configure')
  }

  const handleConfirmFlexGift = async () => {
    setIsConfirming(true)
    const selection: GiftSelection = {
      giftType: 'choice',
      quantity: 1,
      deliveryTiming: 'with_postscript',
      flexGiftAmount: flexAmount,
    }
    await onSelect(selection)
    setIsConfirming(false)
    onClose()
  }

  const handleConfirmProduct = async () => {
    if (!selectedMpProduct) return
    setIsConfirming(true)
    const gp = toGiftProduct(selectedMpProduct)
    const selection: GiftSelection = {
      giftType: 'product',
      product: gp,
      quantity,
      deliveryTiming,
      deliveryDate: giftDeliveryDate || undefined,
      deliveryEvent: deliveryEvent || undefined,
      deliveryOffsetDays: deliveryOffsetDays || undefined,
    }
    await onSelect(selection)
    setIsConfirming(false)
    onClose()
  }

  const handleAttachCart = () => {
    const items = cart.map(c => ({ product: toGiftProduct(c.product), qty: c.qty }))
    const total = items.reduce((s, c) => s + c.product.price * c.qty, 0)
    const selection: GiftSelection = {
      giftType: 'product',
      product: items[0]?.product,
      quantity: items.reduce((s, c) => s + c.qty, 0),
      deliveryTiming: 'with_postscript',
      cartItems: items,
    }
    onSelect(selection)
    onClose()
  }

  // --- Grid items ---

  const gridItems: GridItem[] = products.map(p => ({ kind: 'product' as const, product: p }))

  // --- Render ---

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#C35F33]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C35F33] flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {step === 'browse' && 'Choose a Gift'}
                {step === 'flex_amount' && 'Gift of Choice'}
                {step === 'configure' && 'Configure Gift'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'browse' && (preselectedContactName ? `Choose a gift for ${preselectedContactName}` : 'Choose something special')}
                {preselectedContactName && step !== 'browse' && `For ${preselectedContactName}`}
              </p>
              {!isNearTermDelivery && step === 'browse' && (
                <p className="text-xs text-amber-600 mt-1">
                  For future delivery, we recommend Gift of Choice
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ---- Flex Amount Step ---- */}
          {step === 'flex_amount' && (
            <GiftOfChoicePicker
              flexAmount={flexAmount}
              onFlexAmountChange={setFlexAmount}
              onBack={() => setStep('browse')}
              onConfirm={handleConfirmFlexGift}
              isLoading={isConfirming}
            />
          )}

          {/* ---- Browse Step ---- */}
          {step === 'browse' && (
            <div className="space-y-5">
              {/* Scope pills + search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <ScopePills scope={scope} onChange={setScope} className="flex-shrink-0" />
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search gifts, brands..."
                    className="w-full pl-9 pr-9 min-h-[44px] rounded-full border border-[#406A56]/20 bg-white text-sm focus:outline-none focus:border-[#406A56] focus:ring-2 focus:ring-[#406A56]/20"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => { setLocalSearch(''); setSearchQuery('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Gift of Choice inline card */}
              <button
                onClick={() => { setStep('flex_amount') }}
                className="w-full group text-left bg-gradient-to-br from-[#406A56]/5 to-[#C35F33]/5 border-2 border-dashed border-[#406A56]/20 rounded-xl overflow-hidden hover:border-[#406A56]/40 transition-all flex items-center gap-4 p-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#406A56]/10 flex items-center justify-center group-hover:bg-[#406A56]/20 transition-colors flex-shrink-0">
                  <DollarSign className="w-7 h-7 text-[#406A56]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-0.5">Gift of Choice</h3>
                  <p className="text-xs text-gray-500">Let them pick their own gift &middot; From $25</p>
                </div>
              </button>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Product grid — shared marketplace component */}
              <ProductGrid
                items={gridItems}
                isLoading={isLoading}
                compact
                mode="modal"
                onSelectProduct={handleProductSelect}
                emptyTitle="No gifts found"
                emptyDescription="Try a different scope or clear your search."
              />

              {/* Load more */}
              {hasMore && products.length > 0 && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2 border border-[#406A56] text-[#406A56] rounded-full text-sm font-medium hover:bg-[#406A56] hover:text-white transition-colors min-h-[44px]"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---- Configure Step ---- */}
          {step === 'configure' && selectedMpProduct && (() => {
            const gp = toGiftProduct(selectedMpProduct)
            return (
              <div className="space-y-6">
                {/* Product Summary */}
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <img src={gp.thumbnail} alt={gp.name} className="w-24 h-24 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{gp.name}</h3>
                    {gp.brandName && <p className="text-xs text-gray-400">{gp.brandName}</p>}
                    <p className="text-sm text-gray-500 mb-2">{gp.description}</p>
                    <span className="text-lg font-bold text-[#C35F33]">{formatPrice(gp.price)}</span>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">-</button>
                    <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">+</button>
                  </div>
                </div>

                {/* Delivery Timing — near-term only */}
                {isNearTermDelivery && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">When should this be delivered?</label>
                    <div className="space-y-3">
                      {TIMING_OPTIONS.map(option => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.key}
                            onClick={() => setDeliveryTiming(option.key as typeof deliveryTiming)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all min-h-[44px]
                              ${deliveryTiming === option.key ? 'border-[#C35F33] bg-[#C35F33]/5' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${deliveryTiming === option.key ? 'bg-[#C35F33] text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{option.label}</p>
                              <p className="text-sm text-gray-500">{option.description}</p>
                            </div>
                            {deliveryTiming === option.key && <CheckCircle2 className="w-5 h-5 text-[#C35F33]" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Date */}
                {deliveryTiming === 'specific_date' && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" /> Select Delivery Date
                    </label>
                    <input type="date" value={giftDeliveryDate} onChange={(e) => setGiftDeliveryDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C35F33]/20 focus:border-[#C35F33] outline-none" />
                  </div>
                )}

                {/* Relative Event */}
                {deliveryTiming === 'relative_event' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <Sparkles className="w-4 h-4 inline mr-1" /> Select Occasion
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[...EVENT_OPTIONS, ...HOLIDAY_OPTIONS].map(event => (
                          <button key={event.key} onClick={() => setDeliveryEvent(event.key)}
                            className={`p-3 rounded-lg border text-left transition-all min-h-[44px]
                              ${deliveryEvent === event.key ? 'border-[#C35F33] bg-[#C35F33]/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <span className="text-lg mr-1">{event.icon}</span>
                            <span className="text-sm font-medium">{event.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Timing</label>
                      <div className="flex items-center gap-3">
                        <select value={deliveryOffsetDays} onChange={(e) => setDeliveryOffsetDays(Number(e.target.value))}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C35F33]/20 focus:border-[#C35F33] outline-none">
                          <option value={0}>On the day</option>
                          <option value={-1}>1 day before</option>
                          <option value={-2}>2 days before</option>
                          <option value={-3}>3 days before</option>
                          <option value={1}>1 day after</option>
                          <option value={2}>2 days after</option>
                        </select>
                        <span className="text-sm text-gray-500">of the occasion</span>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={() => setStep('browse')} className="text-[#C35F33] hover:underline text-sm">
                  &larr; Choose a different gift
                </button>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {step === 'browse' && (
            <div className="space-y-2">
              {/* Mini cart */}
              {cart.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {cart.map((item, i) => (
                    <div key={item.product.id} className="flex items-center gap-2 text-sm">
                      <img src={item.product.images[0] || '/placeholder-product.png'} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-gray-800">{item.product.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setCart(prev => prev.map((c, j) => j === i ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}
                          className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200">&minus;</button>
                        <span className="w-5 text-center text-xs font-medium">{item.qty}</span>
                        <button onClick={() => setCart(prev => prev.map((c, j) => j === i ? { ...c, qty: c.qty + 1 } : c))}
                          className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200">+</button>
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-14 text-right">
                        {formatPrice(((item.product.salePriceCents ?? item.product.basePriceCents) / 100) * item.qty)}
                      </span>
                      <button onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                        className="p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  {cart.length > 0 && (
                    <p className="text-sm font-semibold text-gray-800">
                      {cart.length} item{cart.length !== 1 ? 's' : ''} &middot;{' '}
                      {formatPrice(cart.reduce((sum, c) => sum + ((c.product.salePriceCents ?? c.product.basePriceCents) / 100) * c.qty, 0))}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors min-h-[44px]">
                    Cancel
                  </button>
                  {cart.length > 0 && (
                    <button onClick={handleAttachCart}
                      className="px-5 py-2 bg-[#406A56] text-white rounded-lg text-sm font-medium hover:bg-[#355a49] transition-colors flex items-center gap-1.5 min-h-[44px]">
                      <Gift className="w-4 h-4" />
                      Attach {cart.length} gift{cart.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'flex_amount' && (
            <GiftOfChoiceFooter
              flexAmount={flexAmount}
              onBack={() => setStep('browse')}
              onConfirm={handleConfirmFlexGift}
              isLoading={isConfirming}
            />
          )}

          {step === 'configure' && selectedMpProduct && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#C35F33]">
                  {formatPrice(((selectedMpProduct.salePriceCents ?? selectedMpProduct.basePriceCents) / 100) * quantity)}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('browse')} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors min-h-[44px]">
                  Back
                </button>
                <button
                  onClick={handleConfirmProduct}
                  disabled={isConfirming || (deliveryTiming === 'specific_date' && !giftDeliveryDate) || (deliveryTiming === 'relative_event' && !deliveryEvent)}
                  className="px-6 py-2 bg-[#C35F33] text-white rounded-lg font-medium hover:bg-[#a84e2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
                >
                  {isConfirming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                  ) : (
                    <><Gift className="w-4 h-4" /> Attach Gift</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GiftSelectionModal
