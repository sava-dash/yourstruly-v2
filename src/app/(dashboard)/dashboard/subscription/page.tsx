'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Check, X, Sparkles, Users, CreditCard, 
  Plus, Mail, Trash2, Crown, Shield 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/hooks/useSubscription'
import { StorageUsageBar } from '@/components/subscription/StorageUsageBar'
import { 
  SubscriptionPlan, 
  SeatPricing, 
  formatCents, 
  calculateSeatCost,
  calculateTotalMonthlyCost 
} from '@/types/subscription'
import '@/components/subscription/subscription.css'
import '@/styles/page-styles.css'

export default function SubscriptionPage() {
  const { subscription, isLoading, refetch, isPremium } = useSubscription()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [seatPricing, setSeatPricing] = useState<SeatPricing[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    const [plansRes, pricingRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('price_cents'),
      supabase.from('seat_pricing').select('*').order('min_seat')
    ])
    
    if (plansRes.data) setPlans(plansRes.data)
    if (pricingRes.data) setSeatPricing(pricingRes.data)
  }

  const handleUpgrade = async () => {
    // TODO: Integrate with Stripe checkout
    alert('Stripe integration coming soon!')
  }

  const handleInviteSeat = async () => {
    if (!inviteEmail || !subscription) return
    
    setInviting(true)
    try {
      const res = await fetch('/api/subscription/invite-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriptionId: subscription.id,
          email: inviteEmail 
        })
      })
      
      if (res.ok) {
        setInviteEmail('')
        setShowInviteModal(false)
        refetch()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send invite')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveSeat = async (seatId: string) => {
    if (!confirm('Remove this seat? They will lose access immediately.')) return
    
    await fetch('/api/subscription/remove-seat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId })
    })
    
    refetch()
  }

  const getNextSeatPrice = (): number => {
    const currentSeats = subscription?.seats?.filter(s => s.status === 'active').length || 1
    return calculateSeatCost(currentSeats + 1, seatPricing)
  }

  const canAddSeats = isPremium && (subscription?.seats?.length || 0) < 10

  // Feature list for plan comparison
  const features = [
    { key: 'storage', name: 'Storage', free: '10 GB', premium: '100 GB' },
    { key: 'ai_chat', name: 'AI Chat', free: false, premium: true },
    { key: 'video_memories', name: 'Video Memories', free: true, premium: true },
    { key: 'interview_requests', name: 'Interview Requests', free: '3/month', premium: 'Unlimited' },
    { key: 'future_messages', name: 'Future Messages', free: true, premium: true },
    { key: 'future_gifts', name: 'Future Gifts', free: false, premium: true },
    { key: 'marketplace_discount', name: 'Marketplace Discount', free: 'Full price', premium: '20% off' },
    { key: 'family_seats', name: 'Family Seats', free: false, premium: 'Up to 10' },
    { key: 'export_data', name: 'Export Data', free: false, premium: true },
    { key: 'priority_support', name: 'Priority Support', free: false, premium: true },
  ]

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 flex items-center justify-center h-64">
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="subscription-header">
          <h1>Subscription</h1>
          <p>Manage your plan and family seats</p>
        </div>

      {/* Storage Usage */}
      {subscription?.storage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <StorageUsageBar 
            storage={subscription.storage}
            onUpgradeClick={!isPremium ? handleUpgrade : undefined}
          />
        </motion.div>
      )}

      {/* Plan Cards */}
      <div className="plan-cards">
        {plans.map((plan, index) => {
          const isCurrent = subscription?.plan?.id === plan.id
          const isPremiumPlan = plan.name === 'premium'
          
          return (
            <motion.div
              key={plan.id}
              className={`plan-card ${isCurrent ? 'plan-current' : ''} ${isPremiumPlan ? 'plan-premium' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {isCurrent && <div className="plan-badge">Current Plan</div>}
              
              <div className="plan-name">{plan.display_name}</div>
              
              <div className="plan-price">
                <span className="plan-price-amount">
                  {plan.price_cents === 0 ? 'Free' : formatCents(plan.price_cents)}
                </span>
                {plan.price_cents > 0 && (
                  <span className="plan-price-period">/month</span>
                )}
              </div>
              
              <p className="plan-description">{plan.description}</p>
              
              <ul className="plan-features">
                {features.map(feature => {
                  const value = isPremiumPlan ? feature.premium : feature.free
                  const included = value === true || (typeof value === 'string' && value !== 'Full price')
                  
                  return (
                    <li key={feature.key} className="plan-feature">
                      <div className={`plan-feature-icon ${included ? 'included' : 'excluded'}`}>
                        {included ? <Check size={12} /> : <X size={12} />}
                      </div>
                      <span>{feature.name}</span>
                      {typeof value === 'string' && (
                        <span style={{ marginLeft: 'auto', color: '#666', fontSize: 13 }}>
                          {value}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              
              {!isCurrent && (
                <button 
                  className={`plan-cta ${isPremiumPlan ? 'plan-cta-primary' : 'plan-cta-secondary'}`}
                  onClick={isPremiumPlan ? handleUpgrade : undefined}
                >
                  {isPremiumPlan ? (
                    <>
                      <Sparkles size={18} style={{ marginRight: 8 }} />
                      Upgrade to Premium
                    </>
                  ) : (
                    'Downgrade'
                  )}
                </button>
              )}
              
              {isCurrent && (
                <button className="plan-cta plan-cta-secondary" disabled>
                  <Shield size={18} style={{ marginRight: 8 }} />
                  Current Plan
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Family Seats - Premium only */}
      {isPremium && (
        <motion.div
          className="seats-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="seats-header">
            <div>
              <div className="seats-title">
                <Users size={20} style={{ marginRight: 8 }} />
                Family Seats
              </div>
              <div className="seats-subtitle">
                Share your premium benefits with family members
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: '#666' }}>Monthly Cost</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>
                {formatCents(subscription?.monthly_cost_cents || 0)}
              </div>
            </div>
          </div>

          <div className="seats-list">
            {/* Owner seat */}
            <div className="seat-item">
              <div className="seat-number">1</div>
              <div className="seat-info">
                <div className="seat-name">You (Owner)</div>
                <div className="seat-email">{subscription?.user_id}</div>
              </div>
              <div className="seat-status seat-status-active">
                <Crown size={14} style={{ marginRight: 4 }} />
                Owner
              </div>
              <div className="seat-price seat-price-free">Included</div>
            </div>

            {/* Existing seats */}
            {subscription?.seats
              ?.filter(s => s.seat_number > 1)
              .map(seat => {
                const price = calculateSeatCost(seat.seat_number, seatPricing)
                const isFree = price === 0
                
                return (
                  <div key={seat.id} className="seat-item">
                    <div className={`seat-number ${isFree ? 'seat-free' : 'seat-paid'}`}>
                      {seat.seat_number}
                    </div>
                    <div className="seat-info">
                      <div className="seat-name">
                        {seat.user?.full_name || seat.email || 'Invited'}
                      </div>
                      <div className="seat-email">{seat.email}</div>
                    </div>
                    <div className={`seat-status seat-status-${seat.status}`}>
                      {seat.status === 'active' ? 'Active' : 'Pending'}
                    </div>
                    <div className={`seat-price ${isFree ? 'seat-price-free' : ''}`}>
                      {isFree ? 'Free' : `+${formatCents(price)}/mo`}
                    </div>
                    <div className="seat-actions">
                      <button 
                        className="seat-action-btn"
                        onClick={() => handleRemoveSeat(seat.id)}
                        style={{ color: '#dc2626' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}

            {/* Add seat button */}
            {canAddSeats && (
              <button 
                className="add-seat-btn"
                onClick={() => setShowInviteModal(true)}
              >
                <Plus size={18} />
                <span>Add Family Member</span>
                {getNextSeatPrice() > 0 && (
                  <span style={{ marginLeft: 'auto', color: '#666' }}>
                    +{formatCents(getNextSeatPrice())}/mo
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Seat pricing info */}
          <div style={{ marginTop: 20, fontSize: 13, color: '#666' }}>
            <strong>Seat Pricing:</strong> 1st seat free with Premium • 
            Seats 3-5: $8/mo each • Seats 6-10: $6/mo each
          </div>
        </motion.div>
      )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              width: '100%',
              maxWidth: 400
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 8 }}>Invite Family Member</h3>
            <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
              They'll receive an email to join your premium plan.
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="family@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteSeat}
                disabled={!inviteEmail || inviting}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#2D5A3D',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: (!inviteEmail || inviting) ? 0.5 : 1
                }}
              >
                <Mail size={16} style={{ marginRight: 8 }} />
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
