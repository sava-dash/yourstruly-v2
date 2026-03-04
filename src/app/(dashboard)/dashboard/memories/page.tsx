'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Image as ImageIcon, Calendar, MapPin, Sparkles, Grid, List, Globe, ChevronLeft, Search, X, Clock, Users, Share2, BookOpen, Album, User, Mic, Map } from 'lucide-react'
import Link from 'next/link'
import CreateMemoryModal from '@/components/memories/CreateMemoryModal'
import MemoryCard from '@/components/memories/MemoryCard'
import MemoryCardClean from '@/components/memories/MemoryCardClean'
import ScrapbookCard from '@/components/memories/ScrapbookCard'
import GlobeView from '@/components/memories/GlobeView'
import MapView from '@/components/memories/MapView'
import { MemoryTimeline } from '@/components/memories/MemoryTimeline'
import { PeopleBrowse } from '@/components/memories/PeopleBrowse'
import { PlacesBrowse } from '@/components/memories/PlacesBrowse'
import { TimelineBrowse } from '@/components/memories/TimelineBrowse'
import VirtualizedMemoryGrid, { VirtualizedSimpleGrid } from '@/components/memories/VirtualizedMemoryGrid'
import MilestonePrompt from '@/components/photobook/MilestonePrompt'
import MemoryStats from '@/components/memories/MemoryStats'
import MoodFilterChips from '@/components/memories/MoodFilterChips'
import EmotionalJourney from '@/components/memories/EmotionalJourney'
import { TimelineScrubber } from '@/components/memories/TimelineScrubber'
import { MoodType, MOOD_DEFINITIONS } from '@/lib/ai/moodAnalysis'
import '@/styles/page-styles.css'
import '@/styles/scrapbook.css'
import { getCategoryIcon } from '@/lib/dashboard/icons'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  location_lat: number
  location_lng: number
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  mood: MoodType | null
  mood_override: boolean
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface SharedMemory extends Memory {
  shared_by?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  shared_at?: string
  permission_level?: string
}

type ViewMode = 'grid' | 'cards' | 'scrapbook' | 'timeline'
type TabMode = 'mine' | 'shared'
type BrowseMode = 'all' | 'people' | 'places' | 'map' | 'timeline'

const VALID_MOODS: MoodType[] = ['joyful', 'proud', 'grateful', 'bittersweet', 'peaceful', 'nostalgic', 'loving']

export default function MemoriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [memories, setMemories] = useState<Memory[]>([])
  const [sharedMemories, setSharedMemories] = useState<SharedMemory[]>([])
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingShared, setLoadingShared] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [viewModeLoaded, setViewModeLoaded] = useState(false)
  const [tabMode, setTabMode] = useState<TabMode>('mine')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()
  const [browseMode, setBrowseMode] = useState<BrowseMode>('all')
  const [isGlobeMode, setIsGlobeMode] = useState(false) // Toggle between Map and Globe in map view
  const [currentScrollDate, setCurrentScrollDate] = useState<Date | null>(null)
  const memoriesGridRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // Initialize mood filter from URL params
  useEffect(() => {
    const moodParam = searchParams.get('mood')
    if (moodParam && VALID_MOODS.includes(moodParam as MoodType)) {
      setSelectedMood(moodParam as MoodType)
    }
  }, [searchParams])

  const loadMemories = useCallback(async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('memories')
      .select(`*, memory_media(id, file_url, file_type, is_cover)`)
      .eq('user_id', user.id)
      .neq('memory_type', 'wisdom') // Filter out wisdom - those belong on /wisdom page
      .order('memory_date', { ascending: false })

    if (selectedCategory && selectedCategory !== 'all') {
      query = query.eq('ai_category', selectedCategory)
    }

    if (dateFilter.start) {
      query = query.gte('memory_date', dateFilter.start)
    }
    if (dateFilter.end) {
      query = query.lte('memory_date', dateFilter.end)
    }
    
    // Apply mood filter
    if (selectedMood) {
      query = query.eq('mood', selectedMood)
    }

    const { data } = await query
    setMemories(data || [])
    setFilteredMemories(data || [])
    
    // Count moods for filter chips (only if not filtered by mood)
    if (!selectedMood) {
      const counts: Record<string, number> = {}
      for (const m of data || []) {
        if (m.mood) {
          counts[m.mood] = (counts[m.mood] || 0) + 1
        }
      }
      setMoodCounts(counts)
    }
    
    setLoading(false)
  }, [selectedCategory, selectedMood, dateFilter, supabase])

  const loadSharedMemories = useCallback(async () => {
    setLoadingShared(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get memories shared with current user (via memory_shares table)
    const { data: shares, error } = await supabase
      .from('memory_shares')
      .select(`
        memory_id,
        permission_level,
        created_at,
        shared_by_user_id,
        memories!inner(
          id,
          title,
          description,
          memory_date,
          memory_type,
          location_name,
          location_lat,
          location_lng,
          ai_summary,
          ai_mood,
          ai_category,
          ai_labels,
          is_favorite,
          memory_media(id, file_url, file_type, is_cover)
        ),
        profiles!memory_shares_shared_by_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading shared memories:', error)
      setLoadingShared(false)
      return
    }

    // Transform the data
    const transformedMemories: SharedMemory[] = (shares || []).map((share: any) => ({
      ...share.memories,
      shared_by: share.profiles,
      shared_at: share.created_at,
      permission_level: share.permission_level,
    }))

    setSharedMemories(transformedMemories)
    setLoadingShared(false)
  }, [supabase])

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadMemories()
        loadSharedMemories()
      } else {
        // Reset state when no user to prevent data leakage
        setMemories([])
        setSharedMemories([])
        setFilteredMemories([])
        setUserId(undefined)
      }
    }
    checkAuthAndLoad()
  }, [loadMemories, loadSharedMemories, supabase])

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('memories-view-mode') as ViewMode
    if (saved && ['grid', 'cards', 'scrapbook', 'timeline'].includes(saved)) {
      setViewMode(saved)
    }
    setViewModeLoaded(true)
  }, [])

  // Persist view mode to localStorage
  useEffect(() => {
    if (viewModeLoaded) {
      localStorage.setItem('memories-view-mode', viewMode)
    }
  }, [viewMode, viewModeLoaded])

  // Filter by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMemories(memories)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = memories.filter(m => 
      m.title?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.location_name?.toLowerCase().includes(query) ||
      m.ai_labels?.some(l => l.toLowerCase().includes(query))
    )
    setFilteredMemories(filtered)
  }, [searchQuery, memories])

  // Track scroll position for timeline scrubber
  useEffect(() => {
    const handleScroll = () => {
      if (!memoriesGridRef.current || filteredMemories.length === 0) return
      
      // Find the memory card that's currently most visible in the viewport
      const cards = memoriesGridRef.current.querySelectorAll('[data-memory-date]')
      const viewportCenter = window.innerHeight / 2
      
      let closestCard: Element | null = null
      let closestDistance = Infinity
      
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        const cardCenter = rect.top + rect.height / 2
        const distance = Math.abs(cardCenter - viewportCenter)
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestCard = card
        }
      })
      
      if (closestCard) {
        const dateStr = (closestCard as Element).getAttribute('data-memory-date')
        if (dateStr) {
          setCurrentScrollDate(new Date(dateStr))
        }
      }
    }
    
    // Throttle scroll handler
    let ticking = false
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', throttledScroll, { passive: true })
    // Initial check
    handleScroll()
    
    return () => window.removeEventListener('scroll', throttledScroll)
  }, [filteredMemories])

  // Handle timeline scrubber jump
  const handleTimelineJump = useCallback((targetDate: Date) => {
    if (!memoriesGridRef.current || filteredMemories.length === 0) return
    
    // Find the memory closest to the target date
    let closestMemory: Memory | null = null
    let closestDiff = Infinity
    
    filteredMemories.forEach(memory => {
      if (!memory.memory_date) return
      const memoryDate = new Date(memory.memory_date)
      const diff = Math.abs(memoryDate.getTime() - targetDate.getTime())
      
      if (diff < closestDiff) {
        closestDiff = diff
        closestMemory = memory
      }
    })
    
    if (closestMemory) {
      // Find the corresponding card element
      const targetMemory = closestMemory as Memory
      const card = memoriesGridRef.current.querySelector(`[data-memory-id="${targetMemory.id}"]`)
      if (card) {
        card.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }
  }, [filteredMemories])

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'travel', label: 'Travel' },
    { id: 'family', label: 'Family' },
    { id: 'celebration', label: 'Celebrations' },
    { id: 'nature', label: 'Nature' },
    { id: 'food', label: 'Food' },
    { id: 'everyday', label: 'Everyday' },
  ]

  // Group memories by year/month for timeline
  const groupedMemories = filteredMemories.reduce((acc, memory) => {
    const date = memory.memory_date ? new Date(memory.memory_date) : new Date()
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) acc[key] = []
    acc[key].push(memory)
    return acc
  }, {} as Record<string, Memory[]>)

  const sortedGroups = Object.keys(groupedMemories).sort().reverse()

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedMood(null)
    setDateFilter({ start: '', end: '' })
    // Clear URL params
    router.push('/dashboard/memories')
  }
  
  const handleMoodSelect = (mood: MoodType | null) => {
    setSelectedMood(mood)
    // Update URL params
    if (mood) {
      router.push(`/dashboard/memories?mood=${mood}`)
    } else {
      router.push('/dashboard/memories')
    }
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedMood || dateFilter.start || dateFilter.end

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
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="page-header-title">Memories</h1>
                <p className="page-header-subtitle">
                  {tabMode === 'mine' 
                    ? `${filteredMemories.length} of ${memories.length} moments`
                    : `${sharedMemories.length} shared with you`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#406A56]/50 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search" placeholder="Search memories..."
                  className="form-input pl-10 pr-10 w-48 sm:w-64 placeholder:text-[#999]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#406A56]/50 hover:text-[#406A56]"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle - only show when in "All" browse mode */}
              {browseMode === 'all' && (
              <div className="hidden sm:flex items-center glass-card-page p-1" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'timeline' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'}`}
                  aria-label="Timeline View"
                  aria-pressed={viewMode === 'timeline'}
                >
                  <Clock size={18} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('scrapbook')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'scrapbook' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'}`}
                  aria-label="Scrapbook View"
                  aria-pressed={viewMode === 'scrapbook'}
                >
                  <Album size={18} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'}`}
                  aria-label="Grid View"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid size={18} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'}`}
                  aria-label="Cards View"
                  aria-pressed={viewMode === 'cards'}
                >
                  <List size={18} aria-hidden="true" />
                </button>
              </div>
              )}

              {/* Create Photo Book Button */}
              <Link
                href={`/dashboard/photobook/create${memories.length > 0 ? '?source=memories' : ''}`}
                className="btn-secondary flex items-center gap-2"
              >
                <BookOpen size={18} />
                <span className="hidden sm:inline">📚 Create Book</span>
              </Link>

              {/* Voice Memory Button */}
              <Link
                href="/dashboard/memories/voice"
                className="btn-secondary flex items-center gap-2"
              >
                <Mic size={18} />
                <span className="hidden sm:inline">Voice</span>
              </Link>

              {/* Create Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Memory</span>
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setTabMode('mine')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tabMode === 'mine' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-white/80 text-[#406A56] hover:bg-white border border-[#406A56]/20'
              }`}
            >
              <ImageIcon size={16} />
              My Memories
              {memories.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  tabMode === 'mine' ? 'bg-white/20' : 'bg-[#406A56]/10'
                }`}>
                  {memories.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTabMode('shared')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tabMode === 'shared' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-white/80 text-[#406A56] hover:bg-white border border-[#406A56]/20'
              }`}
            >
              <Share2 size={16} />
              Shared with Me
              {sharedMemories.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  tabMode === 'shared' ? 'bg-white/20' : 'bg-[#406A56]/10'
                }`}>
                  {sharedMemories.length}
                </span>
              )}
            </button>
          </div>

          {/* Browse Mode Toggle - only show for "My Memories" tab */}
          {tabMode === 'mine' && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-[#406A56]/60 mr-2">Browse by:</span>
              <div className="flex items-center glass-card-page p-1">
                <button
                  onClick={() => setBrowseMode('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    browseMode === 'all' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'
                  }`}
                >
                  <Grid size={14} />
                  All
                </button>
                <button
                  onClick={() => setBrowseMode('people')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    browseMode === 'people' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'
                  }`}
                >
                  <User size={14} />
                  People
                </button>
                <button
                  onClick={() => setBrowseMode('places')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    browseMode === 'places' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'
                  }`}
                >
                  <MapPin size={14} />
                  Places
                </button>
                <button
                  onClick={() => setBrowseMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    browseMode === 'map' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'
                  }`}
                >
                  <Map size={14} />
                  Map
                </button>
                <button
                  onClick={() => setBrowseMode('timeline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    browseMode === 'timeline' ? 'bg-[#406A56] text-white' : 'text-[#406A56]/60 hover:text-[#406A56]'
                  }`}
                >
                  <Clock size={14} />
                  Timeline
                </button>
              </div>
            </div>
          )}

          {/* Filters Row - only show for "My Memories" tab and "All" browse mode */}
          {tabMode === 'mine' && browseMode === 'all' && (
          <div className="space-y-3 mt-4">
            {/* Mood Filter Chips */}
            <div className="pb-1">
              <MoodFilterChips
                selectedMood={selectedMood}
                onMoodSelect={handleMoodSelect}
                moodCounts={moodCounts}
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {/* Category Filters */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === 'all' ? null : cat.id)}
                  className={`filter-btn ${(cat.id === 'all' && !selectedCategory) || selectedCategory === cat.id ? 'filter-btn-active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}

              {/* Date Filter */}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                  className="form-input text-sm py-2"
                />
                <span className="text-[#406A56]/60">to</span>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                  className="form-input text-sm py-2"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[#C35F33] hover:text-[#a84d28] text-sm whitespace-nowrap font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          )}
        </header>

        {/* Horizontal Timeline (only show for "My Memories" tab and "All" browse mode) */}
        {!loading && tabMode === 'mine' && browseMode === 'all' && memories.length > 0 && (
          <MemoryTimeline 
            memories={memories.map(m => ({
              id: m.id,
              title: m.title,
              memory_date: m.memory_date,
              cover_url: m.memory_media?.find(mm => mm.is_cover)?.file_url || m.memory_media?.[0]?.file_url,
              memory_type: m.memory_type
            }))}
          />
        )}

        {/* Memory Stats Dashboard (only show for "My Memories" tab and "All" browse mode) */}
        {!loading && tabMode === 'mine' && browseMode === 'all' && memories.length > 0 && (
          <MemoryStats />
        )}
        
        {/* Emotional Journey Visualization (only show for "All" browse mode) */}
        {!loading && tabMode === 'mine' && browseMode === 'all' && memories.length > 0 && (
          <EmotionalJourney userId={userId} />
        )}

        {/* Content */}
        <main>
          {/* Shared with Me Tab */}
          {tabMode === 'shared' ? (
            loadingShared ? (
              <div className="loading-container">
                <div className="loading-text">Loading shared memories...</div>
              </div>
            ) : sharedMemories.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Share2 size={32} className="text-[#406A56]/50" />
                </div>
                <h3 className="empty-state-title">No shared memories yet</h3>
                <p className="empty-state-text">
                  When someone shares their memories with you, they&apos;ll appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sharedMemories.map((memory) => (
                  <div key={memory.id} className="relative group">
                    <MemoryCard memory={memory} />
                    {/* Shared by indicator */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-white text-xs">
                        <Users size={12} />
                        <span className="truncate">Shared by {memory.shared_by?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : browseMode === 'people' ? (
            /* People Browse Mode */
            <PeopleBrowse />
          ) : browseMode === 'places' ? (
            /* Places Browse Mode */
            <PlacesBrowse memories={memories} />
          ) : browseMode === 'map' ? (
            /* Map Browse Mode - Full interactive map with Globe toggle */
            <div className="space-y-4">
              {isGlobeMode ? (
                <div className="relative">
                  {/* Globe/Map Toggle */}
                  <div className="absolute top-4 left-4 z-10 flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1">
                    <button
                      onClick={() => setIsGlobeMode(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        !isGlobeMode ? 'bg-[#406A56] text-white' : 'text-[#406A56] hover:bg-[#406A56]/10'
                      }`}
                    >
                      <Map size={16} />
                      Map
                    </button>
                    <button
                      onClick={() => setIsGlobeMode(true)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isGlobeMode ? 'bg-[#406A56] text-white' : 'text-[#406A56] hover:bg-[#406A56]/10'
                      }`}
                    >
                      <Globe size={16} />
                      Globe
                    </button>
                  </div>
                  <GlobeView 
                    memories={memories}
                    onSelectMemory={(memory) => {
                      router.push(`/dashboard/memories/${memory.id}`)
                    }}
                  />
                </div>
              ) : (
                <MapView 
                  memories={memories}
                  onSelectMemory={(memory) => {
                    router.push(`/dashboard/memories/${memory.id}`)
                  }}
                  showGlobeToggle={true}
                  onToggleGlobe={() => setIsGlobeMode(true)}
                  isGlobeMode={isGlobeMode}
                />
              )}
            </div>
          ) : browseMode === 'timeline' ? (
            /* Timeline Browse Mode */
            <TimelineBrowse memories={memories} />
          ) : loading ? (
            <div className="loading-container">
              <div className="loading-text">Loading memories...</div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ImageIcon size={32} className="text-[#406A56]/50" />
              </div>
              <h3 className="empty-state-title">
                {memories.length === 0 ? 'No memories yet' : 'No memories match your filters'}
              </h3>
              <p className="empty-state-text">
                {memories.length === 0 ? 'Start capturing your life\'s moments' : 'Try adjusting your search or filters'}
              </p>
              {memories.length === 0 ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary mx-auto"
                >
                  <Plus size={18} />
                  Create your first memory
                </button>
              ) : (
                <button onClick={clearFilters} className="btn-secondary">
                  Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'scrapbook' ? (
            /* Scrapbook View - Polaroid cards with washi tape */
            <div ref={memoriesGridRef} className="scrapbook-grid">
              {filteredMemories.map((memory, index) => (
                <div 
                  key={memory.id}
                  data-memory-id={memory.id}
                  data-memory-date={memory.memory_date}
                >
                  <ScrapbookCard memory={memory} index={index} />
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View - Virtualized square cards */
            <VirtualizedSimpleGrid memories={filteredMemories} gap={12} />
          ) : viewMode === 'cards' ? (
            /* Cards View - Photo on top, info below, reactions */
            <div ref={memoriesGridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMemories.map((memory) => (
                <div 
                  key={memory.id}
                  data-memory-id={memory.id}
                  data-memory-date={memory.memory_date}
                >
                  <MemoryCardClean memory={memory} showReactions={true} />
                </div>
              ))}
            </div>
          ) : (
            /* Timeline View - Virtualized with date headers */
            <VirtualizedMemoryGrid memories={filteredMemories} gap={12} showDateHeaders={true} />
          )}
        </main>
      </div>

      {/* Create Memory Modal */}
      <CreateMemoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          loadMemories()
          setShowCreateModal(false)
        }}
      />

      {/* Milestone Prompt for Photobook */}
      <MilestonePrompt memoryCount={memories.length} userId={userId} />

      {/* Timeline Scrubber - show for My Memories tab, All browse mode, non-virtualized views */}
      {!loading && tabMode === 'mine' && browseMode === 'all' && filteredMemories.length > 0 && 
       (viewMode === 'scrapbook' || viewMode === 'cards') && (
        <TimelineScrubber
          memories={filteredMemories}
          onJumpTo={handleTimelineJump}
          currentScrollDate={currentScrollDate}
        />
      )}
    </div>
  )
}
