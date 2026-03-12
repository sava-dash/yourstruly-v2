'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { MapPin, Users, Calendar, Search } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  thumbnail?: string
  link: string
  metadata?: {
    location?: string
    tagged_people?: string[]
  }
}

type CategoryFilter = 'all' | 'memories' | 'wisdom' | 'photos' | 'interviews' | 'shared'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'memories', label: 'Memories' },
  { id: 'wisdom', label: 'Wisdom' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'photos', label: 'Photos' },
  { id: 'shared', label: 'Shared with me' },
] as const

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  memory_created: { label: 'Memory', color: '#FF5C34' },
  memory_shared: { label: 'Shared Memory', color: '#FF5C34' },
  wisdom_created: { label: 'Wisdom', color: '#3448FF' },
  wisdom_shared: { label: 'Shared Wisdom', color: '#3448FF' },
  interview_response: { label: 'Interview', color: '#34D7FF' },
  photos_uploaded: { label: 'Photo', color: '#FFB020' },
  contact_added: { label: 'Contact', color: '#00B87C' },
  circle_content: { label: 'Circle', color: '#34D7FF' },
}

function MasonryTile({ activity, index, isDarkMode }: { activity: ActivityItem; index: number; isDarkMode: boolean }) {
  const tileRef = useRef<HTMLAnchorElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (tileRef.current) {
      gsap.to(tileRef.current, {
        y: -4,
        duration: 0.3,
        ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (tileRef.current) {
      gsap.to(tileRef.current, {
        y: 0,
        duration: 0.3,
        ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
      })
    }
  }

  const getCardClass = () => {
    // Balanced pattern to minimize gaps: mostly regular with strategic large/wide/medium
    const patterns = [
      'large',    // 0: 2x2
      '',         // 1: regular
      '',         // 2: regular  
      'medium',   // 3: 1x2
      '',         // 4: regular
      '',         // 5: regular
      'wide',     // 6: 2x1
      '',         // 7: regular
      '',         // 8: regular
      '',         // 9: regular
      '',         // 10: regular
      'medium',   // 11: 1x2
      '',         // 12: regular
      'wide',     // 13: 2x1
      '',         // 14: regular
      '',         // 15: regular
    ]
    return patterns[index % patterns.length]
  }

  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.memory_created

  return (
    <div className={`card-animation-layer ${getCardClass()}`}>
      <Link
        href={activity.link}
        ref={tileRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="card block relative overflow-hidden rounded-xl"
        style={{ 
          backgroundColor: isDarkMode ? '#242424' : '#FFFFFF',
          border: isHovered ? '1px solid #34D7FF' : isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)',
          transition: 'border 0.3s ease',
          boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
      {/* Card Image */}
      {activity.thumbnail && (
        <div 
          className="card-image"
          style={{
            backgroundImage: `url(${activity.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))'
          }} />
        </div>
      )}

      {/* Card Content */}
      <div className="card-content">
        {/* Category Meta */}
        <div 
          className="card-meta"
          style={{ color: config.color }}
        >
          {config.label}
        </div>

        {/* Title */}
        <h3 className="card-title">
          {activity.title || 'Untitled'}
        </h3>

        {/* Description if no image */}
        {!activity.thumbnail && activity.description && (
          <p className="card-description">
            {activity.description}
          </p>
        )}

        {/* Card Details */}
        <div className="card-details">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={10} />
            <span className="card-date">{format(new Date(activity.timestamp), 'MMM d, yyyy')}</span>
          </div>
          {activity.metadata?.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 1 auto', minWidth: 0 }}>
              <MapPin size={10} style={{ flexShrink: 0 }} />
              <span className="card-location" style={{ 
                fontSize: '10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{activity.metadata.location}</span>
            </div>
          )}
        </div>
      </div>
      </Link>
    </div>
  )
}

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [userFirstName, setUserFirstName] = useState<string>('')
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUserName()
    fetchActivities()
  }, [])

  const fetchUserName = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || ''
        const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)
        setUserFirstName(capitalized)
      }
    } catch (err) {
      console.error('Error fetching user name:', err)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity?limit=50')
      if (res.ok) {
        const data = await res.json()
        const filtered = (data.activities || []).filter((a: ActivityItem) => a.type !== 'xp_earned')
        setActivities(filtered)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const animateIn = () => {
    // Scroll-driven animation handles the entrance effect now
    // This is just for filter transitions
    if (!gridRef.current) return
    const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
    
    layers.forEach((layer) => {
      gsap.fromTo(layer, 
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
    })
  }

  const filterActivities = (category: CategoryFilter) => {
    let filtered = activities

    if (category === 'interviews') {
      filtered = activities.filter(a => a.type === 'interview_response')
    } else if (category === 'memories') {
      filtered = activities.filter(a => a.type === 'memory_created' || a.type === 'memory_shared')
    } else if (category === 'wisdom') {
      filtered = activities.filter(a => a.type === 'wisdom_created' || a.type === 'wisdom_shared')
    } else if (category === 'photos') {
      filtered = activities.filter(a => a.type === 'photos_uploaded')
    } else if (category === 'shared') {
      filtered = activities.filter(a => a.type.includes('_shared'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.metadata?.location?.toLowerCase().includes(q)
      )
    }

    if (gridRef.current && filteredActivities.length > 0) {
      const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
      gsap.to(layers, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => setFilteredActivities(filtered)
      })
    } else {
      setFilteredActivities(filtered)
    }
  }

  useEffect(() => {
    filterActivities(activeCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, activeCategory, searchQuery])

  useEffect(() => {
    if (filteredActivities.length > 0) {
      setTimeout(() => {
        animateIn()
        setupScrollAnimation()
      }, 50)
    }
  }, [filteredActivities])

  const setupScrollAnimation = () => {
    if (!gridRef.current) return
    
    const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.fromTo(entry.target,
            {
              scale: 0.85,
              rotate: 5,
              opacity: 0.3
            },
            {
              scale: 1,
              rotate: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
            }
          )
          observer.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    })
    
    layers.forEach((layer) => observer.observe(layer))
    
    return () => observer.disconnect()
  }

  return (
    <div className="feed-page" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="feed-header">
        <div className="header-content">
          <div style={{ marginTop: '200px', marginBottom: '40px' }}>
            {userFirstName && (
              <h1 className="welcome-heading">
                Hey {userFirstName}
              </h1>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
          <div className="header-controls">
            <div className="filter-tags">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as CategoryFilter)}
                  className={`tag ${activeCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="feed-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="empty-state">
            <p>No items found</p>
          </div>
        ) : (
          <div ref={gridRef} className="masonry-grid">
            {filteredActivities.map((activity, index) => (
              <MasonryTile key={activity.id} activity={activity} index={index} isDarkMode={isDarkMode} />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .feed-page {
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .feed-page[data-theme="dark"] {
          background-color: #1A1A1A;
          color: #F5F5F5;
        }

        .feed-page[data-theme="light"] {
          background-color: #F8FAFC;
          color: #1A1A1A;
        }

        .feed-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
          padding: 24px 60px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .feed-header {
          background: rgba(26, 26, 26, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .feed-header {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .theme-toggle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: currentColor;
        }

        .feed-page[data-theme="light"] .theme-toggle {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .theme-toggle:hover {
          background: rgba(255, 92, 52, 0.1);
          border-color: #FF5C34;
          color: #FF5C34;
        }

        .header-content {
          max-width: 1920px;
          margin: 0 auto;
        }

        .page-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 700;
          font-size: 32px;
          margin: 0;
          letter-spacing: -0.5px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .page-title {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .page-title {
          color: #1A1A1A;
        }

        .welcome-heading {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 600;
          font-size: 4rem;
          margin: 0;
          letter-spacing: -1px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .welcome-heading {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .welcome-heading {
          color: #1A1A1A;
        }

        @media (max-width: 768px) {
          .welcome-heading {
            font-size: 3rem;
          }
        }

        .header-controls {
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tag {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .feed-page[data-theme="dark"] .tag {
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #aaa;
        }

        .feed-page[data-theme="light"] .tag {
          border: 1px solid rgba(0,0,0,0.1);
          background: transparent;
          color: #666;
        }

        .tag.active {
          border-color: #FF5C34 !important;
          color: #FF5C34 !important;
          background: rgba(255, 92, 52, 0.1) !important;
        }

        .feed-page[data-theme="dark"] .tag:hover:not(.active) {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .tag:hover:not(.active) {
          color: #1A1A1A;
          background: rgba(0,0,0,0.05);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 8px;
          min-width: 300px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .search-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .feed-page[data-theme="light"] .search-box {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #1A1A1A;
        }

        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          font-family: 'Inter', sans-serif;
          color: inherit;
        }

        .feed-page[data-theme="dark"] .search-box input::placeholder {
          color: #666;
        }

        .feed-page[data-theme="light"] .search-box input::placeholder {
          color: #999;
        }

        .feed-content {
          max-width: 1920px;
          margin: 0 auto;
          padding: 40px 60px;
        }

        .masonry-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          width: 100%;
          grid-auto-flow: dense;
        }

        .card-animation-layer {
          display: block;
          transform-origin: center;
          transform: scale(0.85) rotate(5deg);
          opacity: 0.3;
        }

        .card-animation-layer.large {
          grid-column: span 2;
          grid-row: span 2;
        }

        .card-animation-layer.medium {
          grid-column: span 1;
          grid-row: span 2;
        }

        .card-animation-layer.wide {
          grid-column: span 2;
        }

        .card {
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }

        .card:hover {
          z-index: 2;
        }

        .card-image {
          width: 100%;
          height: 180px;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .card-image::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8));
        }

        .card-animation-layer.large .card-image {
          height: 420px;
        }

        .card-animation-layer.medium .card-image {
          height: 400px;
        }

        .card-content {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }

        .card-meta {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          margin-bottom: 4px;
        }

        .card-title {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14px;
          line-height: 1.3;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-title {
          color: #fff;
        }

        .feed-page[data-theme="light"] .card-title {
          color: #1A1A1A;
        }

        .card-description {
          font-size: 12px;
          line-height: 1.4;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-description {
          color: #999;
        }

        .feed-page[data-theme="light"] .card-description {
          color: #666;
        }

        .card-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding-top: 8px;
          transition: border-color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-details {
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .card-details {
          border-top: 1px solid rgba(0,0,0,0.08);
        }

        .card-date,
        .card-location {
          font-size: 10px;
          font-family: 'Inter', sans-serif;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-date,
        .feed-page[data-theme="dark"] .card-location,
        .feed-page[data-theme="dark"] .card-details svg {
          color: #666;
        }

        .feed-page[data-theme="light"] .card-date,
        .feed-page[data-theme="light"] .card-location,
        .feed-page[data-theme="light"] .card-details svg {
          color: #888;
        }

        .loading-state {
          display: flex;
          justify-content: center;
          padding: 60px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 92, 52, 0.1);
          border-top-color: #FF5C34;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          font-size: 16px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .empty-state {
          color: #666;
        }

        .feed-page[data-theme="light"] .empty-state {
          color: #888;
        }

        @media (max-width: 1600px) {
          .masonry-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        @media (max-width: 1200px) {
          .masonry-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 900px) {
          .masonry-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .masonry-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .card-animation-layer.wide,
          .card-animation-layer.large {
            grid-column: span 1;
          }
          .card-animation-layer.large,
          .card-animation-layer.medium {
            grid-row: span 1;
          }
          .card-animation-layer.large .card-image,
          .card-animation-layer.medium .card-image {
            height: 180px;
          }
          .feed-header,
          .feed-content {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
      `}</style>
    </div>
  )
}
