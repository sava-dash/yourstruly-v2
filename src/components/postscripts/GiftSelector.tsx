'use client'

import { useState } from 'react'
import { differenceInDays, format } from 'date-fns'
import { Gift, Package, Sparkles, Check, Loader2, ExternalLink } from 'lucide-react'
import Image from 'next/image'

// Gift of Choice amounts
const GIFT_AMOUNTS = [
  { value: 30, label: '$30', description: 'Perfect for a thoughtful gesture' },
  { value: 50, label: '$50', description: 'Most popular choice' },
  { value: 100, label: '$100', description: 'For something special' },
  { value: 150, label: '$150', description: 'Premium gift experience' },
]

interface GiftSelectorProps {
  postscriptId: string
  deliveryDate: Date | null
  deliveryType: 'date' | 'event' | 'passing'
  onGiftAdded: (gift: AddedGift) => void
  onCancel: () => void
}

interface AddedGift {
  id: string
  giftType: 'choice' | 'product'
  name: string
  amount: number
  imageUrl?: string
}

type Tab = 'choice' | 'product'

export function GiftSelector({
  postscriptId,
  deliveryDate,
  deliveryType,
  onGiftAdded,
  onCancel,
}: GiftSelectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('choice')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50)
  const [customAmount, setCustomAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate days until delivery
  const daysUntilDelivery = deliveryDate 
    ? differenceInDays(deliveryDate, new Date())
    : null

  // For delivery > 1 year, only allow Gift of Choice
  const forceGiftOfChoice = daysUntilDelivery !== null && daysUntilDelivery > 365
  
  // For "passing" type, always force Gift of Choice (unknown delivery date)
  const isPassingType = deliveryType === 'passing'

  // Get the effective amount
  const getEffectiveAmount = (): number | null => {
    if (customAmount) {
      const parsed = parseInt(customAmount, 10)
      return parsed >= 15 ? parsed : null
    }
    return selectedAmount
  }

  const handleCheckout = async () => {
    const amount = getEffectiveAmount()
    if (!amount) {
      setError('Please select or enter a gift amount (minimum $15)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/postscripts/${postscriptId}/gifts/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giftType: 'choice',
          flexGiftAmount: amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout')
      setIsLoading(false)
    }
  }

  // Fulfillment timing info
  const getFulfillmentInfo = () => {
    if (isPassingType) {
      return {
        icon: '⏳',
        text: 'Gift will be sent when your PostScript is delivered',
      }
    }
    if (daysUntilDelivery === null) {
      return null
    }
    if (activeTab === 'choice') {
      // Gift of Choice: sent 1 week before
      const sendDate = new Date(deliveryDate!)
      sendDate.setDate(sendDate.getDate() - 7)
      return {
        icon: '📧',
        text: `Gift link sent ~${format(sendDate, 'MMM d, yyyy')} (1 week before delivery)`,
      }
    } else {
      // Physical: sent 3 weeks before
      const sendDate = new Date(deliveryDate!)
      sendDate.setDate(sendDate.getDate() - 21)
      return {
        icon: '📦',
        text: `Gift ordered ~${format(sendDate, 'MMM d, yyyy')} (3 weeks before delivery)`,
      }
    }
  }

  const fulfillmentInfo = getFulfillmentInfo()

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add a Gift</h2>
            <p className="text-sm text-gray-500">
              {forceGiftOfChoice || isPassingType
                ? 'Let your recipient choose their perfect gift'
                : 'Choose how to gift something special'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - only show if not forcing Gift of Choice */}
      {!forceGiftOfChoice && !isPassingType && (
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('choice')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'choice'
                ? 'text-rose-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gift of Choice
            </div>
            {activeTab === 'choice' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`flex-1 py-4 px-6 text-sm font-medium transition-colors relative ${
              activeTab === 'product'
                ? 'text-rose-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="w-4 h-4" />
              Choose a Product
            </div>
            {activeTab === 'product' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
            )}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {(activeTab === 'choice' || forceGiftOfChoice || isPassingType) ? (
          <GiftOfChoiceContent
            selectedAmount={selectedAmount}
            setSelectedAmount={setSelectedAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            forceMode={forceGiftOfChoice || isPassingType}
            daysUntilDelivery={daysUntilDelivery}
          />
        ) : (
          <ProductBrowserContent postscriptId={postscriptId} onGiftAdded={onGiftAdded} />
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Fulfillment timing info */}
        {fulfillmentInfo && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="mr-2">{fulfillmentInfo.icon}</span>
              {fulfillmentInfo.text}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 flex justify-between items-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        
        {(activeTab === 'choice' || forceGiftOfChoice || isPassingType) && (
          <button
            onClick={handleCheckout}
            disabled={isLoading || !getEffectiveAmount()}
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-medium 
                     hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Add Gift — ${getEffectiveAmount() || 0}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Gift of Choice content
function GiftOfChoiceContent({
  selectedAmount,
  setSelectedAmount,
  customAmount,
  setCustomAmount,
  forceMode,
  daysUntilDelivery,
}: {
  selectedAmount: number | null
  setSelectedAmount: (amount: number | null) => void
  customAmount: string
  setCustomAmount: (value: string) => void
  forceMode: boolean
  daysUntilDelivery: number | null
}) {
  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="flex gap-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden">
            <Image
              src="https://assets.ongoody.com/store/gift-of-choice-card.png"
              alt="Gift of Choice"
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Gift of Choice</h3>
          <p className="text-sm text-gray-600 mt-1">
            Your recipient receives a link to choose any gift they want from hundreds of premium brands. 
            Shipping is included, and they enter their own address.
          </p>
          {forceMode && daysUntilDelivery !== null && daysUntilDelivery > 365 && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              <span>💡</span>
              Because delivery is over a year away, Gift of Choice ensures they get something current.
            </p>
          )}
        </div>
      </div>

      {/* Amount selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Amount
        </label>
        <div className="grid grid-cols-2 gap-3">
          {GIFT_AMOUNTS.map((amount) => (
            <button
              key={amount.value}
              onClick={() => {
                setSelectedAmount(amount.value)
                setCustomAmount('')
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedAmount === amount.value && !customAmount
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-gray-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">{amount.label}</span>
                {selectedAmount === amount.value && !customAmount && (
                  <Check className="w-5 h-5 text-rose-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{amount.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or enter custom amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            min="15"
            max="1000"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value)
              if (e.target.value) {
                setSelectedAmount(null)
              }
            }}
            placeholder="15 - 1000"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Minimum $15, maximum $1,000</p>
      </div>

      {/* What they'll see */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 mb-2">What your recipient sees:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Browse hundreds of curated gifts
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Pick any item(s) up to your budget
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Enter their shipping address
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            No prices shown — just pure choice
          </li>
        </ul>
      </div>
    </div>
  )
}

// Product browser content (placeholder - can expand later)
function ProductBrowserContent({
  postscriptId,
  onGiftAdded,
}: {
  postscriptId: string
  onGiftAdded: (gift: AddedGift) => void
}) {
  return (
    <div className="text-center py-8">
      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Browse Products</h3>
      <p className="text-sm text-gray-500 mb-6">
        Choose a specific gift from our curated marketplace
      </p>
      <a
        href={`/marketplace?postscript=${postscriptId}`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open Marketplace
      </a>
      <p className="text-xs text-gray-400 mt-4">
        Products selected in the marketplace will be attached to this PostScript
      </p>
    </div>
  )
}
