'use client'

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
  const [step, setStep] = useState<'choose_type' | 'browse' | 'flex_amount' | 'configure' | 'confirm'>('choose_type')
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
  const [products, setProducts] = useState<GiftProduct[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch products from API
  useEffect(() => {
    if (!isOpen || step !== 'browse') return
    
    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams()
        if (selectedCategory && selectedCategory !== 'all') {
          params.append('category', selectedCategory)
        }
        if (searchQuery) {
          params.append('search', searchQuery)
        }
        if (selectedPriceRange && selectedPriceRange !== 'all') {
          params.append('priceRange', selectedPriceRange)
        }
        if (showFlowersOnly) {
          params.append('provider', 'floristone')
        }
        params.append('includeCategories', 'true')
        params.append('limit', '50')
        
        const response = await fetch(`/api/goody/curated?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }
        
        const data = await response.json()
        setProducts(data.products || [])
        setCategories(data.categories || [])
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to load products. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProducts()
  }, [isOpen, step, selectedCategory, searchQuery, selectedPriceRange, showFlowersOnly])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // For near-term, start with type selection; for legacy, go straight to options
      setStep(isNearTermDelivery ? 'choose_type' : 'choose_type')
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

  const getProviderLabel = (provider: ProductProvider) => {
    switch (provider) {
      case 'floristone': return 'Flowers'
      case 'doba': return 'Gifts'
      case 'printful': return 'Custom'
      case 'goody': return 'Goody'
      default: return provider
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
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#C35F33]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C35F33] flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {step === 'choose_type' && 'Add a Gift'}
                {step === 'browse' && 'Choose a Gift'}
                {step === 'flex_amount' && 'Gift of Choice'}
                {step === 'configure' && 'Configure Gift'}
                {step === 'confirm' && 'Confirm Gift'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'choose_type' && 'Surprise them with something special'}
                {preselectedContactName && step !== 'choose_type' && `For ${preselectedContactName}`}
              </p>
              {!isNearTermDelivery && step === 'choose_type' && (
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
          {step === 'choose_type' && (
            <div className="space-y-6">
              <p className="text-gray-600 text-center mb-8">
                How would you like to gift them?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Flowers Option - Always available */}
                <button
                  onClick={() => {
                    setGiftType('product')
                    setShowFlowersOnly(true)
                    setStep('browse')
                  }}
                  className="group text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-pink-300 
                           hover:bg-pink-50/50 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center mb-4
                                group-hover:bg-pink-200 transition-colors">
                    <Flower2 className="w-7 h-7 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Send Flowers</h3>
                  <p className="text-sm text-gray-500">
                    Beautiful bouquets delivered to their door. Perfect for any occasion.
                  </p>
                </button>

                {/* Specific Gift - Only for near-term */}
                {isNearTermDelivery && (
                  <button
                    onClick={() => {
                      setGiftType('product')
                      setShowFlowersOnly(false)
                      setStep('browse')
                    }}
                    className="group text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-[#C35F33]/50 
                             hover:bg-[#C35F33]/5 transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#C35F33]/10 flex items-center justify-center mb-4
                                  group-hover:bg-[#C35F33]/20 transition-colors">
                      <ShoppingBag className="w-7 h-7 text-[#C35F33]" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">Choose a Gift</h3>
                    <p className="text-sm text-gray-500">
                      Browse our curated selection of thoughtful gifts from top brands.
                    </p>
                  </button>
                )}

                {/* Gift of Choice - Emphasized for legacy */}
                <button
                  onClick={() => {
                    setGiftType('choice')
                    setStep('flex_amount')
                  }}
                  className={`group text-left p-6 rounded-2xl border-2 transition-all
                    ${!isNearTermDelivery 
                      ? 'border-[#406A56] bg-[#406A56]/5 hover:bg-[#406A56]/10' 
                      : 'border-gray-200 hover:border-[#406A56]/50 hover:bg-[#406A56]/5'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors
                    ${!isNearTermDelivery 
                      ? 'bg-[#406A56]/20 group-hover:bg-[#406A56]/30' 
                      : 'bg-[#406A56]/10 group-hover:bg-[#406A56]/20'
                    }`}>
                    <DollarSign className="w-7 h-7 text-[#406A56]" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">Gift of Choice</h3>
                    {!isNearTermDelivery && (
                      <span className="px-2 py-0.5 bg-[#406A56] text-white text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Set an amount and let them choose their perfect gift from hundreds of options.
                  </p>
                  {!isNearTermDelivery && (
                    <p className="text-xs text-[#406A56] mt-2">
                      ✓ Best for future delivery — gifts may change over time
                    </p>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Flex Amount Selection */}
          {step === 'flex_amount' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#406A56]/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-[#406A56]" />
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
                        ? 'border-[#406A56] bg-[#406A56]/10'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {amount.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 
                                     bg-amber-100 text-amber-700 text-xs rounded-full whitespace-nowrap">
                        Popular
                      </span>
                    )}
                    <span className={`text-lg font-bold ${flexAmount === amount.value ? 'text-[#406A56]' : 'text-gray-900'}`}>
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
                             focus:ring-2 focus:ring-[#406A56]/20 focus:border-[#406A56] outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum $15</p>
              </div>

              {/* Preview Card */}
              <div className="p-4 bg-gradient-to-br from-[#406A56]/10 to-[#406A56]/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Gift className="w-8 h-8 text-[#406A56]" />
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
                onClick={() => setStep('choose_type')}
                className="text-[#C35F33] hover:underline text-sm"
              >
                ← Choose a different gift type
              </button>
            </div>
          )}

          {/* Step: Browse Products */}
          {step === 'browse' && (
            <div className="space-y-6">
              {/* Filter Pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowFlowersOnly(true)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2
                    ${showFlowersOnly 
                      ? 'bg-pink-100 text-pink-700 border-2 border-pink-300' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <Flower2 className="w-4 h-4" />
                  Flowers
                </button>
                <button
                  onClick={() => setShowFlowersOnly(false)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2
                    ${!showFlowersOnly 
                      ? 'bg-[#C35F33]/10 text-[#C35F33] border-2 border-[#C35F33]/30' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  All Gifts
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  aria-label="Search" placeholder="Search gifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                           focus:ring-2 focus:ring-[#C35F33]/20 focus:border-[#C35F33] outline-none"
                />
              </div>

              {/* Categories */}
              {!showFlowersOnly && categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat, idx) => {
                    const isSelected = selectedCategory === cat.id
                    return (
                      <button
                        key={`cat-${cat.id}-${idx}`}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2
                          ${isSelected 
                            ? 'bg-[#C35F33] text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        <span>{getCategoryIcon(cat.id)}</span>
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Price Range Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {PRICE_RANGES.map(range => {
                  const isSelected = selectedPriceRange === range.key
                  return (
                    <button
                      key={range.key}
                      onClick={() => setSelectedPriceRange(range.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                        ${isSelected 
                          ? 'bg-[#406A56] text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {range.label}
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
                    className="text-[#C35F33] hover:underline"
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
                  <Loader2 className="w-8 h-8 animate-spin text-[#C35F33]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="group text-left bg-white border border-gray-200 rounded-xl overflow-hidden
                               hover:border-[#C35F33]/50 hover:shadow-lg transition-all"
                    >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium
                                       ${getProviderColor(product.provider)}`}>
                          {getProviderLabel(product.provider)}
                        </div>
                        {product.isBestseller && (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium
                                         bg-amber-100 text-amber-700">
                            ⭐ Bestseller
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                        {product.brandName && (
                          <p className="text-xs text-gray-400 mb-2">{product.brandName}</p>
                        )}
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-[#C35F33]">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            Select
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
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
                    className="mt-4 text-[#C35F33] hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              <button
                onClick={() => setStep('choose_type')}
                className="text-[#C35F33] hover:underline text-sm"
              >
                ← Choose a different gift type
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
                  <span className="text-lg font-bold text-[#C35F33]">
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
                              ? 'border-[#C35F33] bg-[#C35F33]/5'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                         ${deliveryTiming === option.key ? 'bg-[#C35F33] text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{option.label}</p>
                            <p className="text-sm text-gray-500">{option.description}</p>
                          </div>
                          {deliveryTiming === option.key && (
                            <CheckCircle2 className="w-5 h-5 text-[#C35F33]" />
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
                             focus:ring-2 focus:ring-[#C35F33]/20 focus:border-[#C35F33] outline-none"
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
                              ? 'border-[#C35F33] bg-[#C35F33]/10'
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
                                 focus:ring-2 focus:ring-[#C35F33]/20 focus:border-[#C35F33] outline-none"
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
                className="text-[#C35F33] hover:underline text-sm"
              >
                ← Choose a different gift
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          {step === 'choose_type' && (
            <div className="flex items-center justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {step === 'browse' && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Powered by <span className="font-medium text-[#C35F33]">Goody</span>
              </p>
              <a 
                href="https://www.ongoody.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <Store className="w-3 h-3" />
                Browse more on Goody
              </a>
            </div>
          )}

          {step === 'flex_amount' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#406A56]">
                  {formatPrice(flexAmount)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('choose_type')}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || flexAmount < 15}
                  className="px-6 py-2 bg-[#406A56] text-white rounded-lg font-medium
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
                <p className="text-2xl font-bold text-[#C35F33]">
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
                  className="px-6 py-2 bg-[#C35F33] text-white rounded-lg font-medium
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
