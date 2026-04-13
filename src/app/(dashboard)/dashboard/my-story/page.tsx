'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Grid3X3, BookOpen, MapPin, X, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import StoryGrid from './components/StoryGrid'
import StoryThread from './components/StoryThread'
import StoryDetailModal from './components/StoryDetailModal'
import { type StoryItem, type ContentType } from './components/StoryCard'
import MilestonePrompt from '@/components/photobook/MilestonePrompt'
import AddContentModal from './components/AddContentModal'
import MemoryReflectionSlideshow from '@/components/my-story/MemoryReflectionSlideshow'
import '@/styles/page-styles.css'

// Lazy load the map view — heavyweight dependency
const MapView = dynamic(() => import('@/components/memories/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-[#F0F0EC] rounded-xl">
      <span className="text-[#94A09A] text-sm">Loading map...</span>
    </div>
  ),
})

type TabKey = 'all' | 'memories' | 'photos' | 'wisdom'
type ViewMode = 'grid' | 'thread' | 'map'

interface RawMemory {
  id: string
  title: string
  description: string | null
  memory_date: string | null
  mood: string | null
  location_name: string | null
  created_at: string
  memory_media?: { id: string; file_url: string; file_type: string; is_cover: boolean }[]
}

interface RawWisdom {
  id: string
  prompt_text: string
  response_text: string | null
  audio_url: string | null
  tags: string[] | null
  category: string
  created_at: string
}

interface RawMedia {
  id: string
  file_url: string
  file_type: string
  taken_at: string | null
  exif_lat: number | null
  exif_lng: number | null
  memory_id: string | null
  created_at: string
  source: string | null
  memory?: { id: string; title: string; location_name: string | null; location_lat: number | null; location_lng: number | null; memory_type: string | null; memory_date: string | null } | null
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'memories', label: 'Memories' },
  { key: 'photos', label: 'Media' },
  { key: 'wisdom', label: 'Wisdom' },
]

const VIEW_MODES: { key: ViewMode; icon: typeof Grid3X3; label: string }[] = [
  { key: 'grid', icon: Grid3X3, label: 'Grid' },
  { key: 'thread', icon: BookOpen, label: 'Thread' },
  { key: 'map', icon: MapPin, label: 'Map' },
]

/** Transform raw DB rows into unified StoryItem objects */
function toMemoryItems(memories: RawMemory[]): StoryItem[] {
  return memories.map((m) => {
    const cover = m.memory_media?.find((mm: any) => mm.is_cover) ?? m.memory_media?.[0]
    return {
      id: m.id,
      type: 'memory' as ContentType,
      title: m.title || 'Untitled Memory',
      subtitle: m.description?.slice(0, 120) ?? undefined,
      imageUrl: (cover as any)?.file_url ?? undefined,
      date: m.memory_date || m.created_at,
      savedAt: m.created_at,
      mood: m.mood,
      locationName: m.location_name ?? undefined,
    }
  })
}

function toWisdomItems(entries: RawWisdom[]): StoryItem[] {
  return entries.map((w) => ({
    id: w.id,
    type: 'wisdom' as ContentType,
    title: w.prompt_text || 'Untitled Wisdom',
    subtitle: w.response_text?.slice(0, 120) ?? undefined,
    date: w.created_at,
    savedAt: w.created_at,
    category: w.category,
  }))
}

function toPhotoItems(media: RawMedia[]): StoryItem[] {
  // Use the same filter logic as the gallery page:
  // exclude audio, exclude interviews, include everything else
  // (photos linked to a memory are intentionally shown in BOTH tabs —
  // once as a photo entry, once under their parent memory).
  const filtered = media.filter((m) => {
    if (!m.file_url) return false
    const mem = m.memory
    if (mem && (mem as any).memory_type === 'interview') return false
    // file_type is a simple enum: 'image' | 'video' | 'audio'
    const ft = (m.file_type || '').toLowerCase()
    if (ft === 'audio') return false
    const url = m.file_url.toLowerCase()
    if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.m4a')) return false
    return true // include images and videos
  })

  console.log('My Story: toPhotoItems input:', media.length, 'filtered:', filtered.length,
    'sample file_types:', media.slice(0, 5).map(m => m.file_type))

  return filtered.map((m) => {
    const locName = m.memory?.location_name || null
    // Prefer the parent memory's memory_date so a photo attached to an
    // old memory sorts with that memory, not with today's upload time.
    const date =
      (m.memory as any)?.memory_date ||
      m.taken_at ||
      m.created_at
    return {
      id: m.id,
      type: 'photo' as ContentType,
      title: locName || 'Photo',
      imageUrl: m.file_url,
      date,
      savedAt: m.created_at,
      locationName: locName ?? undefined,
    }
  })
}

/** Build minimal memory-shaped objects for MapView from items that have locations */
function toMapMemories(media: RawMedia[]) {
  return media
    .filter((m) => m.exif_lat && m.exif_lng)
    .map((m) => ({
      id: m.memory?.id || m.memory_id || m.id,
      title: m.memory?.location_name || 'Photo',
      description: '',
      memory_date: m.taken_at || m.created_at,
      location_name: m.memory?.location_name || '',
      location_lat: m.exif_lat!,
      location_lng: m.exif_lng!,
      memory_media: [{ file_url: m.file_url, file_type: m.file_type, is_cover: true }],
    }))
}

export default function MyStoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const initialTab = (searchParams.get('tab') as TabKey) || 'all'
  const [tab, setTab] = useState<TabKey>(
    ['all', 'memories', 'photos', 'wisdom'].includes(initialTab) ? initialTab : 'all'
  )
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // User ID for MilestonePrompt
  const [userId, setUserId] = useState<string | undefined>()

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<StoryItem | null>(null)

  // Raw data
  const [memories, setMemories] = useState<RawMemory[]>([])
  const [wisdom, setWisdom] = useState<RawWisdom[]>([])
  const [media, setMedia] = useState<RawMedia[]>([])

  // Auto-open detail modal from deep link query params (openMemory / openWisdom)
  useEffect(() => {
    const openMemoryId = searchParams.get('openMemory')
    const openWisdomId = searchParams.get('openWisdom')
    if (!openMemoryId && !openWisdomId) return

    let cancelled = false
    async function openFromDeepLink() {
      const supabase = createClient()

      if (openMemoryId) {
        const { data: memory } = await supabase
          .from('memories')
          .select('id, title, description, memory_date, location_name, ai_mood, ai_category, is_favorite, created_at')
          .eq('id', openMemoryId)
          .single()
        if (memory && !cancelled) {
          setSelectedItem({
            id: memory.id,
            type: 'memory',
            title: memory.title,
            subtitle: memory.description?.slice(0, 100) ?? undefined,
            date: memory.memory_date || memory.created_at,
            mood: memory.ai_mood,
            category: memory.ai_category,
            locationName: memory.location_name ?? undefined,
          })
        }
      } else if (openWisdomId) {
        const { data: wisdom } = await supabase
          .from('knowledge_entries')
          .select('id, prompt_text, response_text, category, created_at')
          .eq('id', openWisdomId)
          .single()
        if (wisdom && !cancelled) {
          setSelectedItem({
            id: wisdom.id,
            type: 'wisdom',
            title: wisdom.prompt_text,
            subtitle: wisdom.response_text?.slice(0, 100) ?? undefined,
            date: wisdom.created_at,
            category: wisdom.category,
          })
        }
      }
    }

    openFromDeepLink()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch all data in parallel on mount
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setUserId(user.id)

      // Types we want to hide from the Memories tab. Filtered client-side
      // because .or('memory_type.is.null,memory_type.not.in.(...)') gets
      // mis-parsed by PostgREST — the commas inside the IN list confuse
      // the OR parser and the whole query either errors or returns nothing.
      const HIDDEN_MEMORY_TYPES = new Set([
        'wisdom',
        'onboarding_gallery',
        'media_upload',
        'interview',
      ])

      const [memoriesRes, wisdomRes, mediaRes] = await Promise.all([
        supabase
          .from('memories')
          .select('*, memory_media(id, file_url, file_type, is_cover)')
          .eq('user_id', user.id)
          .order('memory_date', { ascending: false, nullsFirst: false }),
        supabase
          .from('knowledge_entries')
          .select('id, prompt_text, response_text, audio_url, tags, category, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('memory_media')
          .select(`
            id, file_url, file_type, taken_at, exif_lat, exif_lng, memory_id, created_at, source,
            memory:memories(id, title, location_name, location_lat, location_lng, memory_type, memory_date)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return

      console.log('My Story fetch results:', {
        memories: { count: memoriesRes.data?.length, error: memoriesRes.error },
        wisdom: { count: wisdomRes.data?.length, error: wisdomRes.error },
        media: { count: mediaRes.data?.length, error: mediaRes.error },
      })
      if (memoriesRes.error) console.error('My Story: memories fetch error:', memoriesRes.error)
      if (wisdomRes.error) console.error('My Story: wisdom fetch error:', wisdomRes.error)
      if (mediaRes.error) console.error('My Story: media fetch error:', mediaRes.error)

      // Client-side exclude of non-display memory types. NULL memory_type
      // (legacy cardchain rows) passes through.
      const visibleMemories = ((memoriesRes.data as RawMemory[]) || []).filter(
        (m: any) => !m.memory_type || !HIDDEN_MEMORY_TYPES.has(m.memory_type)
      )
      setMemories(visibleMemories)
      setWisdom((wisdomRes.data as RawWisdom[]) || [])
      // Normalize the joined memory field (Supabase returns it as array for singular joins)
      const normalizedMedia = (mediaRes.data || []).map((item: any) => ({
        ...item,
        memory: item.memory ? (Array.isArray(item.memory) ? item.memory[0] : item.memory) : null,
      })) as RawMedia[]
      setMedia(normalizedMedia)
      setIsLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  // Transform raw data into StoryItems. Every tab re-sorts by its
  // resolved `date` field so ordering is stable even if the server-side
  // ORDER BY diverges from the display date the user sees.
  const byDateDesc = (a: StoryItem, b: StoryItem) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  const memoryItems = useMemo(() => toMemoryItems(memories).sort(byDateDesc), [memories])
  const wisdomItems = useMemo(() => toWisdomItems(wisdom).sort(byDateDesc), [wisdom])
  const photoItems = useMemo(() => toPhotoItems(media).sort(byDateDesc), [media])

  // Combine everything for "All" tab, sorted by WHEN SAVED (latest first)
  // so the user's most recent completions always show at the top regardless
  // of what historical date the memory refers to.
  const allItems = useMemo(() => {
    return [...memoryItems, ...wisdomItems, ...photoItems].sort(
      (a, b) => {
        const aTime = new Date(a.savedAt || a.date).getTime()
        const bTime = new Date(b.savedAt || b.date).getTime()
        return bTime - aTime
      }
    )
  }, [memoryItems, wisdomItems, photoItems])

  // Items for the active tab
  const tabItems = useMemo(() => {
    switch (tab) {
      case 'memories': return memoryItems
      case 'photos': return photoItems
      case 'wisdom': return wisdomItems
      default: return allItems
    }
  }, [tab, memoryItems, photoItems, wisdomItems, allItems])

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return tabItems
    const q = searchQuery.toLowerCase()
    return tabItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.locationName?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    )
  }, [tabItems, searchQuery])

  // Map memories for MapView — combine media with location + memories with location
  const mapMemories = useMemo(() => {
    const fromMedia = toMapMemories(media)
    // Also include memories that have location info (via their media)
    const fromMemories = memories
      .filter(m => m.memory_media?.some(mm => mm.file_url))
      .map(m => {
        const cover = m.memory_media?.find(mm => mm.is_cover) ?? m.memory_media?.[0]
        return {
          id: m.id,
          title: m.title || 'Memory',
          description: m.description || '',
          memory_date: m.memory_date || m.created_at,
          location_name: '',
          location_lat: 0,
          location_lng: 0,
          memory_media: cover ? [{ file_url: cover.file_url, file_type: cover.file_type, is_cover: true }] : [],
        }
      })
      .filter(m => m.location_lat !== 0) // only those with actual locations
    return [...fromMedia, ...fromMemories]
  }, [media, memories])

  // Stats
  const locationCount = useMemo(
    () => media.filter((m) => m.exif_lat && m.exif_lng).length,
    [media]
  )

  const [showAddModal, setShowAddModal] = useState(false)
  const [reflectIndex, setReflectIndex] = useState<number | null>(null)

  // Route memory clicks to the reflection slideshow;
  // photos and wisdom still use the detail modal.
  const handleItemSelect = useCallback((item: StoryItem) => {
    if (item.type === 'memory') {
      const idx = memories
        .slice()
        .sort((a, b) => {
          const ad = new Date(a.memory_date || a.created_at).getTime()
          const bd = new Date(b.memory_date || b.created_at).getTime()
          return ad - bd
        })
        .findIndex(m => m.id === item.id)
      setReflectIndex(idx >= 0 ? idx : 0)
    } else {
      setSelectedItem(item)
    }
  }, [memories])

  const isEmpty = memories.length === 0 && wisdom.length === 0 && media.length === 0

  // Memory refs for the reflection slideshow — just real memories,
  // sorted oldest → newest so reminiscing flows like a timeline.
  const reflectionMemories = useMemo(() => {
    return memories
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.memory_date || a.created_at).getTime()
        const bDate = new Date(b.memory_date || b.created_at).getTime()
        return aDate - bDate
      })
      .map(m => ({
        id: m.id,
        title: m.title,
        date: m.memory_date || m.created_at,
      }))
  }, [memories])

  return (
    <div className="page-container">
      <div className="page-background" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold text-[#1A1F1C]"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            My Story
          </h1>

          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="p-2 rounded-lg hover:bg-[#2D5A3D]/10 transition-colors"
              aria-label="Search"
            >
              {showSearch ? <X size={20} className="text-[#5A6660]" /> : <Search size={20} className="text-[#5A6660]" />}
            </button>

            {/* Add button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#244B32] transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Search bar (collapsible) */}
        {showSearch && (
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A09A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, wisdom, photos..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#DDE3DF] bg-white text-sm text-[#1A1F1C] placeholder-[#94A09A] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A09A] hover:text-[#5A6660]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!isLoading && !isEmpty && (
          <p className="text-xs text-[#94A09A] mb-4">
            {memories.length} memories &middot; {wisdom.length} wisdom &middot; {media.length} photos
            {locationCount > 0 && <> &middot; {locationCount} locations</>}
          </p>
        )}

        {/* Tabs + View mode */}
        {!isEmpty && (
          <div className="flex items-center justify-between mb-5 gap-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-lg border border-[#DDE3DF] p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-[#2D5A3D] text-white'
                      : 'text-[#5A6660] hover:bg-[#F0F0EC]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex gap-0.5 bg-white rounded-lg border border-[#DDE3DF] p-0.5">
              {VIEW_MODES.map((vm) => {
                const Icon = vm.icon
                return (
                  <button
                    key={vm.key}
                    onClick={() => setViewMode(vm.key)}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === vm.key
                        ? 'bg-[#2D5A3D] text-white'
                        : 'text-[#5A6660] hover:bg-[#F0F0EC]'
                    }`}
                    aria-label={vm.label}
                    title={vm.label}
                  >
                    <Icon size={16} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#94A09A] mt-3">Loading your story...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p
              className="text-lg text-[#5A6660] mb-6 max-w-sm"
              style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
            >
              Your story starts here. Record a memory, share some wisdom, or upload a photo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/memories')}
                className="px-4 py-2 rounded-lg bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#244B32] transition-colors"
              >
                Record a Memory
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg border border-[#2D5A3D] text-[#2D5A3D] text-sm font-medium hover:bg-[#2D5A3D]/5 transition-colors"
              >
                Add Media
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        {!isLoading && !isEmpty && (
          <>
            {viewMode === 'grid' && <StoryGrid items={filteredItems} onSelect={handleItemSelect} />}
            {viewMode === 'thread' && <StoryThread items={filteredItems} onSelect={handleItemSelect} />}
            {viewMode === 'map' && (
              <div className="rounded-xl overflow-hidden border border-[#DDE3DF]" style={{ height: 'calc(100vh - 260px)', minHeight: 500 }}>
                {mapMemories.length > 0 ? (
                  <MapView
                    memories={mapMemories}
                    onSelectMemory={(mem) => {
                      handleItemSelect({
                        id: mem.id,
                        type: 'memory',
                        title: mem.title || 'Memory',
                        date: mem.memory_date || '',
                        locationName: mem.location_name || undefined,
                        imageUrl: mem.memory_media?.[0]?.file_url,
                      })
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-[#F0F0EC]">
                    <p className="text-sm text-[#94A09A]">No items with location data found.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Detail modal */}
        {selectedItem && (
          <StoryDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}

        {/* Add content modal (Memory / Wisdom / Photos) */}
        <AddContentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onContentAdded={() => window.location.reload()}
        />

        {/* Milestone Prompt for Photobook */}
        <MilestonePrompt memoryCount={memories.length} userId={userId} />

        {/* Reflection Slideshow — at-your-own-pace memory walkthrough */}
        <MemoryReflectionSlideshow
          memories={reflectionMemories}
          initialIndex={reflectIndex ?? 0}
          isOpen={reflectIndex !== null}
          onClose={() => setReflectIndex(null)}
        />
      </div>
    </div>
  )
}
