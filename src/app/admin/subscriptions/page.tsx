'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, Save, RefreshCw, Users, Package, 
  ToggleLeft, ToggleRight, Settings, TrendingUp
} from 'lucide-react'
// Admin client is server-side only - this page uses API routes
import { 
  SubscriptionPlan, 
  SeatPricing, 
  FeatureDefinition,
  formatCents 
} from '@/types/subscription'
import '@/components/subscription/subscription.css'

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [seatPricing, setSeatPricing] = useState<SeatPricing[]>([])
  const [features, setFeatures] = useState<FeatureDefinition[]>([])
  const [stats, setStats] = useState({
    total_users: 0,
    free_users: 0,
    premium_users: 0,
    total_seats: 0,
    monthly_revenue: 0
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'pricing' | 'features' | 'stats'>('pricing')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const res = await fetch('/api/admin/subscriptions')
    const data = await res.json()
    
    setPlans(data.plans || [])
    setSeatPricing(data.seatPricing || [])
    setFeatures(data.features || [])
    setStats(data.stats || {})
  }

  const handlePlanPriceChange = (planId: string, priceCents: number) => {
    setPlans(plans.map(p => 
      p.id === planId ? { ...p, price_cents: priceCents } : p
    ))
  }

  const handlePlanStorageChange = (planId: string, storageGB: number) => {
    setPlans(plans.map(p => 
      p.id === planId ? { ...p, storage_limit_bytes: storageGB * 1024 * 1024 * 1024 } : p
    ))
  }

  const handleSeatPriceChange = (pricingId: string, priceCents: number) => {
    setSeatPricing(seatPricing.map(s => 
      s.id === pricingId ? { ...s, price_cents: priceCents } : s
    ))
  }

  const handleFeatureToggle = (featureId: string, tier: 'free' | 'premium', value: boolean) => {
    setFeatures(features.map(f => 
      f.id === featureId 
        ? { ...f, [tier === 'free' ? 'default_free' : 'default_premium']: value }
        : f
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans, seatPricing, features })
      })
      alert('Changes saved!')
    } catch (err) {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'features', label: 'Feature Toggles', icon: Settings },
    { id: 'stats', label: 'Statistics', icon: TrendingUp }
  ]

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Subscription Management</h1>
          <p style={{ color: '#666' }}>Manage pricing, features, and seat costs</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              border: 'none',
              borderRadius: 8,
              background: '#2D5A3D',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              border: 'none',
              borderRadius: 8,
              background: activeTab === tab.id ? '#2D5A3D' : '#f3f4f6',
              color: activeTab === tab.id ? 'white' : '#666',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Plan Pricing */}
          <div className="admin-pricing">
            <div className="admin-pricing-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={20} />
                Plan Pricing
              </h3>
            </div>
            <div className="admin-pricing-grid">
              {plans.map(plan => (
                <div key={plan.id} className="admin-price-field">
                  <label className="admin-price-label">{plan.display_name} Plan (monthly)</label>
                  <div className="admin-price-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={(plan.price_cents / 100).toFixed(2)}
                      onChange={e => handlePlanPriceChange(plan.id, Math.round(parseFloat(e.target.value) * 100))}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="admin-pricing-grid" style={{ marginTop: 16 }}>
              {plans.map(plan => (
                <div key={`storage-${plan.id}`} className="admin-price-field">
                  <label className="admin-price-label">{plan.display_name} Storage Limit (GB)</label>
                  <div className="admin-price-input">
                    <input
                      type="number"
                      value={Math.round(plan.storage_limit_bytes / (1024 * 1024 * 1024))}
                      onChange={e => handlePlanStorageChange(plan.id, parseInt(e.target.value))}
                      min="1"
                    />
                    <span>GB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seat Pricing */}
          <div className="admin-pricing">
            <div className="admin-pricing-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} />
                Seat Pricing
              </h3>
            </div>
            <div className="admin-pricing-grid">
              {seatPricing.map(tier => (
                <div key={tier.id} className="admin-price-field">
                  <label className="admin-price-label">
                    Seats {tier.min_seat}-{tier.max_seat} (per seat/month)
                  </label>
                  <div className="admin-price-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={(tier.price_cents / 100).toFixed(2)}
                      onChange={e => handleSeatPriceChange(tier.id, Math.round(parseFloat(e.target.value) * 100))}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="admin-pricing">
          <div className="admin-pricing-header">
            <h3>Feature Access by Plan</h3>
            <p style={{ color: '#666', fontSize: 13 }}>
              Toggle which features are available for each subscription tier
            </p>
          </div>

          {/* Group by category */}
          {['core', 'ai', 'social', 'marketplace', 'general'].map(category => {
            const categoryFeatures = features.filter(f => f.category === category)
            if (categoryFeatures.length === 0) return null
            
            return (
              <div key={category} style={{ marginBottom: 24 }}>
                <h4 style={{ 
                  textTransform: 'capitalize', 
                  marginBottom: 12, 
                  color: '#666',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  {category}
                </h4>
                {categoryFeatures.map(feature => (
                  <div key={feature.id} className="admin-feature-toggle">
                    <div className="admin-feature-info">
                      <div className="admin-feature-name">{feature.name}</div>
                      <div className="admin-feature-desc">{feature.description}</div>
                    </div>
                    <div className="admin-feature-toggles">
                      <label className="admin-toggle-label">
                        <span>Free</span>
                        <button
                          onClick={() => handleFeatureToggle(feature.id, 'free', !feature.default_free)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: feature.default_free ? '#16a34a' : '#999'
                          }}
                        >
                          {feature.default_free ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                      </label>
                      <label className="admin-toggle-label">
                        <span>Premium</span>
                        <button
                          onClick={() => handleFeatureToggle(feature.id, 'premium', !feature.default_premium)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: feature.default_premium ? '#16a34a' : '#999'
                          }}
                        >
                          {feature.default_premium ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <StatCard label="Total Users" value={stats.total_users} />
          <StatCard label="Free Users" value={stats.free_users} />
          <StatCard label="Premium Users" value={stats.premium_users} />
          <StatCard label="Total Seats" value={stats.total_seats} />
          <StatCard 
            label="Monthly Revenue" 
            value={formatCents(stats.monthly_revenue)} 
            highlight 
          />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: highlight ? 'linear-gradient(135deg, #2D5A3D, #345544)' : 'white',
        borderRadius: 16,
        padding: 24,
        color: highlight ? 'white' : '#333'
      }}
    >
      <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700 }}>{value}</div>
    </motion.div>
  )
}
