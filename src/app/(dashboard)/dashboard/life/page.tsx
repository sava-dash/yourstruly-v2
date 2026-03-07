'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Clock, Users, MapPin, Heart, Grid3x3, ChevronLeft,
  Plus, Image as ImageIcon, X, Sparkles, BookOpen, Star,
  Upload, Loader2
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import CreateMemoryModal from '@/components/memories/CreateMemoryModal'
import LifeMemoryCard from '@/components/memories/LifeMemoryCard'
import { PeopleBrowse } from '@/components/memories/PeopleBrowse'
import { PlacesBrowse } from '@/components/memories/PlacesBrowse'
import { TimelineBrowse } from '@/components/memories/TimelineBrowse'
import LifeStoryEngine from '@/components/life/LifeStoryEngine'
import OnThisDay from '@/components/dashboard/OnThisDay'
import MemoryCardClean from '@/components/memories/MemoryCardClean'
import { MoodType } from '@/lib/ai/moodAnalysis'
import '@/styles/page-styles.css'

const MapView = dynamic(() => import('@/components/memories/MapView'), { ssr: false })

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

interface MediaItem {
  id: string
  file_url: string
  file_type: string
  taken_at?: string
  memory_id?: string
  memory?: { id: string; title: string }
}

type BrowseMode = 'home' | 'timeline' | 'people' | 'places' | 'moods' | 'categories' | 'media'

const MOOD_DISPLAY: { mood: MoodType; emoji: string; label: string }[] = [
  { mood: 'joyful',      emoji: '😊', label: 'Happy' },
  { mood: 'loving',      emoji: '❤️', label: 'Love' },
  { mood: 'grateful',    emoji: '🙏', label: 'Grateful' },
  { mood: 'nostalgic',   emoji: '🌅', label: 'Nostalgic' },
  { mood: 'proud',       emoji: '🏆', label: 'Proud' },
  { mood: 'peaceful',    emoji: '🌿', label: 'Peaceful' },
  { mood: 'reflective',  emoji: '🤔', label: 'Reflective' },
  { mood: 'bittersweet', emoji: '😢', label: 'Bittersweet' },
]

const CATEGORIES = [
  { value: 'family',      label: 'Family',       emoji: '👨‍👩‍👧' },
  { value: 'travel',      label: 'Travel',        emoji: '✈️' },
  { value: 'celebration', label: 'Celebrations',  emoji: '🎉' },
  { value: 'career',      label: 'Career',        emoji: '💼' },
  { value: 'nature',      label: 'Nature',        emoji: '🌲' },
  { value: 'food',        label: 'Food',          emoji: '🍽️' },
  { value: 'friends',     label: 'Friends',       emoji: '🤝' },
  { value: 'everyday',    label: 'Everyday',      emoji: '☕' },
]

const NAV_TABS: { mode: BrowseMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'home',       label: 'Home',       icon: <Sparkles size={15} /> },
  { mode: 'timeline',   label: 'Timeline',   icon: <Clock size={15} /> },
  { mode: 'people',     label: 'People',     icon: <Users size={15} /> },
  { mode: 'places',     label: 'Places',     icon: <MapPin size={15} /> },
  { mode: 'moods',      label: 'Moods',      icon: <Heart size={15} /> },
  { mode: 'categories', label: 'Categories', icon: <BookOpen size={15} /> },
  { mode: 'media',      label: 'Gallery',    icon: <Grid3x3 size={15} /> },
]

export default function LifePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [memories, setMemories] = useState<Memory[]>([])
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([])
  const [allMedia, setAllMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()
  const [browseMode, setBrowseMode] = useState<BrowseMode>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [contactAvatars, setContactAvatars] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([])

  const supabase = createClient()

  // ── Load memories ─────────────────────────────────────────────────────────
  const loadMemories = useCallback(async (mood?: MoodType | null, category?: string | null) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    let query = supabase
      .from('memories')
      .select(`*, memory_media(id, file_url, file_type, is_cover)`)
      .eq('user_id', user.id)
      .neq('memory_type', 'wisdom')
      .order('memory_date', { ascending: false })

    if (mood) query = query.eq('mood', mood)
    if (category) query = query.eq('ai_category', category)

    const { data } = await query
    setMemories(data || [])
    setFilteredMemories(data || [])
    setLoading(false)
  }, [supabase])

  // ── Load all media ─────────────────────────────────────────────────────────
  const loadAllMedia = useCallback(async () => {
    setMediaLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMediaLoading(false); return }

    const { data } = await supabase
      .from('memory_media')
      .select(`id, file_url, file_type, taken_at, memory_id, memory:memories(id, title)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300)

    const transformed = (data || []).map((item: any) => ({
      ...item,
      memory: Array.isArray(item.memory) ? item.memory[0] : item.memory,
    }))
    setAllMedia(transformed)
    setMediaLoading(false)
  }, [supabase])

  // ── Load contacts ─────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, profile_photo_url')
      .eq('user_id', user.id)
      .order('full_name')
      .limit(12)
    if (data) {
      setContactAvatars(data.map((c: any) => ({ id: c.id, name: c.full_name, avatar_url: c.profile_photo_url })))
    }
  }, [supabase])

  useEffect(() => {
    loadMemories()
    loadContacts()
    loadAllMedia()
  }, [loadMemories, loadContacts, loadAllMedia])

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredMemories(memories); return }
    const q = searchQuery.toLowerCase()
    setFilteredMemories(
      memories.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.location_name?.toLowerCase().includes(q)
      )
    )
  }, [searchQuery, memories])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMoodFilter = (mood: MoodType) => {
    if (selectedMood === mood) {
      setSelectedMood(null); setBrowseMode('home'); loadMemories()
    } else {
      setSelectedMood(mood); setSelectedCategory(null)
      setBrowseMode('moods'); loadMemories(mood, null)
    }
  }

  const handleCategoryFilter = (cat: string) => {
    if (selectedCategory === cat) {
      setSelectedCategory(null); setBrowseMode('home'); loadMemories()
    } else {
      setSelectedCategory(cat); setSelectedMood(null)
      setBrowseMode('categories'); loadMemories(null, cat)
    }
  }

  const handleTabChange = (mode: BrowseMode) => {
    if (mode !== 'moods') setSelectedMood(null)
    if (mode !== 'categories') setSelectedCategory(null)
    if (['home', 'timeline', 'people', 'places'].includes(mode)) loadMemories()
    setBrowseMode(mode)
  }

  // ── Bulk upload ────────────────────────────────────────────────────────────
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        const memRes = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            memory_date: new Date().toISOString().split('T')[0],
            memory_type: 'moment',
          }),
        })
        const { memory } = await memRes.json()
        if (!memory?.id) continue
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`/api/memories/${memory.id}/media`, { method: 'POST', body: fd })
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    setUploading(false)
    loadMemories()
    loadAllMedia()
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const recentMemories = filteredMemories.slice(0, 16)
  const favoriteMemories = memories.filter(m => m.is_favorite).slice(0, 6)
  const imageMedia = allMedia.filter(m => {
    const ft = m.file_type?.toLowerCase() || ''
    const url = (m.file_url || '').toLowerCase()
    return ft.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(url)
  })

  // Only use real external URLs for the slideshow (not /images/icons/ placeholders)
  const slideItems = imageMedia
    .filter(m => m.file_url?.startsWith('http://') || m.file_url?.startsWith('https://'))
    .slice(0, 100)
    .map(m => ({
      id: m.id,
      url: m.file_url,
      title: m.memory?.title,
      date: m.taken_at ? new Date(m.taken_at).toLocaleDateString() : undefined,
    }))

  const MEMORY_GRID = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2'

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      <div className="relative z-10">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="page-header-title">Your Life</h1>
                <p className="page-header-subtitle">{memories.length} memories captured</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Media (bulk upload) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-secondary flex items-center gap-2"
              >
                {uploading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Upload size={16} />
                }
                <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Add Media'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleBulkUpload}
              />

              {/* Add Memory */}
              <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} />
                <span className="hidden sm:inline">Add Memory</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#406A56]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, people, places..."
              className="form-input !pl-11 pr-10 w-full placeholder:text-[#999]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#406A56]/50 hover:text-[#406A56]">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Reminisce By tabs */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#406A56]/60 uppercase tracking-widest mb-2">Reminisce By</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {NAV_TABS.map(tab => (
                <button
                  key={tab.mode}
                  onClick={() => handleTabChange(tab.mode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    browseMode === tab.mode
                      ? 'bg-[#406A56] text-white shadow-sm'
                      : 'bg-white/80 text-[#406A56] hover:bg-white border border-[#406A56]/20'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <main className="space-y-8">

          {/* ═══ HOME ═══════════════════════════════════════════════════════ */}
          {browseMode === 'home' && (
            <>
              {/* Life Story Engine */}
              <LifeStoryEngine slideItems={slideItems} />

              {/* Today in Your Life */}
              <section>
                <OnThisDay />
              </section>

              {/* Recent Memories */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-[#2d2d2d]">Recent Memories</h2>
                  <button onClick={() => handleTabChange('timeline')} className="text-sm text-[#406A56] hover:underline font-medium">
                    See timeline →
                  </button>
                </div>
                {loading ? (
                  <div className="loading-container"><div className="loading-text">Loading...</div></div>
                ) : recentMemories.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><ImageIcon size={32} className="text-[#406A56]/50" /></div>
                    <h3 className="empty-state-title">No memories yet</h3>
                    <p className="empty-state-text">Start capturing your life's moments</p>
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary mx-auto">
                      <Plus size={18} /> Create your first memory
                    </button>
                  </div>
                ) : (
                  <div className={MEMORY_GRID}>
                    {recentMemories.map(m => <LifeMemoryCard key={m.id} memory={m} />)}
                  </div>
                )}
              </section>

              {/* Favorites */}
              {favoriteMemories.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={18} className="text-[#D9C61A] fill-[#D9C61A]" />
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">Favorites</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {favoriteMemories.map(m => (
                      <div key={m.id} className="flex-shrink-0 w-44">
                        <MemoryCardClean memory={m} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Your People */}
              {contactAvatars.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">Your People</h2>
                    <button onClick={() => handleTabChange('people')} className="text-sm text-[#406A56] hover:underline font-medium">
                      Explore →
                    </button>
                  </div>
                  <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {contactAvatars.map(contact => (
                      <Link
                        key={contact.id}
                        href={`/dashboard/contacts/${contact.id}`}
                        className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#406A56]/20 to-[#D9C61A]/20 border-2 border-white shadow-sm group-hover:border-[#406A56] transition-all">
                          {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt={contact.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-lg font-bold text-[#406A56]/60">
                                {contact.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-[#406A56]/70 font-medium truncate w-14 text-center">
                          {contact.name.split(' ')[0]}
                        </span>
                      </Link>
                    ))}
                    <button onClick={() => handleTabChange('people')} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#406A56]/30 flex items-center justify-center hover:border-[#406A56] transition-colors">
                        <Users size={18} className="text-[#406A56]/50" />
                      </div>
                      <span className="text-xs text-[#406A56]/50 font-medium">See all</span>
                    </button>
                  </div>
                </section>
              )}

              {/* Life Map */}
              {memories.some(m => m.location_lat && m.location_lng) && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">Your Life Map</h2>
                    <button onClick={() => handleTabChange('places')} className="text-sm text-[#406A56] hover:underline font-medium">
                      Explore →
                    </button>
                  </div>
                  <div className="glass-card-page overflow-hidden rounded-2xl" style={{ height: 260 }}>
                    <MapView memories={memories} onSelectMemory={(m) => router.push(`/dashboard/memories/${m.id}`)} />
                  </div>
                </section>
              )}

              {/* Moods */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-[#2d2d2d]">Your Moods</h2>
                  <button onClick={() => handleTabChange('moods')} className="text-sm text-[#406A56] hover:underline font-medium">
                    Filter →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MOOD_DISPLAY.map(({ mood, emoji, label }) => {
                    const count = memories.filter(m => m.mood === mood).length
                    if (count === 0) return null
                    return (
                      <button
                        key={mood}
                        onClick={() => handleMoodFilter(mood)}
                        className="glass-card-page p-3 text-left hover:shadow-md transition-all"
                      >
                        <div className="text-2xl mb-1">{emoji}</div>
                        <div className="font-semibold text-[#2d2d2d] text-sm">{label}</div>
                        <div className="text-xs text-[#406A56]/60 mt-0.5">{count} {count === 1 ? 'memory' : 'memories'}</div>
                      </button>
                    )
                  })}
                </div>
              </section>
            </>
          )}

          {/* ═══ TIMELINE ════════════════════════════════════════════════════ */}
          {browseMode === 'timeline' && <TimelineBrowse memories={memories} />}

          {/* ═══ PEOPLE ══════════════════════════════════════════════════════ */}
          {browseMode === 'people' && <PeopleBrowse />}

          {/* ═══ PLACES ══════════════════════════════════════════════════════ */}
          {browseMode === 'places' && <PlacesBrowse memories={memories} />}

          {/* ═══ MOODS ═══════════════════════════════════════════════════════ */}
          {browseMode === 'moods' && (
            <section>
              <div className="flex flex-wrap gap-3 mb-6">
                {MOOD_DISPLAY.map(({ mood, emoji, label }) => (
                  <button
                    key={mood}
                    onClick={() => handleMoodFilter(mood)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                      selectedMood === mood
                        ? 'bg-[#406A56] text-white border-[#406A56] shadow-sm'
                        : 'bg-white/80 text-[#406A56] border-[#406A56]/20 hover:bg-white'
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedMood === mood ? 'bg-white/20' : 'bg-[#406A56]/10'}`}>
                      {memories.filter(m => m.mood === mood).length}
                    </span>
                  </button>
                ))}
                {selectedMood && (
                  <button
                    onClick={() => { setSelectedMood(null); loadMemories() }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#C35F33] border border-[#C35F33]/30 hover:bg-[#C35F33] hover:text-white transition-all"
                  >
                    <X size={14} /> Clear
                  </button>
                )}
              </div>
              {loading ? (
                <div className="loading-container"><div className="loading-text">Loading memories...</div></div>
              ) : filteredMemories.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Heart size={32} className="text-[#406A56]/50" /></div>
                  <h3 className="empty-state-title">No memories for this mood</h3>
                  <p className="empty-state-text">Select a mood above to filter your memories</p>
                </div>
              ) : (
                <div className={MEMORY_GRID}>
                  {filteredMemories.map(m => <LifeMemoryCard key={m.id} memory={m} />)}
                </div>
              )}
            </section>
          )}

          {/* ═══ CATEGORIES ══════════════════════════════════════════════════ */}
          {browseMode === 'categories' && (
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {CATEGORIES.map(({ value, label, emoji }) => {
                  const count = memories.filter(m => m.ai_category === value).length
                  return (
                    <button
                      key={value}
                      onClick={() => handleCategoryFilter(value)}
                      className={`glass-card-page p-4 text-left transition-all hover:shadow-md ${selectedCategory === value ? 'ring-2 ring-[#406A56]' : ''}`}
                    >
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div className="font-semibold text-[#2d2d2d] text-sm">{label}</div>
                      <div className="text-xs text-[#406A56]/60 mt-0.5">{count} {count === 1 ? 'memory' : 'memories'}</div>
                    </button>
                  )
                })}
              </div>
              {loading ? (
                <div className="loading-container"><div className="loading-text">Loading memories...</div></div>
              ) : filteredMemories.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><BookOpen size={32} className="text-[#406A56]/50" /></div>
                  <h3 className="empty-state-title">{selectedCategory ? 'No memories in this category' : 'Select a category above'}</h3>
                </div>
              ) : (
                <div className={MEMORY_GRID}>
                  {filteredMemories.map(m => <LifeMemoryCard key={m.id} memory={m} />)}
                </div>
              )}
            </section>
          )}

          {/* ═══ GALLERY / MEDIA ═════════════════════════════════════════════ */}
          {browseMode === 'media' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2d2d]">All Media</h2>
                  <p className="text-sm text-[#666]">{allMedia.length} items across your memories</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary flex items-center gap-1.5 text-sm"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <Link href="/dashboard/gallery" className="text-sm text-[#406A56] hover:underline font-medium">
                    Full gallery →
                  </Link>
                </div>
              </div>

              {mediaLoading ? (
                <div className="loading-container"><div className="loading-text">Loading media...</div></div>
              ) : allMedia.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><ImageIcon size={32} className="text-[#406A56]/50" /></div>
                  <h3 className="empty-state-title">No media yet</h3>
                  <p className="empty-state-text">Add photos and videos to your memories</p>
                  <button onClick={() => fileInputRef.current?.click()} className="btn-primary mx-auto">
                    <Upload size={16} /> Upload Media
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {allMedia
                    .filter(item => item.file_url?.startsWith('http://') || item.file_url?.startsWith('https://'))
                    .map(item => {
                    const isImg = item.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(item.file_url || '')
                    const isVid = item.file_type?.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(item.file_url || '')
                    return (
                      <div
                        key={item.id}
                        onClick={() => item.memory_id && router.push(`/dashboard/memories/${item.memory_id}`)}
                        className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer group relative"
                      >
                        {isImg ? (
                          <img
                            src={item.file_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                          />
                        ) : isVid ? (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ImageIcon size={20} className="text-gray-400" />
                          </div>
                        )}
                        {/* Memory title on hover */}
                        {item.memory?.title && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                            <p className="text-white text-[9px] leading-tight line-clamp-2">{item.memory.title}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* Create Memory Modal */}
      <CreateMemoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { loadMemories(); setShowCreateModal(false) }}
      />
    </div>
  )
}
