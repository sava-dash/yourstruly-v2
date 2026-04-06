'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, ChevronLeft, Crown, Shield, User, Search, Clock } from 'lucide-react'
import Link from 'next/link'
import CreateCircleModal from '@/components/circles/CreateCircleModal'
import MemberAvatarStack from '@/components/circles/MemberAvatarStack'
import '@/styles/page-styles.css'
import { getCategoryIcon } from '@/lib/dashboard/icons'

// ============================================
// TYPES
// ============================================
type CircleRole = 'owner' | 'admin' | 'member'

interface CircleMember {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface Circle {
  id: string
  name: string
  description?: string
  member_count?: number
  members?: CircleMember[]
  my_role: CircleRole
  created_at: string
  joined_at?: string
}

// ============================================
// MAIN PAGE
// ============================================
export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCircles()
  }, [])

  const loadCircles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/circles')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load circles')
      }
      
      setCircles(data.circles || [])
    } catch (err) {
      console.error('Error loading circles:', err)
      setError(err instanceof Error ? err.message : 'Failed to load circles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCircle = async (data: { name: string; description: string }) => {
    const response = await fetch('/api/circles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      alert(result.error || 'Failed to create circle')
      throw new Error(result.error || 'Failed to create circle')
    }
    
    // Add the new circle to the list with owner role
    const newCircle: Circle = {
      ...result.circle,
      my_role: 'owner',
      member_count: 1
    }
    setCircles([newCircle, ...circles])
    setShowCreateModal(false)
  }

  const filteredCircles = circles.filter(circle =>
    circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    circle.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: CircleRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#C4A235]/20 text-[#8a7c08]">
            <Crown size={12} />
            Owner
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2D5A3D]/15 text-[#2D5A3D]">
            <Shield size={12} />
            Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#8DACAB]/20 text-[#5d8585]">
            <User size={12} />
            Member
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 loading-container">
          <div className="loading-text">Loading circles...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadCircles}
            className="text-[#2D5A3D] hover:underline"
          >
            Try again
          </button>
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
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="page-header mb-0">
            <Link href="/dashboard" className="page-header-back">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="page-header-title" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>My Circles</h1>
              <p className="page-header-subtitle">Share memories and knowledge with trusted groups</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Create Circle
          </button>
        </div>

        {/* Search */}
        {circles.length > 0 && (
          <div className="relative max-w-md mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50" />
            <input
              type="text"
              aria-label="Search" placeholder="Search circles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input !pl-12"
            />
          </div>
        )}

        {/* Circles Grid */}
        {circles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={32} className="text-[#2D5A3D]" />
            </div>
            <h3 className="empty-state-title">Create a circle for the people closest to you</h3>
            <p className="empty-state-text">
              Circles let you share memories and wisdom with family, friends, or other trusted groups.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus size={16} />
              Create Your First Circle
            </button>
          </div>
        ) : filteredCircles.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text mb-2">No circles match your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#2D5A3D] hover:text-[#234A31] text-sm font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredCircles.map(circle => (
              <Link
                key={circle.id}
                href={`/dashboard/circles/${circle.id}`}
                className="content-card content-card-interactive group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
                      <Users size={24} className="text-[#2D5A3D]" />
                    </div>
                    <div>
                      <h3 className="text-[#2d2d2d] font-semibold text-lg">{circle.name}</h3>
                    </div>
                  </div>
                  {getRoleBadge(circle.my_role)}
                </div>

                {/* Prominent member count */}
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#2D5A3D]/5 rounded-lg">
                  <Users size={16} className="text-[#2D5A3D]" />
                  <span className="text-[#2D5A3D] font-semibold text-sm">
                    {circle.member_count || 1}
                  </span>
                  <span className="text-[#666] text-sm">
                    member{(circle.member_count || 1) !== 1 ? 's' : ''}
                  </span>
                </div>

                {circle.description && (
                  <p className="text-[#666] text-sm line-clamp-2 mb-3">
                    {circle.description}
                  </p>
                )}

                {/* Recent activity */}
                <div className="flex items-center gap-1.5 mb-4 text-xs text-[#94A09A]">
                  <Clock size={12} />
                  <span>
                    {(() => {
                      const created = new Date(circle.created_at)
                      const now = new Date()
                      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                      if (diffDays < 1) return 'Created today'
                      if (diffDays < 7) return `Active ${diffDays}d ago`
                      if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)}w ago`
                      return `Created ${created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    })()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#2D5A3D]/10">
                  {circle.members && circle.members.length > 0 ? (
                    <MemberAvatarStack
                      members={circle.members}
                      totalCount={circle.member_count || circle.members.length}
                      maxDisplay={4}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-[#888]">No members yet</span>
                  )}
                  <span className="text-sm text-[#2D5A3D] font-medium group-hover:underline">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Circle Modal */}
      {showCreateModal && (
        <CreateCircleModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateCircle}
        />
      )}
    </div>
  )
}
