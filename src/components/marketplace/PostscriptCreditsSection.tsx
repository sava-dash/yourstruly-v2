'use client'

import React, { useState } from 'react'
import { Send, Sparkles, Check, Loader2, Crown, ArrowRightLeft } from 'lucide-react'
import { usePostscriptCredits } from '@/hooks/usePostscriptCredits'
import Link from 'next/link'

export default function PostscriptCreditsSection() {
  const { credits, xp, canTradeXP, tradeXP, purchaseBundle, loading } = usePostscriptCredits()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleTradeXP = async () => {
    setActionLoading('trade')
    setMessage(null)
    const result = await tradeXP()
    setMessage({ type: result.success ? 'success' : 'error', text: result.message })
    setActionLoading(null)
    if (result.success) setTimeout(() => setMessage(null), 3000)
  }

  const handlePurchase = async (bundleType: '1_pack' | '5_pack') => {
    setActionLoading(bundleType)
    setMessage(null)
    const result = await purchaseBundle(bundleType)
    setMessage({ type: result.success ? 'success' : 'error', text: result.message })
    setActionLoading(null)
    if (result.success) setTimeout(() => setMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-[#B8562E]/5 via-[#C4A235]/5 to-[#2D5A3D]/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#B8562E]" size={24} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#B8562E]/5 via-[#C4A235]/5 to-[#2D5A3D]/5 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send size={20} className="text-[#B8562E]" />
            <h2 className="font-playfair text-xl font-semibold text-gray-800">
              ✉️ Postscript Credits
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full">
            <span className="text-sm text-gray-600">Your balance:</span>
            <span className="font-bold text-[#B8562E]">{credits?.total_credits ?? 0}</span>
            {credits?.is_premium && <Crown size={14} className="text-[#C4A235]" />}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <Check size={16} />
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* XP Trade Card */}
          <button
            onClick={handleTradeXP}
            disabled={!canTradeXP || actionLoading === 'trade'}
            className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-purple-500/20 
                       hover:border-purple-500/40 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 
                              flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                  Trade XP
                  {actionLoading === 'trade' && <Loader2 size={14} className="animate-spin" />}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Exchange 200 XP for 1 credit
                </p>
                <p className="text-xs text-purple-600 mt-2 font-medium">
                  You have {xp?.available ?? 0} XP
                </p>
              </div>
            </div>
          </button>

          {/* 1 Credit Pack */}
          <button
            onClick={() => handlePurchase('1_pack')}
            disabled={actionLoading === '1_pack'}
            className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-[#B8562E]/20 
                       hover:border-[#B8562E]/40 hover:shadow-lg disabled:opacity-50 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#B8562E] to-[#E07A4E] 
                              flex items-center justify-center flex-shrink-0">
                <Send size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 group-hover:text-[#B8562E] transition-colors flex items-center gap-2">
                  1 Credit
                  {actionLoading === '1_pack' && <Loader2 size={14} className="animate-spin" />}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Single postscript credit
                </p>
                <p className="text-lg text-[#B8562E] mt-2 font-bold">
                  $5
                </p>
              </div>
            </div>
          </button>

          {/* 5 Credit Pack - Best Value */}
          <button
            onClick={() => handlePurchase('5_pack')}
            disabled={actionLoading === '5_pack'}
            className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border-2 border-[#C4A235] 
                       hover:shadow-lg disabled:opacity-50 text-left relative"
          >
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#C4A235] text-[#5a4e0a] 
                            text-xs font-bold rounded-full shadow-sm">
              BEST VALUE
            </div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C4A235] to-[#B8562E] 
                              flex items-center justify-center flex-shrink-0">
                <Sparkles size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 group-hover:text-[#C4A235] transition-colors flex items-center gap-2">
                  5 Credits
                  {actionLoading === '5_pack' && <Loader2 size={14} className="animate-spin" />}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Save $5 with this bundle
                </p>
                <p className="text-lg text-[#B8562E] mt-2 font-bold">
                  $20 <span className="text-sm text-gray-400 line-through font-normal">$25</span>
                </p>
              </div>
            </div>
          </button>

          {/* Premium Upsell */}
          {!credits?.is_premium && (
            <Link
              href="/dashboard/settings/subscription"
              className="group glass rounded-2xl p-5 hover:bg-white/80 transition-all border border-[#2D5A3D]/20 
                         hover:border-[#2D5A3D]/40 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D5A3D] to-[#5A8A76] 
                                flex items-center justify-center flex-shrink-0">
                  <Crown size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 group-hover:text-[#2D5A3D] transition-colors">
                    Go Premium
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    3 credits/month per seat + unlimited AI
                  </p>
                  <p className="text-xs text-[#2D5A3D] mt-2 font-medium">
                    Starting at $9.99/mo →
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Postscript credits are used when you schedule a future message. Free users get 3 lifetime credits. 
          Premium users get 3 credits per month for each seat on their plan.
        </p>
      </div>
    </div>
  )
}
