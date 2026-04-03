'use client'

import { useState } from 'react'
import { X, Loader2, CreditCard } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price_monthly: number | null
  stripe_price_id: string | null
}

interface UpgradeModalProps {
  plan: Plan | null
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => Promise<void>
  billingCycle?: 'monthly' | 'yearly'
}

export function UpgradeModal({ plan, isOpen, onClose, onConfirm }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !plan) return null

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      if (onConfirm) {
        await onConfirm()
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to process upgrade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2d2d2d]">Upgrade to {plan.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-[#2D5A3D]/5 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#2d2d2d]">{plan.name}</span>
              <span className="text-2xl font-bold text-[#2D5A3D]">
                ${plan.price_monthly}/mo
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            You'll be redirected to our secure payment page to complete your subscription.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-[#2D5A3D] text-white font-semibold rounded-xl hover:bg-[#234A31] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
