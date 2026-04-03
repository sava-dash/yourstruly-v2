'use client'

import React from 'react'
import { 
  Gift, Package, Clock, CheckCircle2, Truck, 
  X, ShoppingBag, Calendar
} from 'lucide-react'

export interface AttachedGiftData {
  id: string
  product_id: string
  provider: 'floristone' | 'doba' | 'printful'
  name: string
  description?: string
  image_url?: string
  price: number
  currency: string
  quantity: number
  status: 'pending' | 'in_cart' | 'paid' | 'ordered' | 'shipped' | 'delivered' | 'cancelled'
  delivery_timing: 'with_postscript' | 'specific_date' | 'relative_event'
  delivery_date?: string
  delivery_event?: string
  delivery_offset_days?: number
  paid_at?: string
  ordered_at?: string
  delivered_at?: string
}

interface AttachedGiftProps {
  gift: AttachedGiftData
  onRemove?: () => void
  compact?: boolean
  showStatus?: boolean
}

const STATUS_CONFIG: Record<string, { 
  label: string 
  icon: typeof Clock
  color: string
  bgColor: string
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  in_cart: {
    label: 'In Cart',
    icon: ShoppingBag,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  ordered: {
    label: 'Ordered',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  cancelled: {
    label: 'Cancelled',
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  floristone: 'Flowers',
  doba: 'Gift',
  printful: 'Custom'
}

const PROVIDER_COLORS: Record<string, string> = {
  floristone: 'bg-pink-100 text-pink-700',
  doba: 'bg-blue-100 text-blue-700',
  printful: 'bg-purple-100 text-purple-700'
}

const EVENT_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  wedding: 'Wedding',
  graduation: 'Graduation',
  christmas: 'Christmas',
  easter: 'Easter',
  thanksgiving: 'Thanksgiving',
  mothers_day: "Mother's Day",
  fathers_day: "Father's Day",
  valentines: "Valentine's Day"
}

export function AttachedGift({ gift, onRemove, compact = false, showStatus = true }: AttachedGiftProps) {
  const status = STATUS_CONFIG[gift.status] || STATUS_CONFIG.pending
  const StatusIcon = status.icon

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  const getDeliveryText = () => {
    switch (gift.delivery_timing) {
      case 'with_postscript':
        return 'Delivered with message'
      case 'specific_date':
        return gift.delivery_date 
          ? `Delivered ${new Date(gift.delivery_date).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric' 
            })}`
          : 'Specific date pending'
      case 'relative_event':
        if (gift.delivery_event) {
          const eventName = EVENT_LABELS[gift.delivery_event] || gift.delivery_event
          const offset = gift.delivery_offset_days || 0
          if (offset === 0) return `On their ${eventName}`
          if (offset < 0) return `${Math.abs(offset)} days before ${eventName}`
          return `${offset} days after ${eventName}`
        }
        return 'Special occasion'
      default:
        return 'Delivery pending'
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-[#B8562E]/5 rounded-lg border border-[#B8562E]/10">
        <Gift className="w-4 h-4 text-[#B8562E]" />
        <span className="text-sm text-gray-700 truncate flex-1">{gift.name}</span>
        {showStatus && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
          {gift.image_url ? (
            <img
              src={gift.image_url}
              alt={gift.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${PROVIDER_COLORS[gift.provider] || 'bg-gray-100 text-gray-600'}`}>
                  {PROVIDER_LABELS[gift.provider] || gift.provider}
                </span>
                {showStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 truncate">{gift.name}</h4>
              <p className="text-sm text-gray-500">
                {formatPrice(gift.price, gift.currency)} × {gift.quantity}
              </p>
            </div>
            
            {onRemove && gift.status === 'pending' && (
              <button
                onClick={onRemove}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                title="Remove gift"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Delivery Info */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{getDeliveryText()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for displaying multiple gifts in a list
interface AttachedGiftListProps {
  gifts: AttachedGiftData[]
  onRemoveGift?: (giftId: string) => void
  emptyMessage?: string
}

export function AttachedGiftList({ gifts, onRemoveGift, emptyMessage = 'No gifts attached' }: AttachedGiftListProps) {
  if (gifts.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {gifts.map(gift => (
        <AttachedGift
          key={gift.id}
          gift={gift}
          onRemove={onRemoveGift ? () => onRemoveGift(gift.id) : undefined}
          compact={false}
          showStatus={true}
        />
      ))}
    </div>
  )
}

// Preview component for the PostScript card
interface GiftPreviewProps {
  giftCount: number
  className?: string
}

export function GiftPreview({ giftCount, className = '' }: GiftPreviewProps) {
  if (giftCount === 0) return null

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 bg-[#B8562E]/10 text-[#B8562E] rounded-lg text-xs font-medium ${className}`}>
      <Gift className="w-3.5 h-3.5" />
      <span>
        {giftCount === 1 ? '1 gift included' : `${giftCount} gifts included`}
      </span>
    </div>
  )
}

export default AttachedGift
