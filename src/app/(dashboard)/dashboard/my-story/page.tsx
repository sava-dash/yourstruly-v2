'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Grid3X3, BookOpen, MapPin, X, Plus, Play } from 'lucide-react'
import dynamic from 'next/dynamic'
import StoryGrid from './components/StoryGrid'
import StoryThread from './components/StoryThread'
import StoryDetailModal from './components/StoryDetailModal'
import { type StoryItem, type ContentType } from './components/StoryCard'
import MilestonePrompt from '@/components/photobook/MilestonePrompt'
import AddContentModal from './components/AddContentModal'
import MemoryReflectionSlideshow from '@/components/my-story/MemoryReflectionSlideshow'
import { AppendMemoryChain, type AppendTarget } from '@/components/my-story/AppendMemoryChain'
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
  ai_mood: string | null
  ai_category: string | null
  location_name: string | null
  created_at: string
  /** Free-form synopsis tags (array of strings). Populated by SynopsisCard. */
  tags: string[] | null
  /** AI-extracted entities; shape: { people: string[], topics: string[], times: string[], locations: string[], summary?: string }. NULL until background job runs. */
  extracted_entities: {
    people?: string[]
    topics?: string[]
    times?: string[]
    locations?: string[]
    summary?: string
  } | null
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

// Tabs carry their own editorial color so the bright pill palette stays
// consistent with the colored left-bars on StoryCard.
const TABS: { key: TabKey; label: string; color: string; ink: string }[] = [
  { key: 'all',      label: 'ALL',      color: 'var(--ed-red)',    ink: '#fff' },
  { key: 'memories', label: 'MEMORIES', color: 'var(--ed-blue)',   ink: '#fff' },
  { key: 'photos',   label: 'MEDIA',    color: 'var(--ed-yellow)', ink: 'var(--ed-ink)' },
  { key: 'wisdom',   label: 'WISDOM',   color: 'var(--ed-black)',  ink: '#fff' },
]

const VIEW_MODES: { key: ViewMode; icon: typeof Grid3X3; label: string }[] = [
  { key: 'grid',   icon: Grid3X3,  label: 'GRID VIEW' },
  { key: 'thread', icon: BookOpen, label: 'THREAD VIEW' },
  { key: 'map',    icon: MapPin,   label: 'MAP VIEW' },
]

/** Count media items by kind for the card footer indicators. */
function countMedia(media: RawMemory['memory_media']) {
  const counts = { photos: 0, videos: 0, audio: 0 }
  if (!media) return counts
  for (const m of media) {
    const ft = (m.file_type || '').toLowerCase()
    if (ft === 'image') counts.photos += 1
    else if (ft === 'video') counts.videos += 1
    else if (ft === 'audio') counts.audio += 1
    else {
      const url = m.file_url.toLowerCase()
      if (url.match(/\.(mp3|wav|m4a|aac)$/)) counts.audio += 1
      else if (url.match(/\.(mp4|mov|webm)$/)) counts.videos += 1
      else counts.photos += 1
    }
  }
  return counts
}

/** Transform raw DB rows into unified StoryItem objects */
function toMemoryItems(memories: RawMemory[]): StoryItem[] {
  return memories.map((m) => {
    const cover = m.memory_media?.find((mm: any) => mm.is_cover) ?? m.memory_media?.[0]
    // extracted_entities.people is a JSONB array; trust but truncate for UI.
    const people = Array.isArray(m.extracted_entities?.people)
      ? m.extracted_entities!.people!.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : []
    return {
      id: m.id,
      type: 'memory' as ContentType,
      title: m.title || 'Untitled Memory',
      preview: m.description ?? undefined,
      imageUrl: (cover as any)?.file_url ?? undefined,
      date: m.memory_date || m.created_at,
      savedAt: m.created_at,
      mood: m.ai_mood || m.mood,
      category: m.ai_category ?? undefined,
      locationName: m.location_name ?? undefined,
      people,
      // Surface SynopsisCard tags so the card shows every category the
      // synopsis captured (where/when/who are elsewhere on the card; these
      // are the free-form recall tags).
      tags: Array.isArray(m.tags) ? m.tags.filter((t): t is string => typeof t === 'string') : [],
      mediaCounts: countMedia(m.memory_media),
    }
  })
}

function toWisdomItems(entries: RawWisdom[]): StoryItem[] {
  return entries.map((w) => ({
    id: w.id,
    type: 'wisdom' as ContentType,
    title: w.prompt_text || 'Untitled Wisdom',
    preview: w.response_text ?? undefined,
    date: w.created_at,
    savedAt: w.created_at,
    category: w.category,
    tags: Array.isArray(w.tags) ? w.tags : [],
    hasAudio: !!w.audio_url,
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
            preview: memory.description?.slice(0, 100) ?? undefined,
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
            preview: wisdom.response_text?.slice(0, 100) ?? undefined,
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
          // `*` pulls ai_mood / ai_category / extracted_entities / description —
          // the card uses all of those for preview/mood chip/people stack.
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
        item.preview?.toLowerCase().includes(q) ||
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

  // "+ ADD" on a card opens the AppendMemoryChain overlay: the same
  // cardchain the user saw when FIRST creating the memory, but Finish
  // routes to /api/memories/[id]/append (or /api/wisdom/[id]/append).
  // Photos are a target-only type — we don't open append for standalone
  // photo cards.
  const [appendTarget, setAppendTarget] = useState<AppendTarget | null>(null)
  const handleAddToItem = useCallback((item: StoryItem) => {
    if (item.type === 'photo') return
    setAppendTarget({
      id: item.id,
      type: item.type,
      title: item.title,
      coverUrl: item.imageUrl,
    })
  }, [])
  const handleAppendSaved = useCallback(() => {
    // Reload so the newly-appended segment + media appear in the list.
    // Keeping this simple for now; refining to an incremental merge is P6+.
    window.location.reload()
  }, [])

  // Card clicks open the editorial Memory Details modal (StoryDetailModal).
  // The MemoryReflectionSlideshow is kept as a separate experience reachable
  // via its own entry — opening the redesigned detail surface is the
  // primary action now that it carries the full editorial layout.
  const handleItemSelect = useCallback((item: StoryItem) => {
    setSelectedItem(item)
  }, [])

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
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--ed-cream)',
        paddingTop: 80,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ───── Editorial header: huge wordmark + search/filters ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-4">
          {/* Left: MY STORY display headline + stats line */}
          <div>
            <h1
              className="text-[var(--ed-ink)] leading-[0.85] tracking-[-0.02em]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(64px, 11vw, 140px)',
              }}
            >
              MY<br />STORY
            </h1>
            {!isLoading && !isEmpty && (
              <div
                className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[11px] sm:text-[12px] tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-blue)', fontWeight: 700 }}>
                    {memories.length}
                  </span>
                  <span className="text-[var(--ed-ink)]">MEMORIES</span>
                </span>
                <span aria-hidden className="text-[var(--ed-muted)]">·</span>
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-black)', fontWeight: 700 }}>
                    {wisdom.length}
                  </span>
                  <span className="text-[var(--ed-ink)]">WISDOM</span>
                </span>
                <span aria-hidden className="text-[var(--ed-muted)]">·</span>
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-yellow)', fontWeight: 700, WebkitTextStroke: '1px var(--ed-ink)' }}>
                    {media.length}
                  </span>
                  <span className="text-[var(--ed-ink)]">PHOTOS</span>
                </span>
                {locationCount > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-red)', fontWeight: 700 }}>
                        {locationCount}
                      </span>
                      <span className="text-[var(--ed-ink)]">LOCATIONS</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: persistent search + colored filter pills */}
          <div className="flex flex-col gap-3">
            <div
              className="flex items-stretch"
              style={{ border: '2px solid var(--ed-ink)', background: 'var(--ed-paper)', borderRadius: 2 }}
            >
              <div className="flex items-center flex-1 px-3 gap-2">
                <Search size={16} className="text-[var(--ed-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories…"
                  className="w-full py-2.5 bg-transparent text-sm text-[var(--ed-ink)] placeholder-[var(--ed-muted)] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[var(--ed-muted)] hover:text-[var(--ed-ink)]"
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
                style={{ background: 'var(--ed-red)', color: '#fff', borderLeft: '2px solid var(--ed-ink)' }}
              >
                <Search size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Color-coded pill tabs — ALL / MEMORIES / MEDIA / WISDOM */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const isActive = tab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="px-4 py-2 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      background: isActive ? t.color : 'var(--ed-paper)',
                      color: isActive ? t.ink : 'var(--ed-ink)',
                      border: '2px solid var(--ed-ink)',
                      borderRadius: 999,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ───── View toggle (left) + Add memory (right) ───── */}
        {!isEmpty && (
          <div className="flex items-center justify-between mt-6 mb-6 gap-3 flex-wrap">
            <div
              className="flex items-stretch"
              style={{ border: '2px solid var(--ed-ink)', borderRadius: 2, background: 'var(--ed-paper)' }}
            >
              {VIEW_MODES.map((vm, idx) => {
                const Icon = vm.icon
                const isActive = viewMode === vm.key
                return (
                  <button
                    key={vm.key}
                    onClick={() => setViewMode(vm.key)}
                    className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      background: isActive ? 'var(--ed-ink)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--ed-ink)',
                      borderLeft: idx === 0 ? 'none' : '2px solid var(--ed-ink)',
                    }}
                    aria-label={vm.label}
                  >
                    <Icon size={14} strokeWidth={2.5} />
                    <span className="hidden sm:inline">{vm.label}</span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                background: 'var(--ed-ink)',
                color: '#fff',
                border: '2px solid var(--ed-ink)',
                borderRadius: 2,
              }}
            >
              <Play size={12} fill="var(--ed-red)" stroke="var(--ed-red)" />
              ADD MEMORY
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full animate-spin"
              style={{ border: '3px solid var(--ed-ink)', borderTopColor: 'transparent' }}
            />
            <p
              className="text-[11px] tracking-[0.18em] mt-4 text-[var(--ed-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              LOADING YOUR STORY…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p
              className="text-xl text-[var(--ed-ink)] mb-6 max-w-md leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              YOUR STORY STARTS HERE.
            </p>
            <p className="text-sm text-[var(--ed-muted)] mb-6 max-w-sm">
              Record a memory, share some wisdom, or upload a photo.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => router.push('/dashboard/memories')}
                className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background: 'var(--ed-red)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink)',
                  borderRadius: 2,
                }}
              >
                RECORD A MEMORY
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background: 'var(--ed-paper)',
                  color: 'var(--ed-ink)',
                  border: '2px solid var(--ed-ink)',
                  borderRadius: 2,
                }}
              >
                ADD MEDIA
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        {!isLoading && !isEmpty && (
          <>
            {viewMode === 'grid' && (
              <StoryGrid
                items={filteredItems}
                onSelect={handleItemSelect}
                onAdd={handleAddToItem}
              />
            )}
            {viewMode === 'thread' && <StoryThread items={filteredItems} onSelect={handleItemSelect} />}
            {viewMode === 'map' && (
              <div
                className="overflow-hidden"
                style={{
                  height: 'calc(100vh - 320px)',
                  minHeight: 500,
                  border: '2px solid var(--ed-ink)',
                  borderRadius: 2,
                }}
              >
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
                  <div className="flex items-center justify-center h-full" style={{ background: 'var(--ed-paper)' }}>
                    <p
                      className="text-[11px] tracking-[0.18em] text-[var(--ed-muted)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      NO ITEMS WITH LOCATION DATA FOUND.
                    </p>
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
            onContinue={(item) => {
              // Closing the modal first prevents a stacked overlay flash.
              setSelectedItem(null)
              handleAddToItem(item)
            }}
            // EDIT MEMORY button currently routes to the same append flow —
            // closest existing surface that lets the user mutate the memory.
            // Replace once a true editor exists.
            onEdit={(item) => {
              setSelectedItem(null)
              handleAddToItem(item)
            }}
          />
        )}

        {/* Add content modal (Memory / Wisdom / Photos) */}
        <AddContentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onContentAdded={() => window.location.reload()}
        />

        {/* "Continue this memory" append overlay — opens from the ADD pill
            on a memory/wisdom card. Same cardchain as first-time creation,
            but Finish posts to /api/memories/[id]/append. */}
        <AppendMemoryChain
          isOpen={!!appendTarget}
          target={appendTarget}
          onClose={() => setAppendTarget(null)}
          onSaved={handleAppendSaved}
        />

        {/* Milestone Prompt for Photobook */}
        <MilestonePrompt memoryCount={memories.length} userId={userId} />

        {/* Reflection Slideshow — at-your-own-pace memory walkthrough */}
        <MemoryReflectionSlideshow
          memories={reflectionMemories}
          initialIndex={reflectIndex ?? 0}
          isOpen={reflectIndex !== null}
          onClose={() => setReflectIndex(null)}
          onContinue={(memory) => {
            // Close slideshow before opening the append overlay so the z-index
            // stack stays single-layer.
            setReflectIndex(null)
            setAppendTarget({
              id: memory.id,
              type: 'memory',
              title: memory.title,
              coverUrl: memory.coverUrl,
            })
          }}
        />
      </div>
    </div>
  )
}
