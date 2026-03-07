'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search, Clock, Users, MapPin, Heart, Grid3X3, Sparkles,
  Play, ChevronLeft, ChevronRight, X, Plus, Map,
  BookOpen, Smile, Image, Film, Mic, Star, ArrowRight,
  Calendar, SlidersHorizontal, ChevronDown
} from 'lucide-react'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface Memory {
  id: string
  title: string
  description?: string
  memory_date?: string
  memory_type?: string
  ai_mood?: string
  ai_category?: string
  location_name?: string
  location_lat?: number
  location_lng?: number
  is_favorite?: boolean
  media?: { file_url: string; file_type: string }[]
  people?: { name: string; avatar?: string }[]
  tags?: string[]
  created_at: string
}

type BrowseMode = 'timeline' | 'people' | 'places' | 'moods' | 'categories'

const MOODS = [
  { key: 'happy',       label: 'Happy',       emoji: '😊', color: '#FFD700' },
  { key: 'grateful',    label: 'Grateful',    emoji: '🙏', color: '#FF8C69' },
  { key: 'proud',       label: 'Proud',       emoji: '🌟', color: '#9B59B6' },
  { key: 'adventurous', label: 'Adventure',   emoji: '🌄', color: '#2ECC71' },
  { key: 'love',        label: 'Love',        emoji: '❤️', color: '#E74C3C' },
  { key: 'funny',       label: 'Funny',       emoji: '😂', color: '#F39C12' },
  { key: 'peaceful',    label: 'Peaceful',    emoji: '🌊', color: '#3498DB' },
  { key: 'reflective',  label: 'Reflection',  emoji: '🤔', color: '#7F8C8D' },
]

const CATEGORIES = [
  { key: 'family',      label: 'Family',      icon: '👨‍👩‍👧', color: '#E74C3C' },
  { key: 'travel',      label: 'Travel',      icon: '✈️',    color: '#3498DB' },
  { key: 'milestones',  label: 'Milestones',  icon: '🏆',    color: '#F39C12' },
  { key: 'career',      label: 'Career',      icon: '💼',    color: '#2C3E50' },
  { key: 'friends',     label: 'Friends',     icon: '🤝',    color: '#27AE60' },
  { key: 'holidays',    label: 'Holidays',    icon: '🎄',    color: '#E74C3C' },
  { key: 'school',      label: 'School',      icon: '📚',    color: '#8E44AD' },
  { key: 'wisdom',      label: 'Wisdom',      icon: '🦉',    color: '#D35400' },
]

const LIFE_CHAPTERS = [
  { label: 'Childhood',    years: '–2000',   color: '#FFB6C1' },
  { label: 'College',      years: '2001–07', color: '#87CEEB' },
  { label: 'Early Career', years: '2008–14', color: '#90EE90' },
  { label: 'Marriage',     years: '2015–17', color: '#FFD700' },
  { label: 'Parenthood',   years: '2018–',   color: '#DDA0DD' },
]

// ─────────────────────────────────────────
// DEMO PAGE
// ─────────────────────────────────────────
export default function MemoriesDemoPage() {
  const supabase = createClient()

  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [browseMode, setBrowseMode] = useState<BrowseMode>('timeline')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [reminisceMode, setReminisceMode] = useState(false)
  const [reminisceIndex, setReminisceIndex] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const reminisceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadMemories()
  }, [])

  useEffect(() => {
    if (reminisceMode) {
      reminisceTimer.current = setInterval(() => {
        setReminisceIndex(i => (i + 1) % Math.max(memories.length, 1))
      }, 4000)
    } else {
      if (reminisceTimer.current) clearInterval(reminisceTimer.current)
    }
    return () => { if (reminisceTimer.current) clearInterval(reminisceTimer.current) }
  }, [reminisceMode, memories.length])

  const loadMemories = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('memories')
      .select(`
        id, title, description, memory_date, memory_type,
        ai_mood, ai_category, location_name, location_lat, location_lng,
        is_favorite, tags, created_at,
        media:memory_media(file_url, file_type)
      `)
      .eq('user_id', user.id)
      .neq('memory_type', 'onboarding_gallery')
      .order('memory_date', { ascending: false, nullsFirst: false })
      .limit(100)

    setMemories((data as Memory[]) || [])
    setLoading(false)
  }

  // ─── FILTERING ───────────────────────────
  const filtered = memories.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.location_name?.toLowerCase().includes(q) ||
        m.ai_category?.toLowerCase().includes(q) ||
        m.ai_mood?.toLowerCase().includes(q)
      )
    }
    if (selectedMood) return m.ai_mood?.toLowerCase() === selectedMood
    if (selectedCategory) return m.ai_category?.toLowerCase() === selectedCategory
    return true
  })

  // ─── TIMELINE GROUPS ─────────────────────
  const byYear = filtered.reduce<Record<string, Record<string, Memory[]>>>((acc, m) => {
    const d = m.memory_date ? new Date(m.memory_date) : new Date(m.created_at)
    const y = d.getFullYear().toString()
    const mo = d.toLocaleString('en-US', { month: 'long' })
    if (!acc[y]) acc[y] = {}
    if (!acc[y][mo]) acc[y][mo] = []
    acc[y][mo].push(m)
    return acc
  }, {})

  // ─── TODAY IN YOUR LIFE ──────────────────
  const today = new Date()
  const todayInLife = memories.filter(m => {
    if (!m.memory_date) return false
    const d = new Date(m.memory_date)
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() !== today.getFullYear()
  }).slice(0, 3)

  // ─── UNIQUE PEOPLE ────────────────────────
  const peopleMock = [
    { name: 'Emma', count: 48, initials: 'E', color: '#E74C3C' },
    { name: 'Sarah', count: 82, initials: 'S', color: '#8E44AD' },
    { name: 'Mom', count: 34, initials: 'M', color: '#3498DB' },
    { name: 'Dad', count: 29, initials: 'D', color: '#27AE60' },
    { name: 'Chris', count: 17, initials: 'C', color: '#F39C12' },
  ]

  // ─── REMINISCE MODE ──────────────────────
  const reminisceMemory = memories[reminisceIndex]

  // ─── COVER IMAGE ─────────────────────────
  const coverImage = (m: Memory) =>
    m.media?.find(x => x.file_type === 'image')?.file_url

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background"><div className="page-blob page-blob-1"/><div className="page-blob page-blob-2"/></div>
        <div className="loading-container"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#406A56]"/></div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1"/>
        <div className="page-blob page-blob-2"/>
        <div className="page-blob page-blob-3"/>
      </div>

      {/* ── REMINISCE MODE OVERLAY ─────────────────── */}
      <AnimatePresence>
        {reminisceMode && reminisceMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
          >
            {/* Background image */}
            {coverImage(reminisceMemory) && (
              <motion.img
                key={reminisceMemory.id}
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.4 }}
                transition={{ duration: 1 }}
                src={coverImage(reminisceMemory)}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60"/>

            {/* Content */}
            <motion.div
              key={`content-${reminisceMemory.id}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative z-10 text-center max-w-xl px-8"
            >
              {reminisceMemory.ai_mood && (
                <p className="text-2xl mb-4">
                  {MOODS.find(m => m.key === reminisceMemory.ai_mood?.toLowerCase())?.emoji || '✨'}
                </p>
              )}
              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                {reminisceMemory.title}
              </h2>
              {reminisceMemory.memory_date && (
                <p className="text-white/60 text-sm mb-4">
                  {new Date(reminisceMemory.memory_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {reminisceMemory.location_name && ` · ${reminisceMemory.location_name}`}
                </p>
              )}
              {reminisceMemory.description && (
                <p className="text-white/80 text-base leading-relaxed line-clamp-3">
                  {reminisceMemory.description}
                </p>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mt-8">
                {memories.slice(0, 8).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === reminisceIndex % 8 ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}/>
                ))}
              </div>
            </motion.div>

            {/* Controls */}
            <button onClick={() => setReminisceMode(false)}
              className="absolute top-6 right-6 p-2 text-white/60 hover:text-white bg-white/10 rounded-full">
              <X size={20}/>
            </button>
            <button onClick={() => setReminisceIndex(i => Math.max(0, i - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white bg-white/10 rounded-full">
              <ChevronLeft size={20}/>
            </button>
            <button onClick={() => setReminisceIndex(i => (i + 1) % memories.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white bg-white/10 rounded-full">
              <ChevronRight size={20}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ───────────────────────────── */}
      <div className="relative z-10">

        {/* ── HEADER ─────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/memories" className="page-header-back">
                <ChevronLeft size={20}/>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="page-header-title">Memory Gallery</h1>
                  <span className="px-2 py-0.5 bg-[#D9C61A]/20 text-[#9a8c12] text-xs rounded-full font-medium">DEMO</span>
                </div>
                <p className="page-header-subtitle">{memories.length} memories · Your life story</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Play My Life */}
              <button
                onClick={() => { setReminisceMode(true); setReminisceIndex(0) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#4A3552] hover:bg-[#5d4466] text-white rounded-xl text-sm font-medium transition-all"
              >
                <Play size={14} fill="white"/>
                Play My Life
              </button>
              {/* Search */}
              <button onClick={() => setShowSearch(!showSearch)}
                className="p-2.5 glass-card-page text-[#406A56] rounded-xl hover:shadow-md transition-all">
                <Search size={18}/>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="mom christmas 2019 · italy trip · happy memory · college…"
                    className="form-input !pl-9 w-full"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={14}/></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Browse Mode Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {([
              { key: 'timeline',   label: 'Timeline',   icon: Clock },
              { key: 'people',     label: 'People',     icon: Users },
              { key: 'places',     label: 'Places',     icon: MapPin },
              { key: 'moods',      label: 'Moods',      icon: Heart },
              { key: 'categories', label: 'Categories', icon: Grid3X3 },
            ] as { key: BrowseMode; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setBrowseMode(key); setSelectedMood(null); setSelectedCategory(null) }}
                className={`filter-btn flex-shrink-0 flex items-center gap-1.5 ${browseMode === key ? 'filter-btn-active' : ''}`}
              >
                <Icon size={14}/> {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── TODAY IN YOUR LIFE ─────────────────── */}
        {todayInLife.length > 0 && browseMode === 'timeline' && (
          <section className="glass-card-page p-5 mb-8 border-l-4 border-[#D9C61A]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-[#D9C61A]"/>
              <h2 className="font-semibold text-[#2d2d2d] text-sm uppercase tracking-wide">Today in Your Life</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {todayInLife.map(m => (
                <Link key={m.id} href={`/dashboard/memories/${m.id}`}>
                  <div className="flex-shrink-0 w-52 glass-card-page rounded-xl overflow-hidden hover:shadow-md transition-all">
                    {coverImage(m) ? (
                      <img src={coverImage(m)} alt="" className="w-full h-28 object-cover"/>
                    ) : (
                      <div className="w-full h-28 bg-gradient-to-br from-[#406A56]/20 to-[#D9C61A]/20 flex items-center justify-center">
                        <BookOpen size={24} className="text-[#406A56]/50"/>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium text-[#2d2d2d] text-sm line-clamp-1">{m.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(m.memory_date!).getFullYear()} · {new Date(m.memory_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── LIFE CHAPTERS ──────────────────────────── */}
        {browseMode === 'timeline' && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen size={14}/> Life Chapters
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {LIFE_CHAPTERS.map(ch => (
                <button
                  key={ch.label}
                  onClick={() => setSelectedChapter(selectedChapter === ch.label ? null : ch.label)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    selectedChapter === ch.label
                      ? 'text-white border-transparent'
                      : 'glass-card-page border-transparent text-gray-600 hover:border-gray-200'
                  }`}
                  style={selectedChapter === ch.label ? { backgroundColor: ch.color, borderColor: ch.color } : {}}
                >
                  <span>{ch.label}</span>
                  <span className="ml-1.5 text-xs opacity-60">{ch.years}</span>
                </button>
              ))}
              {selectedChapter && (
                <button onClick={() => setSelectedChapter(null)} className="flex-shrink-0 px-3 py-2 text-gray-400 hover:text-gray-600">
                  <X size={14}/>
                </button>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* BROWSE MODES                                    */}
        {/* ══════════════════════════════════════════════ */}

        {/* ── TIMELINE ─────────────────────────────── */}
        {browseMode === 'timeline' && (
          <div className="space-y-10">
            {Object.keys(byYear).sort((a, b) => +b - +a).map(year => (
              <section key={year}>
                <h2 className="text-2xl font-bold text-[#2d2d2d] mb-4 flex items-center gap-3">
                  <span>{year}</span>
                  <div className="flex-1 h-px bg-gray-200"/>
                  <span className="text-sm font-normal text-gray-400">
                    {Object.values(byYear[year]).flat().length} memories
                  </span>
                </h2>
                {Object.entries(byYear[year]).map(([month, mems]) => (
                  <div key={month} className="mb-8">
                    <h3 className="text-sm font-semibold text-[#406A56] uppercase tracking-wider mb-4 pl-1">{month}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {mems.map(m => <MemoryCard key={m.id} memory={m}/>)}
                    </div>
                  </div>
                ))}
              </section>
            ))}
            {filtered.length === 0 && <EmptyState query={searchQuery}/>}
          </div>
        )}

        {/* ── PEOPLE ─────────────────────────────────── */}
        {browseMode === 'people' && (
          <div>
            <div className="glass-card-page p-6 mb-8">
              <h2 className="font-semibold text-[#2d2d2d] mb-5 flex items-center gap-2">
                <Users size={18} className="text-[#406A56]"/> People You've Shared Life With
              </h2>
              <div className="flex flex-wrap gap-4">
                {peopleMock.map(p => (
                  <motion.div key={p.name} whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-all"
                      style={{ backgroundColor: p.color }}>
                      {p.initials}
                    </div>
                    <p className="text-sm font-medium text-[#2d2d2d]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.count} memories</p>
                  </motion.div>
                ))}
                <motion.div whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2 cursor-pointer opacity-50 hover:opacity-100">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Plus size={20} className="text-gray-400"/>
                  </div>
                  <p className="text-xs text-gray-400">Add person</p>
                </motion.div>
              </div>
            </div>

            {/* Relationship insight */}
            <div className="glass-card-page p-5 mb-6 bg-gradient-to-r from-[#4A3552]/5 to-transparent">
              <div className="flex items-start gap-3">
                <Sparkles size={16} className="text-[#D9C61A] mt-0.5"/>
                <div>
                  <p className="text-sm font-medium text-[#2d2d2d] mb-1">AI Relationship Insight</p>
                  <p className="text-sm text-gray-500">
                    You have <span className="font-semibold text-[#2d2d2d]">82 memories with Sarah</span>.
                    Most common location: <span className="font-semibold">Home</span>.
                    Most active period: <span className="font-semibold">2018–2022</span>.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-gray-400 mb-4">
              ⭐ Full People View requires face recognition tagging
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.slice(0, 12).map(m => <MemoryCard key={m.id} memory={m}/>)}
            </div>
          </div>
        )}

        {/* ── PLACES ─────────────────────────────────── */}
        {browseMode === 'places' && (
          <div>
            <div className="glass-card-page p-6 mb-6 text-center">
              <MapPin size={32} className="mx-auto text-[#406A56]/40 mb-3"/>
              <p className="font-medium text-[#2d2d2d] mb-1">Globe Map View</p>
              <p className="text-sm text-gray-400 mb-4">Interactive pins for every memory with location data</p>
              <Link href="/dashboard/gallery"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#406A56] text-white rounded-xl text-sm hover:bg-[#4a7a64] transition-colors">
                <Map size={14}/> Open Gallery Map
              </Link>
            </div>
            {/* Memories with location */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Memories with location</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.filter(m => m.location_name).map(m => <MemoryCard key={m.id} memory={m}/>)}
            </div>
            {filtered.filter(m => m.location_name).length === 0 && (
              <p className="text-center text-gray-400 py-12">No memories with location data yet.<br/>
                <span className="text-xs">Photos with GPS EXIF data will appear here automatically.</span>
              </p>
            )}
          </div>
        )}

        {/* ── MOODS ──────────────────────────────────── */}
        {browseMode === 'moods' && (
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-8">
              {MOODS.map(mood => {
                const count = memories.filter(m => m.ai_mood?.toLowerCase() === mood.key).length
                return (
                  <button key={mood.key} onClick={() => setSelectedMood(selectedMood === mood.key ? null : mood.key)}
                    className={`glass-card-page p-4 rounded-xl text-center transition-all hover:shadow-md ${selectedMood === mood.key ? 'ring-2' : ''}`}
                    style={selectedMood === mood.key ? { backgroundColor: `${mood.color}20`, outline: `2px solid ${mood.color}` } : {}}>
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs font-medium text-[#2d2d2d]">{mood.label}</div>
                    <div className="text-xs text-gray-400">{count}</div>
                  </button>
                )
              })}
            </div>
            {selectedMood ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{MOODS.find(m => m.key === selectedMood)?.emoji}</span>
                  <h2 className="font-semibold text-[#2d2d2d] capitalize">{selectedMood} memories</h2>
                  <button onClick={() => setSelectedMood(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(m => <MemoryCard key={m.id} memory={m}/>)}
                </div>
                {filtered.length === 0 && (
                  <p className="text-center text-gray-400 py-12 text-sm">
                    No memories with this mood yet.<br/>
                    <span className="text-xs">Moods are auto-detected by AI when a memory is created.</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Select a mood to browse</p>
            )}
          </div>
        )}

        {/* ── CATEGORIES ─────────────────────────────── */}
        {browseMode === 'categories' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {CATEGORIES.map(cat => {
                const count = memories.filter(m => m.ai_category?.toLowerCase() === cat.key).length
                return (
                  <button key={cat.key} onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                    className={`glass-card-page p-5 rounded-xl text-center transition-all hover:shadow-md ${selectedCategory === cat.key ? 'ring-2 ring-[#406A56]' : ''}`}>
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <div className="font-medium text-[#2d2d2d] text-sm">{cat.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{count} memories</div>
                  </button>
                )
              })}
            </div>
            {selectedCategory && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold text-[#2d2d2d] capitalize">{selectedCategory}</h2>
                  <button onClick={() => setSelectedCategory(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(m => <MemoryCard key={m.id} memory={m}/>)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── UNSTORIED MOMENTS ─────────────────────── */}
        <UnstoriedMoments/>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MEMORY CARD
// ─────────────────────────────────────────
function MemoryCard({ memory }: { memory: Memory }) {
  const cover = memory.media?.find(m => m.file_type === 'image')?.file_url

  const MOOD_EMOJI: Record<string, string> = {
    happy: '😊', grateful: '🙏', proud: '🌟', adventurous: '🌄',
    love: '❤️', funny: '😂', peaceful: '🌊', reflective: '🤔', sad: '😢',
  }

  return (
    <Link href={`/dashboard/memories/${memory.id}`}>
      <motion.div whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
        className="glass-card-page rounded-xl overflow-hidden cursor-pointer group">
        {/* Cover */}
        <div className="relative aspect-square overflow-hidden">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#406A56]/10 to-[#D9C61A]/10 flex items-center justify-center">
              <BookOpen size={24} className="text-[#406A56]/30"/>
            </div>
          )}
          {/* Mood overlay */}
          {memory.ai_mood && (
            <div className="absolute top-2 right-2 text-lg drop-shadow-sm">
              {MOOD_EMOJI[memory.ai_mood.toLowerCase()] || '✨'}
            </div>
          )}
          {/* Favorite */}
          {memory.is_favorite && (
            <div className="absolute top-2 left-2">
              <Star size={14} className="text-[#D9C61A] fill-[#D9C61A] drop-shadow"/>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3">
          <p className="font-medium text-[#2d2d2d] text-sm line-clamp-1 mb-1">{memory.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {memory.memory_date && (
              <span>{new Date(memory.memory_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            )}
            {memory.location_name && (
              <>
                <span className="text-gray-300">·</span>
                <span className="truncate max-w-[80px]">{memory.location_name}</span>
              </>
            )}
          </div>
          {memory.ai_category && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-[#406A56]/10 text-[#406A56] rounded-full text-[10px]">
              {memory.ai_category}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

// ─────────────────────────────────────────
// UNSTORIED MOMENTS
// ─────────────────────────────────────────
function UnstoriedMoments() {
  const supabase = createClient()
  const [unstoriedMedia, setUnstoriedMedia] = useState<{ id: string; file_url: string }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Media in onboarding_gallery memory (unassigned)
      const { data } = await supabase
        .from('memory_media')
        .select('id, file_url, memories!inner(memory_type)')
        .eq('user_id', user.id)
        .eq('memories.memory_type', 'onboarding_gallery')
        .eq('file_type', 'image')
        .limit(8)
      setUnstoriedMedia((data || []).map((d: { id: string; file_url: string }) => ({ id: d.id, file_url: d.file_url })))
    }
    load()
  }, [])

  if (unstoriedMedia.length === 0) return null

  return (
    <section className="mt-12 glass-card-page p-6 border-l-4 border-[#C35F33]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#2d2d2d] flex items-center gap-2">
            <Image size={16} className="text-[#C35F33]"/>
            Unstoried Moments
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">You uploaded these photos but haven't added a story yet</p>
        </div>
        <Link href="/dashboard/gallery"
          className="flex items-center gap-1.5 text-sm text-[#C35F33] hover:underline font-medium">
          View all <ArrowRight size={14}/>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {unstoriedMedia.map(m => (
          <div key={m.id} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden group">
            <img src={m.file_url} alt="" className="w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <Plus size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all"/>
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard/memories/new"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-[#C35F33]/30 rounded-xl text-[#C35F33] text-sm hover:bg-[#C35F33]/5 transition-colors">
        <Plus size={14}/> Create Memory from these photos
      </Link>
    </section>
  )
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16">
      <Search size={40} className="mx-auto text-gray-300 mb-4"/>
      <p className="text-gray-500 font-medium">{query ? `No results for "${query}"` : 'No memories yet'}</p>
      <p className="text-sm text-gray-400 mt-1">Try a different term, mood, or category</p>
    </div>
  )
}
