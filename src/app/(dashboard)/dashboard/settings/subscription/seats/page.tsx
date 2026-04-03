'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { SeatManagement } from '@/components/subscription/SeatManagement'
import { Button } from '@/components/ui/button'
import { SubscriptionSeat, SeatPricing, formatCents } from '@/types/subscription'

interface SeatsData {
  seats: SubscriptionSeat[]
  subscription: {
    id: string
    status: string
    plan: {
      id: string
      name: string
      display_name: string
      price_cents: number
    }
  } | null
  pricing: SeatPricing[]
  maxSeats: number
}

export default function SeatManagementPage() {
  const [data, setData] = useState<SeatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchSeats = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/subscription/seats')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load seats')
      }

      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleInvite = async (email: string) => {
    const response = await fetch('/api/subscription/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send invite')
    }

    setNotification({ type: 'success', message: `Invite sent to ${email}` })
    await fetchSeats()
  }

  const handleRemove = async (seatId: string) => {
    const response = await fetch(`/api/subscription/seats?seatId=${seatId}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to remove seat')
    }

    setNotification({ type: 'success', message: 'Member removed from subscription' })
    await fetchSeats()
  }

  const handleResendInvite = async (seatId: string) => {
    const response = await fetch('/api/subscription/seats', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to resend invite')
    }

    setNotification({ type: 'success', message: 'Invite resent successfully' })
  }

  const isPremium = data?.subscription?.plan?.name === 'premium' && data?.subscription?.status === 'active'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Seats</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchSeats}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link 
        href="/dashboard/settings/subscription"
        className="inline-flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Subscription
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2d2d2d]">Family Seats</h1>
        <p className="text-gray-500 mt-1">
          Invite family members to share your Premium subscription
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' 
            : 'bg-red-50 text-red-600'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Current Plan Info */}
      {!isPremium && (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#2d2d2d] mb-2">Upgrade Required</h2>
              <p className="text-gray-600 mb-4">
                Family seats are available on the Premium plan ($20/mo). You can invite up to 9 family members to share all Premium features.
              </p>
              <Link href="/dashboard/settings/subscription">
                <Button>View Plans</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="glass-card p-6">
        <SeatManagement
          seats={data?.seats || []}
          pricing={data?.pricing || []}
          maxSeats={data?.maxSeats || 10}
          isPremium={isPremium}
          onInvite={handleInvite}
          onRemove={handleRemove}
          onResendInvite={handleResendInvite}
          isLoading={isLoading}
        />
      </div>

      {/* Info Cards */}
      {isPremium && (
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-[#2d2d2d] mb-2">What members get</h3>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>✓ AI Chat with family essences</li>
              <li>✓ Create and share video memories</li>
              <li>✓ Send interview questions</li>
              <li>✓ 20% marketplace discount</li>
              <li>✓ 100GB cloud storage</li>
            </ul>
          </div>
          <div className="glass-card p-5">
            <h3 className="font-semibold text-[#2d2d2d] mb-2">Seat Pricing</h3>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>• Seats 1-2: Included free</li>
              <li>• Seats 3-5: $8/month each</li>
              <li>• Seats 6-10: $6/month each</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Maximum 10 seats per subscription
            </p>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mt-8 glass-card p-6">
        <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-[#2d2d2d] mb-1">How do invites work?</h3>
            <p className="text-sm text-gray-500">
              When you invite someone, they&apos;ll receive an email with a link to accept. They can create an account or sign in with an existing one.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[#2d2d2d] mb-1">What happens when I remove someone?</h3>
            <p className="text-sm text-gray-500">
              They&apos;ll lose access to Premium features but keep their own content. You&apos;ll stop being charged for their seat.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[#2d2d2d] mb-1">Can members see each other&apos;s content?</h3>
            <p className="text-sm text-gray-500">
              No, each member has their own private account. Shared content must be explicitly shared through family circles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
