'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Users, Crown, Shield, User, Search, X, Grid3X3 } from 'lucide-react'
import Link from 'next/link'
import CreateCircleModal from '@/components/circles/CreateCircleModal'
import '@/styles/page-styles.css'

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

type SortKey = 'all' | 'recent' | 'az' | 'mine'

// ============================================
// MAIN PAGE
// ============================================
export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('all')

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
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      alert(result.error || 'Failed to create circle')
      throw new Error(result.error || 'Failed to create circle')
    }

    const newCircle: Circle = {
      ...result.circle,
      my_role: 'owner',
      member_count: 1,
    }
    setCircles([newCircle, ...circles])
    setShowCreateModal(false)
  }

  const filteredCircles = useMemo(() => {
    const q = searchQuery.toLowerCase()
    let list = circles.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      const matchesSort = sortKey === 'mine' ? c.my_role === 'owner' : true
      return matchesSearch && matchesSort
    })
    if (sortKey === 'recent') {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    } else if (sortKey === 'az') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [circles, searchQuery, sortKey])

  // Stats counter — totals for the header
  const totalMembers = circles.reduce((sum, c) => sum + (c.member_count || 0), 0)
  const ownedCount = circles.filter((c) => c.my_role === 'owner').length

  // Editorial filter pills — color-coded to match the my-story system.
  const FILTERS: { key: SortKey; label: string; bg: string; ink: string }[] = [
    { key: 'all',    label: 'ALL',         bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
    { key: 'recent', label: 'RECENT',      bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    { key: 'az',     label: 'A–Z',         bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
    { key: 'mine',   label: 'MY CIRCLES',  bg: 'var(--ed-ink, #111)',       ink: '#fff' },
  ]

  // Card flag color cycles per circle so the grid feels graphical.
  const CARD_PALETTE = [
    'var(--ed-red, #E23B2E)',
    'var(--ed-blue, #2A5CD3)',
    'var(--ed-yellow, #F2C84B)',
    'var(--ed-ink, #111)',
  ]

  const formatActive = (createdAt: string): string => {
    const created = new Date(createdAt)
    const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 1) return 'ACTIVE TODAY'
    if (days < 7) return `ACTIVE ${days}D AGO`
    if (days < 30) return `ACTIVE ${Math.floor(days / 7)}W AGO`
    return `CREATED ${created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}`
  }

  // ──────── Loading state ────────
  if (loading) {
    return (
      <div
        className="relative min-h-screen"
        style={{ background: 'var(--ed-cream, #F3ECDC)', paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid var(--ed-ink, #111)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    )
  }

  // ──────── Error state ────────
  if (error) {
    return (
      <div
        className="relative min-h-screen"
        style={{ background: 'var(--ed-cream, #F3ECDC)', paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <p
            className="text-[11px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)] mb-3"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
          >
            COULD NOT LOAD CIRCLES
          </p>
          <p className="text-[14px] text-[var(--ed-muted,#6F6B61)] mb-5">{error}</p>
          <button
            onClick={loadCircles}
            className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              background: 'var(--ed-red, #E23B2E)',
              color: '#fff',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--ed-cream, #F3ECDC)',
        paddingTop: 80,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ───── Editorial header ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-6">
          <div>
            <h1
              className="text-[var(--ed-ink,#111)] leading-[0.85] tracking-[-0.02em] flex items-start gap-4"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(56px, 9vw, 116px)',
              }}
            >
              <span>
                MY<br />CIRCLES
              </span>
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: 36, height: 36, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 12 }}
              />
            </h1>
            <p className="mt-4 text-[14px] text-[var(--ed-muted,#6F6B61)] max-w-md">
              Share memories and knowledge with trusted groups.
            </p>
            {circles.length > 0 && (
              <div
                className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[11px] sm:text-[12px] tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-red, #E23B2E)', fontWeight: 700 }}>
                    {circles.length}
                  </span>
                  <span className="text-[var(--ed-ink,#111)]">{circles.length === 1 ? 'CIRCLE' : 'CIRCLES'}</span>
                </span>
                <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-blue, #2A5CD3)', fontWeight: 700 }}>
                    {totalMembers}
                  </span>
                  <span className="text-[var(--ed-ink,#111)]">MEMBERS</span>
                </span>
                {ownedCount > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-yellow, #F2C84B)', fontWeight: 700, WebkitTextStroke: '1px var(--ed-ink, #111)' }}>
                        {ownedCount}
                      </span>
                      <span className="text-[var(--ed-ink,#111)]">OWNED</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right column: + CREATE + search */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <Plus size={13} strokeWidth={3} />
                CREATE NEW CIRCLE
              </button>
            </div>

            <div
              className="flex items-stretch w-full lg:max-w-md"
              style={{ border: '2px solid var(--ed-ink, #111)', background: 'var(--ed-paper, #FFFBF1)', borderRadius: 2 }}
            >
              <div className="flex items-center flex-1 px-3 gap-2">
                <Search size={16} className="text-[var(--ed-muted,#6F6B61)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search circles…"
                  className="w-full py-2.5 bg-transparent text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[var(--ed-muted,#6F6B61)] hover:text-[var(--ed-ink,#111)]"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-label="Search"
                className="flex items-center justify-center px-4"
                style={{ background: 'var(--ed-red, #E23B2E)', color: '#fff', borderLeft: '2px solid var(--ed-ink, #111)' }}
              >
                <Search size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* ───── Filter pills + view toggle ───── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const isActive = sortKey === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setSortKey(f.key)}
                  className="px-4 py-2 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: isActive ? f.bg : 'var(--ed-paper, #FFFBF1)',
                    color: isActive ? f.ink : 'var(--ed-ink, #111)',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 999,
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <div
            className="flex items-stretch"
            style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2, background: 'var(--ed-paper, #FFFBF1)' }}
          >
            <button
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'var(--ed-ink, #111)',
                color: '#fff',
              }}
              aria-label="Grid view"
            >
              <Grid3X3 size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">GRID VIEW</span>
            </button>
          </div>
        </div>

        {/* ───── Card grid ───── */}
        {circles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center py-20 px-6"
            style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
          >
            <p
              className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              CREATE A CIRCLE
            </p>
            <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-6 max-w-sm">
              Circles let you share memories and wisdom with family, friends, or other trusted groups.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <Plus size={13} strokeWidth={3} />
              CREATE YOUR FIRST CIRCLE
            </button>
          </div>
        ) : filteredCircles.length === 0 ? (
          <div
            className="text-center py-16 px-6"
            style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
          >
            <p
              className="text-[11px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-3"
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            >
              NO MATCHES
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSortKey('all') }}
              className="text-[11px] tracking-[0.18em] underline text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              CLEAR FILTERS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCircles.map((circle, idx) => {
              const flag = CARD_PALETTE[idx % CARD_PALETTE.length]
              const memberCount = circle.member_count ?? circle.members?.length ?? 1

              return (
                <Link
                  key={circle.id}
                  href={`/dashboard/circles/${circle.id}`}
                  className="relative block transition-transform hover:-translate-y-0.5"
                  style={{
                    background: 'var(--ed-paper, #FFFBF1)',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  {/* Top-left triangular flag — same idiom as contacts cards */}
                  <span
                    aria-hidden
                    className="absolute top-0 left-0"
                    style={{
                      width: 32,
                      height: 32,
                      background: flag,
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                      borderRight: '2px solid var(--ed-ink, #111)',
                    }}
                  />

                  {/* Role badge — top-right */}
                  <span
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-[0.16em]"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background:
                        circle.my_role === 'owner'
                          ? 'var(--ed-yellow, #F2C84B)'
                          : circle.my_role === 'admin'
                          ? 'var(--ed-blue, #2A5CD3)'
                          : 'var(--ed-paper, #FFFBF1)',
                      color: circle.my_role === 'owner' ? 'var(--ed-ink, #111)' : circle.my_role === 'admin' ? '#fff' : 'var(--ed-ink, #111)',
                      border: '1.5px solid var(--ed-ink, #111)',
                      borderRadius: 999,
                    }}
                  >
                    {circle.my_role === 'owner' ? <Crown size={10} /> : circle.my_role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                    {circle.my_role.toUpperCase()}
                  </span>

                  <div className="p-4 sm:p-5 pt-8">
                    <h3
                      className="text-[16px] sm:text-[17px] text-[var(--ed-ink,#111)] truncate leading-tight mb-1"
                      style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
                    >
                      {circle.name.toUpperCase()}
                    </h3>

                    {/* Member-avatar mini grid as a graphical element when present */}
                    {circle.members && circle.members.length > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        {circle.members.slice(0, 4).map((m, i) => (
                          <span
                            key={m.id}
                            className="flex items-center justify-center text-[10px] font-bold"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              background: CARD_PALETTE[(idx + i) % CARD_PALETTE.length],
                              color:
                                CARD_PALETTE[(idx + i) % CARD_PALETTE.length] === 'var(--ed-yellow, #F2C84B)'
                                  ? 'var(--ed-ink, #111)'
                                  : '#fff',
                              border: '1.5px solid var(--ed-ink, #111)',
                              fontFamily: 'var(--font-mono, monospace)',
                              marginLeft: i === 0 ? 0 : -6,
                              zIndex: 4 - i,
                            }}
                          >
                            {(m.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {memberCount > 4 && (
                          <span
                            className="ml-1 text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)]"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            +{memberCount - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {circle.description && (
                      <p className="text-[13px] text-[var(--ed-muted,#6F6B61)] line-clamp-2 mb-3">
                        {circle.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-3">
                      <p
                        className="text-[10px] tracking-[0.18em] text-[var(--ed-ink,#111)]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        {memberCount} {memberCount === 1 ? 'MEMBER' : 'MEMBERS'}
                      </p>
                      <p
                        className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        {formatActive(circle.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Circle Modal — preserved as-is */}
      {showCreateModal && (
        <CreateCircleModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateCircle}
        />
      )}
    </div>
  )
}
