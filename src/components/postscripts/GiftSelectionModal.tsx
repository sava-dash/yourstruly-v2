'use client'

// TODO(gift-modal-refactor): This modal still owns its own product-list /
// search / scope logic. PR 2 of the ongoody-IA rebuild introduced shared
// components under `src/components/marketplace/*` (ScopePills, FilterRow,
// ProductGrid, ProductCard, BrandCard). The plan is for this modal to
// mount those shared components in "compact" mode so UI fixes flow both
// ways. Deferring: the modal is 900+ lines with its own GiftProduct type
// and Gift-of-Choice flex-amount flow, and refactoring it in PR 2 risks
// regressing the postscripts/new save flow. Follow-up ticket to come.

import React, { useState, useEffect, useMemo } from 'react'
import { 
  X, Gift, Search, ShoppingBag, Heart, Calendar,
  ChevronRight, Clock, Package, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Store, DollarSign, Flower2
} from 'lucide-react'

// Product provider types
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
  // Gift of Choice fields
  giftType: 'product' | 'choice'
  flexGiftAmount?: number
  // Multi-gift cart (payment deferred to after PostScript save)
  cartItems?: { product: GiftProduct; qty: number }[]
}

interface GiftSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selection: GiftSelection) => void
  preselectedContactId?: string
  preselectedContactName?: string
  deliveryDate?: string  // ISO date string for the PostScript delivery
  deliveryType?: 'date' | 'event' | 'after_passing'
  context?: {
    eventType?: string
    relationship?: string
    budget?: { min: number; max: number }
  }
}

// Gift of Choice amount options
const FLEX_GIFT_AMOUNTS = [
  { value: 25, label: '$25', popular: false },
  { value: 50, label: '$50', popular: true },
  { value: 75, label: '$75', popular: false },
  { value: 100, label: '$100', popular: true },
  { value: 150, label: '$150', popular: false },
  { value: 200, label: '$200', popular: false },
  { value: 250, label: '$250', popular: false },
  { value: 300, label: '$300', popular: false },
]

// Delivery timing options
const TIMING_OPTIONS = [
  {
    key: 'with_postscript',
    label: 'With Message',
    description: 'Gift delivered at the same time as your PostScript',
    icon: Clock
  },
  {
    key: 'specific_date',
    label: 'Specific Date',
    description: 'Choose a specific calendar date for delivery',
    icon: Calendar
  },
  {
    key: 'relative_event',
    label: 'Special Occasion',
    description: 'Deliver for holidays or life events',
    icon: Sparkles
  }
]

// Holiday options for relative delivery
const HOLIDAY_OPTIONS = [
  { key: 'christmas', label: 'Christmas', icon: '🎄' },
  { key: 'easter', label: 'Easter', icon: '🐰' },
  { key: 'thanksgiving', label: 'Thanksgiving', icon: '🦃' },
  { key: 'mothers_day', label: "Mother's Day", icon: '💐' },
  { key: 'fathers_day', label: "Father's Day", icon: '👔' },
  { key: 'valentines', label: "Valentine's Day", icon: '❤️' },
]

// Event options for relative delivery
const EVENT_OPTIONS = [
  { key: 'birthday', label: 'Birthday', icon: '🎂' },
  { key: 'anniversary', label: 'Anniversary', icon: '💕' },
  { key: 'wedding', label: 'Wedding', icon: '💒' },
  { key: 'graduation', label: 'Graduation', icon: '🎓' },
]

// Price ranges
const PRICE_RANGES = [
  { key: 'all', label: 'All Prices', min: 0, max: 10000 },
  { key: 'under50', label: 'Under $50', min: 0, max: 50 },
  { key: '50to100', label: '$50 - $100', min: 50, max: 100 },
  { key: '100to200', label: '$100 - $200', min: 100, max: 200 },
  { key: 'over200', label: '$200+', min: 200, max: 10000 },
]

export function GiftSelectionModal({ 
  isOpen, 
  onClose, 
  onSelect,
  preselectedContactId,
  preselectedContactName,
  deliveryDate,
  deliveryType,
  context
}: GiftSelectionModalProps) {
  // Determine if this is a near-term (within 1 year) or legacy delivery
  const isNearTermDelivery = useMemo(() => {
    if (deliveryType === 'after_passing') return false
    if (!deliveryDate) return true // Default to near-term if no date
    
    const delivery = new Date(deliveryDate)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    return delivery <= oneYearFromNow
  }, [deliveryDate, deliveryType])

  // State
  const [step, setStep] = useState<'choose_type' | 'browse' | 'flex_amount' | 'configure' | 'confirm'>('browse')
  const [giftType, setGiftType] = useState<'product' | 'choice' | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<GiftProduct | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [flexAmount, setFlexAmount] = useState<number>(50)
  const [deliveryTiming, setDeliveryTiming] = useState<'with_postscript' | 'specific_date' | 'relative_event'>('with_postscript')
  const [giftDeliveryDate, setGiftDeliveryDate] = useState('')
  const [deliveryEvent, setDeliveryEvent] = useState('')
  const [deliveryOffsetDays, setDeliveryOffsetDays] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all')
  const [showFlowersOnly, setShowFlowersOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [products, setProducts] = useState<GiftProduct[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  // Mini cart for multiple gift selections
  const [cart, setCart] = useState<{ product: GiftProduct; qty: number }[]>([])

  const PER_PAGE = 48
  const pageRef = React.useRef(1)
  const fetchVersionRef = React.useRef(0)

  // Build params from current filter state
  const buildParams = (page: number) => {
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all') params.append('occasion', selectedCategory)
    if (searchQuery) params.append('search', searchQuery)
    if (showFlowersOnly) params.append('provider', 'floristone')
    params.append('page', page.toString())
    params.append('perPage', PER_PAGE.toString())
    return params
  }

  // Initial fetch + filter change fetch
  useEffect(() => {
    if (!isOpen || step !== 'browse') return
    const version = ++fetchVersionRef.current
    pageRef.current = 1
    setError(null)
    setIsLoading(true)
    setProducts([])

    fetch(`/api/marketplace/curated?${buildParams(1)}`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        if (fetchVersionRef.current !== version) return // stale
        const giftable = (data.products || []).filter(
          (p: any) => p.provider !== 'prodigi' && p.provider !== 'prints'
        )
        setProducts(giftable)
        setHasMore(data.hasMore || false)
        setCategories(data.categories || [])
      })
      .catch(() => { if (fetchVersionRef.current === version) setError('Failed to load products.') })
      .finally(() => { if (fetchVersionRef.current === version) setIsLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, selectedCategory, searchQuery, showFlowersOnly])

  // Load more — completely independent, no state deps that trigger the effect
  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    setIsLoadingMore(true)

    try {
      const r = await fetch(`/api/marketplace/curated?${buildParams(nextPage)}`)
      if (!r.ok) throw new Error()
      const data = await r.json()
      const giftable = (data.products || []).filter(
        (p: any) => p.provider !== 'prodigi' && p.provider !== 'prints'
      )
      setProducts(prev => [...prev, ...giftable])
      setHasMore(data.hasMore || false)
    } catch {} finally {
      setIsLoadingMore(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, selectedCategory, searchQuery, showFlowersOnly])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('browse')
      setGiftType(null)
      setSelectedProduct(null)
      setSelectedVariant(undefined)
      setQuantity(1)
      setFlexAmount(50)
      setDeliveryTiming('with_postscript')
      setGiftDeliveryDate('')
      setDeliveryEvent('')
      setDeliveryOffsetDays(0)
      setSearchQuery('')
      setSelectedCategory('all')
      setSelectedPriceRange('all')
      setShowFlowersOnly(false)
      setHasMore(false)
      setCart([])
      setError(null)
    }
  }, [isOpen, isNearTermDelivery])

  if (!isOpen) return null

  const filteredProducts = products

  const handleProductSelect = (product: GiftProduct) => {
    setSelectedProduct(product)
    setStep('configure')
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    
    const selection: GiftSelection = {
      giftType: giftType || 'product',
      product: selectedProduct || undefined,
      variantId: selectedVariant,
      quantity,
      deliveryTiming,
      deliveryDate: giftDeliveryDate || undefined,
      deliveryEvent: deliveryEvent || undefined,
      deliveryOffsetDays: deliveryOffsetDays || undefined,
      flexGiftAmount: giftType === 'choice' ? flexAmount : undefined,
    }
    
    await onSelect(selection)
    setIsLoading(false)
    onClose()
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  const getProviderLabel = (provider: ProductProvider | string) => {
    switch (provider) {
      case 'floristone': return 'Flowers'
      case 'doba': return 'Gifts'
      case 'printful': return 'Custom'
      case 'goody': return 'Gifts'
      case 'gifts': return 'Gifts'
      default: return ''
    }
  }

  const getProviderColor = (provider: ProductProvider) => {
    switch (provider) {
      case 'floristone': return 'bg-pink-100 text-pink-700'
      case 'doba': return 'bg-blue-100 text-blue-700'
      case 'printful': return 'bg-purple-100 text-purple-700'
      case 'goody': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      'food': '🍫',
      'home': '🏠',
      'wellness': '💆',
      'electronics': '🔌',
      'all': '🎁',
    }
    return icons[categoryId] || '🎁'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#B8562E]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8562E] flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {step === 'browse' && 'Send a Gift'}
                {step === 'browse' && 'Choose a Gift'}
                {step === 'flex_amount' && 'Gift of Choice'}
                {step === 'configure' && 'Configure Gift'}
                {step === 'confirm' && 'Confirm Gift'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'browse' && (preselectedContactName ? `Choose a gift for ${preselectedContactName}` : 'Choose something special')}
                {preselectedContactName && step !== 'browse' && `For ${preselectedContactName}`}
              </p>
              {!isNearTermDelivery && step === 'browse' && (
                <p className="text-xs text-amber-600 mt-1">
                  💡 For future delivery, we recommend Gift of Choice
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Step: Choose Gift Type */}
          {/* choose_type is skipped — goes straight to browse */}

          {/* Step: Flex Amount Selection */}
          {step === 'flex_amount' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-[#2D5A3D]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How much would you like to give?
                </h3>
                <p className="text-sm text-gray-500">
                  They&apos;ll receive a link to choose any gift up to this amount from hundreds of options.
                </p>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-4 gap-3">
                {FLEX_GIFT_AMOUNTS.map((amount) => (
                  <button
                    key={amount.value}
                    onClick={() => setFlexAmount(amount.value)}
                    className={`relative p-4 rounded-xl border-2 text-center transition-all
                      ${flexAmount === amount.value
                        ? 'border-[#2D5A3D] bg-[#2D5A3D]/10'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {amount.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 
                                     bg-amber-100 text-amber-700 text-xs rounded-full whitespace-nowrap">
                        Popular
                      </span>
                    )}
                    <span className={`text-lg font-bold ${flexAmount === amount.value ? 'text-[#2D5A3D]' : 'text-gray-900'}`}>
                      {amount.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or enter a custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min={15}
                    max={500}
                    value={flexAmount}
                    onChange={(e) => setFlexAmount(Math.max(15, parseInt(e.target.value) || 15))}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                             focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D] outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum $15</p>
              </div>

              {/* Preview Card */}
              <div className="p-4 bg-gradient-to-br from-[#2D5A3D]/10 to-[#2D5A3D]/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Gift className="w-8 h-8 text-[#2D5A3D]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Gift of Choice - {formatPrice(flexAmount)}</p>
                    <p className="text-sm text-gray-500">
                      Recipient chooses from 500+ gift options
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('browse')}
                className="text-[#B8562E] hover:underline text-sm"
              >
                ← Back to gifts
              </button>
            </div>
          )}

          {/* Step: Browse Products */}
          {step === 'browse' && (
            <div className="space-y-6">
              {/* Search + Filters */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  aria-label="Search" placeholder="Search flowers, gifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                           focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D] outline-none"
                />
              </div>

              {/* Category pills — matches marketplace sidebar */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: 'all', label: 'All', icon: '✨' },
                  { id: 'flowers', label: 'Flowers', icon: '🌸' },
                  { id: 'birthday', label: 'Birthday', icon: '🎂' },
                  { id: 'anniversary', label: 'Anniversary', icon: '💕' },
                  { id: 'sympathy', label: 'Sympathy', icon: '🕊️' },
                  { id: 'thank-you', label: 'Thank You', icon: '🙏' },
                  { id: 'get-well', label: 'Get Well', icon: '💐' },
                  { id: 'congratulations', label: 'Congrats', icon: '🎉' },
                ].map((cat) => {
                  const isActive = cat.id === 'flowers'
                    ? showFlowersOnly
                    : cat.id === 'all'
                      ? !showFlowersOnly && selectedCategory === 'all'
                      : selectedCategory === cat.id && !showFlowersOnly
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (cat.id === 'flowers') {
                          setShowFlowersOnly(true)
                          setSelectedCategory('all')
                        } else {
                          setShowFlowersOnly(false)
                          setSelectedCategory(cat.id)
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-[#2D5A3D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-xs">{cat.icon}</span>
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500">
                  {isLoading ? 'Loading...' : `${filteredProducts.length} gift${filteredProducts.length !== 1 ? 's' : ''} found`}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#B8562E] hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Products Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B8562E]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Gift of Choice — inline card at the top */}
                  <button
                    onClick={() => {
                      setGiftType('choice')
                      setStep('flex_amount')
                    }}
                    className="group text-left bg-gradient-to-br from-[#2D5A3D]/5 to-[#C4A235]/5 border-2 border-dashed border-[#2D5A3D]/20 rounded-xl overflow-hidden hover:border-[#2D5A3D]/40 transition-all"
                  >
                    <div className="aspect-square flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[#2D5A3D]/10 flex items-center justify-center mb-4 group-hover:bg-[#2D5A3D]/20 transition-colors">
                        <DollarSign className="w-8 h-8 text-[#2D5A3D]" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">Gift of Choice</h3>
                      <p className="text-xs text-gray-500">Let them pick their own gift</p>
                    </div>
                    <div className="p-4 pt-0">
                      <p className="text-sm text-[#2D5A3D] font-medium">From $25</p>
                    </div>
                  </button>
                  {filteredProducts.map(product => {
                    const inCart = cart.some(c => c.product.id === product.id)
                    return (
                    <button
                      key={product.id}
                      onClick={() => {
                        if (inCart) return
                        setCart(prev => [...prev, { product, qty: 1 }])
                      }}
                      className={`group text-left bg-white border rounded-xl overflow-hidden transition-all ${
                        inCart ? 'border-[#2D5A3D] ring-1 ring-[#2D5A3D]/20' : 'border-gray-200 hover:border-[#2D5A3D]/40 hover:shadow-lg'
                      }`}
                    >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {product.isBestseller && (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium
                                         bg-amber-100 text-amber-700">
                            Bestseller
                          </div>
                        )}
                        {inCart && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 text-sm">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-[#2D5A3D]">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          {!inCart && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <ShoppingBag className="w-3 h-3" /> Add
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )})}
                </div>
              )}

              {/* Load More */}
              {hasMore && products.length > 0 && !isLoadingMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2 border border-[#2D5A3D] text-[#2D5A3D] rounded-full text-sm font-medium hover:bg-[#2D5A3D] hover:text-white transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
              {isLoadingMore && (
                <div className="flex justify-center pt-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {!isLoading && filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No gifts found matching your search</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('all')
                      setSelectedPriceRange('all')
                    }}
                    className="mt-4 text-[#B8562E] hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              <button
                onClick={() => setStep('browse')}
                className="text-[#B8562E] hover:underline text-sm"
              >
                ← Back to gifts
              </button>
            </div>
          )}

          {/* Step: Configure */}
          {step === 'configure' && selectedProduct && (
            <div className="space-y-6">
              {/* Product Summary */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <img
                  src={selectedProduct.thumbnail}
                  alt={selectedProduct.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                  {selectedProduct.brandName && (
                    <p className="text-xs text-gray-400">{selectedProduct.brandName}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-2">{selectedProduct.description}</p>
                  <span className="text-lg font-bold text-[#B8562E]">
                    {formatPrice(selectedProduct.price, selectedProduct.currency)}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center
                             hover:bg-gray-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center
                             hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Delivery Timing - Only for near-term */}
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
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                            ${deliveryTiming === option.key
                              ? 'border-[#B8562E] bg-[#B8562E]/5'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                         ${deliveryTiming === option.key ? 'bg-[#B8562E] text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{option.label}</p>
                            <p className="text-sm text-gray-500">{option.description}</p>
                          </div>
                          {deliveryTiming === option.key && (
                            <CheckCircle2 className="w-5 h-5 text-[#B8562E]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Delivery Date Picker */}
              {deliveryTiming === 'specific_date' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Select Delivery Date
                  </label>
                  <input
                    type="date"
                    value={giftDeliveryDate}
                    onChange={(e) => setGiftDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg
                             focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
                  />
                </div>
              )}

              {/* Relative Event Selector */}
              {deliveryTiming === 'relative_event' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      Select Occasion
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[...EVENT_OPTIONS, ...HOLIDAY_OPTIONS].map(event => (
                        <button
                          key={event.key}
                          onClick={() => setDeliveryEvent(event.key)}
                          className={`p-3 rounded-lg border text-left transition-all
                            ${deliveryEvent === event.key
                              ? 'border-[#B8562E] bg-[#B8562E]/10'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                          <span className="text-lg mr-1">{event.icon}</span>
                          <span className="text-sm font-medium">{event.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Timing
                    </label>
                    <div className="flex items-center gap-3">
                      <select
                        value={deliveryOffsetDays}
                        onChange={(e) => setDeliveryOffsetDays(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg
                                 focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
                      >
                        <option value={0}>On the day</option>
                        <option value={-1}>1 day before</option>
                        <option value={-2}>2 days before</option>
                        <option value={-3}>3 days before</option>
                        <option value={1}>1 day after</option>
                        <option value={2}>2 days after</option>
                      </select>
                      <span className="text-sm text-gray-500">
                        of the occasion
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Back Button */}
              <button
                onClick={() => setStep('browse')}
                className="text-[#B8562E] hover:underline text-sm"
              >
                ← Choose a different gift
              </button>
            </div>
          )}
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
                      <img src={item.product.thumbnail} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-gray-800">{item.product.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setCart(prev => prev.map((c, j) => j === i ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}
                          className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200"
                        >−</button>
                        <span className="w-5 text-center text-xs font-medium">{item.qty}</span>
                        <button
                          onClick={() => setCart(prev => prev.map((c, j) => j === i ? { ...c, qty: c.qty + 1 } : c))}
                          className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200"
                        >+</button>
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-14 text-right">{formatPrice(item.product.price * item.qty)}</span>
                      <button
                        onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                        className="p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
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
                      {cart.length} item{cart.length !== 1 ? 's' : ''} &middot; {formatPrice(cart.reduce((sum, c) => sum + c.product.price * c.qty, 0))}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors">
                    Cancel
                  </button>
                  {cart.length > 0 && (
                    <button
                      onClick={() => {
                        const selection: GiftSelection = {
                          giftType: 'product',
                          product: cart[0].product,
                          quantity: cart.reduce((sum, c) => sum + c.qty, 0),
                          deliveryTiming: 'with_postscript',
                          cartItems: cart,
                        }
                        onSelect(selection)
                        onClose()
                      }}
                      className="px-5 py-2 bg-[#2D5A3D] text-white rounded-lg text-sm font-medium hover:bg-[#244B32] transition-colors flex items-center gap-1.5"
                    >
                      <Gift className="w-4 h-4" />
                      Attach {cart.length} gift{cart.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'flex_amount' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#2D5A3D]">
                  {formatPrice(flexAmount)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('browse')}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || flexAmount < 15}
                  className="px-6 py-2 bg-[#2D5A3D] text-white rounded-lg font-medium
                           hover:bg-[#355A48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Attach Gift of Choice
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {step === 'configure' && selectedProduct && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#B8562E]">
                  {formatPrice(selectedProduct.price * quantity, selectedProduct.currency)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('browse')}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || (deliveryTiming === 'specific_date' && !giftDeliveryDate) || 
                           (deliveryTiming === 'relative_event' && !deliveryEvent)}
                  className="px-6 py-2 bg-[#B8562E] text-white rounded-lg font-medium
                           hover:bg-[#A84E2A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Attach Gift
                    </>
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
