'use client'

import { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  UserX, 
  Clock, 
  CheckCircle2, 
  Mail, 
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { SubscriptionSeat, SeatPricing, formatCents } from '@/types/subscription'

interface SeatManagementProps {
  seats: SubscriptionSeat[]
  pricing: SeatPricing[]
  maxSeats: number
  isPremium: boolean
  onInvite: (email: string) => Promise<void>
  onRemove: (seatId: string) => Promise<void>
  onResendInvite: (seatId: string) => Promise<void>
  isLoading?: boolean
}

export function SeatManagement({
  seats,
  pricing,
  maxSeats,
  isPremium,
  onInvite,
  onRemove,
  onResendInvite,
  isLoading = false
}: SeatManagementProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)

  const activeSeats = seats.filter(s => s.status === 'active' || s.status === 'pending')
  const usedSeats = activeSeats.length
  const canAddMore = usedSeats < maxSeats && isPremium

  // Calculate cost breakdown
  const calculateCostBreakdown = () => {
    const baseCost = 2000 // $20 base
    let additionalCost = 0
    
    // Seats 1-2 are included in base (owner + 1 free)
    for (let i = 3; i <= usedSeats; i++) {
      const tier = pricing.find(p => i >= p.min_seat && i <= p.max_seat)
      additionalCost += tier?.price_cents || 0
    }

    return {
      base: baseCost,
      additional: additionalCost,
      total: baseCost + additionalCost
    }
  }

  const costs = calculateCostBreakdown()

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Email is required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Please enter a valid email address')
      return
    }

    setInviteError('')
    setInviteLoading(true)

    try {
      await onInvite(inviteEmail.trim().toLowerCase())
      setInviteEmail('')
      setShowInviteModal(false)
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemove = async (seatId: string) => {
    setActionLoading(seatId)
    try {
      await onRemove(seatId)
    } finally {
      setActionLoading(null)
      setShowRemoveConfirm(null)
    }
  }

  const handleResend = async (seatId: string) => {
    setActionLoading(seatId)
    try {
      await onResendInvite(seatId)
    } finally {
      setActionLoading(null)
    }
  }

  const getSeatCost = (seatNumber: number): number => {
    if (seatNumber <= 2) return 0 // Free seats
    const tier = pricing.find(p => seatNumber >= p.min_seat && seatNumber <= p.max_seat)
    return tier?.price_cents || 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with seat count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#2D5A3D]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Family Seats</h3>
            <p className="text-sm text-gray-500">
              {usedSeats} of {maxSeats} seats used
            </p>
          </div>
        </div>

        {canAddMore && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {/* Seat Progress Bar */}
      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#2D5A3D] to-[#4A3552] transition-all duration-300"
          style={{ width: `${(usedSeats / maxSeats) * 100}%` }}
        />
      </div>

      {/* Cost Breakdown */}
      {isPremium && (
        <div className="bg-[#F5F3EE] rounded-xl p-4">
          <h4 className="font-medium text-[#2d2d2d] mb-3">Monthly Cost Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Premium base (includes 2 seats)</span>
              <span className="font-medium">{formatCents(costs.base)}</span>
            </div>
            {costs.additional > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Additional seats ({usedSeats - 2})</span>
                <span className="font-medium">{formatCents(costs.additional)}</span>
              </div>
            )}
            <div className="border-t border-[#2D5A3D]/20 pt-2 flex justify-between">
              <span className="font-semibold text-[#2d2d2d]">Total</span>
              <span className="font-semibold text-[#2D5A3D]">{formatCents(costs.total)}/mo</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Seats 3-5: $8/mo each • Seats 6-10: $6/mo each
          </p>
        </div>
      )}

      {/* Seats List */}
      <div className="space-y-3">
        {activeSeats.map((seat) => (
          <div 
            key={seat.id}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-[#2D5A3D]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Avatar or Status Icon */}
              {seat.status === 'active' && seat.user ? (
                <div className="w-12 h-12 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center overflow-hidden">
                  {seat.user.avatar_url ? (
                    <img 
                      src={seat.user.avatar_url} 
                      alt={seat.user.full_name || ''} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-[#2D5A3D]">
                      {(seat.user.full_name || seat.user.email)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              )}

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#2d2d2d]">
                    {seat.status === 'active' && seat.user 
                      ? (seat.user.full_name || seat.user.email) 
                      : seat.email}
                  </span>
                  {seat.seat_number === 1 && (
                    <span className="px-2 py-0.5 bg-[#2D5A3D] text-white text-xs rounded-full">
                      Owner
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {seat.status === 'pending' ? (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>Invite pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span>Active • Seat {seat.seat_number}</span>
                      {seat.seat_number > 2 && (
                        <span className="text-[#2D5A3D]">
                          (+{formatCents(getSeatCost(seat.seat_number))}/mo)
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {seat.seat_number !== 1 && (
              <div className="flex items-center gap-2">
                {seat.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(seat.id)}
                    disabled={actionLoading === seat.id}
                  >
                    {actionLoading === seat.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">Resend</span>
                  </Button>
                )}
                
                {showRemoveConfirm === seat.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(seat.id)}
                      disabled={actionLoading === seat.id}
                    >
                      {actionLoading === seat.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRemoveConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRemoveConfirm(seat.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <UserX className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">Remove</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Empty Seat Slots */}
        {isPremium && Array.from({ length: Math.min(3, maxSeats - usedSeats) }).map((_, i) => (
          <div 
            key={`empty-${i}`}
            className="flex items-center justify-between p-4 border-2 border-dashed border-gray-200 rounded-xl opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <span className="text-gray-400">Empty Seat</span>
                <p className="text-sm text-gray-400">
                  Seat {usedSeats + i + 1} • +{formatCents(getSeatCost(usedSeats + i + 1))}/mo
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
            >
              Invite
            </Button>
          </div>
        ))}
      </div>

      {/* Not Premium Message */}
      {!isPremium && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Upgrade to Premium</p>
            <p className="text-sm text-amber-700">
              Family seats are available on the Premium plan. Upgrade to invite up to 9 family members.
            </p>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteEmail('')
          setInviteError('')
        }}
        title="Invite Family Member"
        showDone={false}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Send an invite to add a family member to your subscription. They'll get full access to all Premium features.
          </p>

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  setInviteError('')
                }}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            {inviteError && (
              <p className="mt-2 text-sm text-red-500">{inviteError}</p>
            )}
          </div>

          {/* Cost preview */}
          {usedSeats >= 2 && (
            <div className="bg-[#F5F3EE] rounded-lg p-3 text-sm">
              <p className="text-gray-600">
                Adding this seat will cost{' '}
                <span className="font-semibold text-[#2D5A3D]">
                  +{formatCents(getSeatCost(usedSeats + 1))}/mo
                </span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowInviteModal(false)
                setInviteEmail('')
                setInviteError('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
