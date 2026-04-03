'use client'

import React, { useState } from 'react'
import { 
  Send, Crown, Sparkles, ArrowRightLeft, ShoppingBag, 
  Info, X, Check, Loader2 
} from 'lucide-react'
import { usePostscriptCredits } from '@/hooks/usePostscriptCredits'
import Link from 'next/link'

interface PostscriptCreditsCounterProps {
  variant?: 'compact' | 'detailed'
  className?: string
}

export default function PostscriptCreditsCounter({ 
  variant = 'compact', 
  className = '' 
}: PostscriptCreditsCounterProps) {
  const { credits, xp, loading, canTradeXP, tradeXP, purchaseBundle } = usePostscriptCredits()
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleTradeXP = async () => {
    setActionLoading('trade')
    setActionMessage(null)
    const result = await tradeXP()
    setActionMessage({ type: result.success ? 'success' : 'error', text: result.message })
    setActionLoading(null)
    if (result.success) {
      setTimeout(() => setActionMessage(null), 3000)
    }
  }

  const handlePurchase = async (bundleType: '1_pack' | '5_pack') => {
    setActionLoading(bundleType)
    setActionMessage(null)
    const result = await purchaseBundle(bundleType)
    setActionMessage({ type: result.success ? 'success' : 'error', text: result.message })
    setActionLoading(null)
    if (result.success) {
      setTimeout(() => setActionMessage(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 glass-card rounded-full ${className}`}>
        <Loader2 size={14} className="animate-spin text-gray-400" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    )
  }

  if (!credits) return null

  const remaining = credits.total_credits
  const isPremium = credits.is_premium

  // Compact variant - just shows the count
  if (variant === 'compact') {
    return (
      <>
        <button
          data-credits-counter
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 glass-card rounded-full 
                      hover:bg-white/90 transition-colors cursor-pointer group ${className}`}
          title="Click for details"
        >
          <Send size={14} className="text-[#B8562E]" />
          <span className={`text-sm font-medium ${remaining <= 0 ? 'text-red-500' : 'text-gray-700'}`}>
            {remaining} remaining
          </span>
          {isPremium && <Crown size={12} className="text-[#C4A235]" />}
          <Info size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Modal */}
        {showModal && (
          <CreditModal
            credits={credits}
            xp={xp}
            canTradeXP={canTradeXP}
            actionLoading={actionLoading}
            actionMessage={actionMessage}
            onTradeXP={handleTradeXP}
            onPurchase={handlePurchase}
            onClose={() => {
              setShowModal(false)
              setActionMessage(null)
            }}
          />
        )}
      </>
    )
  }

  // Detailed variant - shows more info inline
  return (
    <div className={`glass-card p-4 rounded-xl ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Send size={18} className="text-[#B8562E]" />
          <span className="font-semibold text-gray-800">Postscript Credits</span>
        </div>
        {isPremium && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#C4A235]/20 rounded-full text-xs text-[#8a7a0d]">
            <Crown size={12} />
            Premium
          </span>
        )}
      </div>
      
      <div className="text-3xl font-bold text-gray-900 mb-1">{remaining}</div>
      <p className="text-sm text-gray-500">
        {isPremium 
          ? `${credits.monthly_allowance} credits/month for ${credits.seat_count} seat(s)`
          : 'Free tier: 3 lifetime credits'
        }
      </p>
      
      {isPremium && credits.next_refresh_date && (
        <p className="text-xs text-gray-400 mt-1">
          Next refresh: {new Date(credits.next_refresh_date).toLocaleDateString()}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2 text-sm text-[#B8562E] font-medium hover:bg-[#B8562E]/5 rounded-lg transition-colors"
        >
          Get More Credits
        </button>
      </div>

      {showModal && (
        <CreditModal
          credits={credits}
          xp={xp}
          canTradeXP={canTradeXP}
          actionLoading={actionLoading}
          actionMessage={actionMessage}
          onTradeXP={handleTradeXP}
          onPurchase={handlePurchase}
          onClose={() => {
            setShowModal(false)
            setActionMessage(null)
          }}
        />
      )}
    </div>
  )
}

// Credit purchase/trade modal
function CreditModal({
  credits,
  xp,
  canTradeXP,
  actionLoading,
  actionMessage,
  onTradeXP,
  onPurchase,
  onClose
}: {
  credits: any
  xp: any
  canTradeXP: boolean
  actionLoading: string | null
  actionMessage: { type: 'success' | 'error'; text: string } | null
  onTradeXP: () => void
  onPurchase: (type: '1_pack' | '5_pack') => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Postscript Credits</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current balance */}
          <div className="text-center py-4 bg-gradient-to-br from-[#B8562E]/5 to-[#C4A235]/5 rounded-xl">
            <div className="text-4xl font-bold text-gray-900">{credits.total_credits}</div>
            <p className="text-sm text-gray-600">credits remaining</p>
            {credits.is_premium && (
              <p className="text-xs text-gray-500 mt-1">
                {credits.monthly_allowance} credits/month · {credits.seat_count} seat(s)
              </p>
            )}
          </div>

          {/* Message */}
          {actionMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              actionMessage.type === 'success' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {actionMessage.type === 'success' ? <Check size={16} /> : <X size={16} />}
              <span className="text-sm">{actionMessage.text}</span>
            </div>
          )}

          {/* XP Trade */}
          <div className="p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft size={18} className="text-purple-500" />
              <span className="font-medium text-gray-800">Trade XP</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Exchange 200 XP for 1 postscript credit
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Your XP: <span className="font-semibold text-purple-600">{xp?.available ?? 0}</span>
              </span>
              <button
                onClick={onTradeXP}
                disabled={!canTradeXP || actionLoading === 'trade'}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg 
                           font-medium text-sm hover:bg-purple-600 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'trade' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Trade 200 XP
              </button>
            </div>
          </div>

          {/* Purchase bundles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={18} className="text-[#B8562E]" />
              <span className="font-medium text-gray-800">Purchase Credits</span>
            </div>
            
            {/* 1 pack */}
            <button
              onClick={() => onPurchase('1_pack')}
              disabled={actionLoading === '1_pack'}
              className="w-full flex items-center justify-between p-4 border border-gray-200 
                         rounded-xl hover:border-[#B8562E] hover:bg-[#B8562E]/5 transition-colors
                         disabled:opacity-50"
            >
              <div className="text-left">
                <div className="font-semibold text-gray-800">1 Credit</div>
                <div className="text-sm text-gray-500">Single postscript</div>
              </div>
              <div className="flex items-center gap-2">
                {actionLoading === '1_pack' && <Loader2 size={14} className="animate-spin" />}
                <span className="text-lg font-bold text-[#B8562E]">$5</span>
              </div>
            </button>

            {/* 5 pack */}
            <button
              onClick={() => onPurchase('5_pack')}
              disabled={actionLoading === '5_pack'}
              className="w-full flex items-center justify-between p-4 border-2 border-[#B8562E] 
                         rounded-xl bg-[#B8562E]/5 hover:bg-[#B8562E]/10 transition-colors
                         disabled:opacity-50 relative"
            >
              <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#C4A235] text-[#5a4e0a] 
                              text-xs font-bold rounded-full">
                SAVE $5
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-800">5 Credits</div>
                <div className="text-sm text-gray-500">Best value bundle</div>
              </div>
              <div className="flex items-center gap-2">
                {actionLoading === '5_pack' && <Loader2 size={14} className="animate-spin" />}
                <span className="text-lg font-bold text-[#B8562E]">$20</span>
              </div>
            </button>
          </div>

          {/* Premium upsell */}
          {!credits.is_premium && (
            <div className="p-4 bg-gradient-to-r from-[#C4A235]/10 to-[#B8562E]/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} className="text-[#C4A235]" />
                <span className="font-medium text-gray-800">Go Premium</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Get 3 postscript credits per month, plus unlimited AI chat, video memories, and more!
              </p>
              <Link
                href="/dashboard/settings/subscription"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r 
                           from-[#C4A235] to-[#B8562E] text-white rounded-lg font-medium 
                           text-sm hover:opacity-90 transition-opacity"
              >
                <Crown size={14} />
                Upgrade Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
