'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Check, Loader2, Star, X, Music, Film, BookOpen, Utensils, Car, Shirt, MapPin, Quote, Dumbbell, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ListItemCardProps {
  category: string // books, movies, music, tv_shows, foods, cars, clothes, places, quotes, hobbies, sports_teams
  promptText: string
  data: { item?: string; story?: string; imageUrl?: string; year?: string; person?: string; rating?: number; metadata?: any }
  onSave: (data: { item: string; story: string; imageUrl?: string; year?: string; person?: string; rating?: number; metadata?: any }) => void
  saved: boolean
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; searchApi?: string; placeholder: string }> = {
  books:        { icon: BookOpen, color: '#2D5A3D', bg: '#E6F0EA', placeholder: 'Book title...', searchApi: 'books' },
  movies:       { icon: Film,     color: '#B8562E', bg: '#FBF0EB', placeholder: 'Movie title...', searchApi: 'movies' },
  music:        { icon: Music,    color: '#6B5B95', bg: '#EFEAF5', placeholder: 'Song or artist...', searchApi: 'music' },
  tv_shows:     { icon: Film,     color: '#C4A235', bg: '#FAF5E4', placeholder: 'TV show...', searchApi: 'tv' },
  foods:        { icon: Utensils, color: '#B8562E', bg: '#FBF0EB', placeholder: 'Dish or cuisine...' },
  cars:         { icon: Car,      color: '#5A6660', bg: '#F0F0EC', placeholder: 'Make and model...' },
  clothes:      { icon: Shirt,    color: '#8A6BA8', bg: '#F0EAF5', placeholder: 'Brand or style...' },
  places:       { icon: MapPin,   color: '#2D5A3D', bg: '#E6F0EA', placeholder: 'Place name...' },
  quotes:       { icon: Quote,    color: '#C4A235', bg: '#FAF5E4', placeholder: 'The quote...' },
  hobbies:      { icon: Dumbbell, color: '#5B8A72', bg: '#E6F0EB', placeholder: 'Activity...' },
  sports_teams: { icon: Trophy,   color: '#B8562E', bg: '#FBF0EB', placeholder: 'Team name...' },
}

export function ListItemCard({ category, promptText, data, onSave, saved }: ListItemCardProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.books
  const Icon = config.icon

  const [item, setItem] = useState(data.item || '')
  const [story, setStory] = useState(data.story || '')
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '')
  const [year, setYear] = useState(data.year || '')
  const [person, setPerson] = useState(data.person || '')
  const [rating, setRating] = useState(data.rating || 0)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(data.metadata?.previewUrl || '')
  const [externalUrl, setExternalUrl] = useState(data.metadata?.externalUrl || '')
  const [searchResults, setSearchResults] = useState<{ name: string; artist?: string; imageUrl?: string; previewUrl?: string; externalUrl?: string }[]>([])
  const [contacts, setContacts] = useState<{ id: string; full_name: string }[]>([])
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const supabase = createClient()

  // Load contacts for "Who introduced you" suggestions
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('contacts').select('id, full_name').eq('user_id', user.id).order('full_name')
      if (data) setContacts(data)
    }
    load()
  }, [])

  // Search + enrich: fetch suggestions and cover art
  const enrichItem = useCallback(async (name: string) => {
    if (name.length < 2 || !config.searchApi) { setSearchResults([]); return }
    setEnriching(true)
    try {
      if (config.searchApi === 'music') {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&limit=20`)
        const data = await res.json()
        setSearchResults((data.results || []).map((r: any) => ({
          name: `${r.trackName} — ${r.artistName}`,
          artist: r.artistName,
          imageUrl: r.artworkUrl100?.replace('100x100', '300x300'),
          previewUrl: r.previewUrl,
          externalUrl: r.trackViewUrl,
        })))
        if (data.results?.[0]) {
          setImageUrl(data.results[0].artworkUrl100?.replace('100x100', '300x300') || '')
          setPreviewUrl(data.results[0].previewUrl || '')
          setExternalUrl(data.results[0].trackViewUrl || '')
        }
      } else if (config.searchApi === 'movies' || config.searchApi === 'tv') {
        const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(name)}&apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY || 'trilogy'}&type=${config.searchApi === 'tv' ? 'series' : 'movie'}`)
        const data = await res.json()
        setSearchResults((data.Search || []).slice(0, 5).map((r: any) => ({
          name: `${r.Title} (${r.Year})`,
          imageUrl: r.Poster !== 'N/A' ? r.Poster : undefined,
          externalUrl: r.imdbID ? `https://www.imdb.com/title/${r.imdbID}` : undefined,
        })))
        if (data.Search?.[0]) {
          const detailRes = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(data.Search[0].Title)}&apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY || 'trilogy'}`)
          const detail = await detailRes.json()
          if (detail.Poster && detail.Poster !== 'N/A') setImageUrl(detail.Poster)
          if (detail.imdbID) setExternalUrl(`https://www.imdb.com/title/${detail.imdbID}`)
        }
      } else if (config.searchApi === 'books') {
        // Search Google Books — matches by title OR author. Returns more results
        // so author searches (e.g. "Stephen King") have enough to browse.
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(name)}&maxResults=20&printType=books`)
        const data = await res.json()
        const items = (data.items || []).filter((r: any) => r.volumeInfo?.title)
        setSearchResults(items.slice(0, 20).map((r: any) => {
          const authors = r.volumeInfo?.authors || []
          const authorStr = authors.length > 0 ? authors.slice(0, 2).join(', ') : 'Unknown'
          return {
            name: `${r.volumeInfo.title} — ${authorStr}`,
            artist: authorStr,
            imageUrl: r.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:'),
            externalUrl: r.volumeInfo?.previewLink || r.volumeInfo?.infoLink,
          }
        }))
        // Only auto-fill the cover if the top hit's title actually matches what the user typed
        // (prevents random hit data overwriting a half-typed query)
        const top = items[0]
        if (top && top.volumeInfo?.title?.toLowerCase().includes(name.toLowerCase().slice(0, 4))) {
          const thumb = top.volumeInfo?.imageLinks?.thumbnail
          if (thumb) setImageUrl(thumb.replace('http:', 'https:'))
          if (top.volumeInfo?.previewLink || top.volumeInfo?.infoLink) {
            setExternalUrl(top.volumeInfo.previewLink || top.volumeInfo.infoLink)
          }
        }
      }
    } catch {}
    setEnriching(false)
  }, [config.searchApi])

  const handleItemChange = (val: string) => {
    setItem(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => enrichItem(val), 800)
  }

  const handleSave = async () => {
    if (!item.trim()) return
    setSaving(true)
    await onSave({
      item: item.trim(),
      story: story.trim(),
      imageUrl: imageUrl || undefined,
      year: year || undefined,
      person: person || undefined,
      rating: rating || undefined,
      metadata: {
        previewUrl: previewUrl || undefined,
        externalUrl: externalUrl || undefined,
      },
    })
    setSaving(false)
  }

  // ── Saved view — rich display ──
  if (saved && data.item) {
    return (
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Cover art background */}
        {data.imageUrl && (
          <div className="absolute inset-0">
            <img src={data.imageUrl} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(30px) brightness(0.3) saturate(1.2)' }} />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        <div className={`relative z-10 flex-1 flex flex-col p-6 ${data.imageUrl ? 'text-white' : ''}`}>
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: data.imageUrl ? 'rgba(255,255,255,0.15)' : config.bg }}>
              <Icon size={14} style={{ color: data.imageUrl ? 'white' : config.color }} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${data.imageUrl ? 'text-white/60' : 'text-[#94A09A]'}`}>
              {category.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Cover art */}
          {data.imageUrl && (
            <div className="flex justify-center mb-4">
              <img src={data.imageUrl} alt={data.item} className="w-32 h-32 rounded-xl object-cover shadow-2xl" />
            </div>
          )}

          {/* Item name */}
          <h3 className={`text-xl font-bold leading-tight mb-1 ${data.imageUrl ? 'text-white' : 'text-[#1A1F1C]'}`}
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
            {data.item}
          </h3>

          {/* Rating */}
          {data.rating && (
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={14} className={i <= data.rating! ? 'text-[#C4A235]' : 'text-white/20'} fill={i <= data.rating! ? '#C4A235' : 'none'} />
              ))}
            </div>
          )}

          {/* Story */}
          {data.story && (
            <p className={`text-sm leading-relaxed italic flex-1 ${data.imageUrl ? 'text-white/80' : 'text-[#5A6660]'}`}>
              &ldquo;{data.story}&rdquo;
            </p>
          )}

          {/* Preview/snippet */}
          {data.metadata?.previewUrl && (
            <audio src={data.metadata.previewUrl} controls className="w-full max-w-[200px] mt-2 h-7" style={data.imageUrl ? { filter: 'invert(1) hue-rotate(180deg)', opacity: 0.8 } : undefined} />
          )}

          {/* External link */}
          {data.metadata?.externalUrl && (
            <a
              href={data.metadata.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-xs mt-2 hover:underline ${data.imageUrl ? 'text-white/60' : 'text-[#2D5A3D]'}`}
            >
              {category === 'music' ? 'Listen' : category === 'movies' || category === 'tv_shows' ? 'View on IMDB' : category === 'books' ? 'Preview on Google Books' : 'View'} →
            </a>
          )}

          {/* Meta */}
          <div className={`flex items-center gap-3 mt-auto pt-2 text-xs ${data.imageUrl ? 'text-white/50' : 'text-[#94A09A]'}`}>
            {data.year && <span>{data.year}</span>}
            {data.person && <><span>·</span><span>via {data.person}</span></>}
          </div>
        </div>
      </div>
    )
  }

  // ── Edit view ──
  return (
    <div className="h-full flex flex-col p-5 gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: config.bg }}>
          <Icon size={14} style={{ color: config.color }} />
        </div>
        <p className="text-sm font-medium text-[#1A1F1C] flex-1">{promptText}</p>
      </div>

      {/* Item input + cover preview */}
      <div className="relative">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              value={item}
              onChange={(e) => handleItemChange(e.target.value)}
              placeholder={config.placeholder}
              className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]"
            />
          </div>
          {(imageUrl || enriching) && (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F5F3EE] flex-shrink-0 flex items-center justify-center">
              {enriching ? <Loader2 size={14} className="animate-spin text-[#94A09A]" /> :
               imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : null}
            </div>
          )}
        </div>
        {/* Search suggestions dropdown */}
        {searchResults.length > 0 && item.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#DDE3DF] z-20 max-h-[240px] overflow-y-auto overscroll-contain">
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => {
                  setItem(result.name.split(' — ')[0].split(' (')[0])
                  if (result.imageUrl) setImageUrl(result.imageUrl)
                  if (result.previewUrl) setPreviewUrl(result.previewUrl)
                  if (result.externalUrl) setExternalUrl(result.externalUrl)
                  setSearchResults([])
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#E6F0EA] transition-colors text-sm"
              >
                {result.imageUrl && <img src={result.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
                <span className="text-[#1A1F1C] truncate">{result.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Story */}
      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value)}
        placeholder="Why is this special to you?"
        spellCheck
        autoCapitalize="sentences"
        autoCorrect="on"
        className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none flex-1 min-h-[60px]"
      />

      {/* Optional fields row */}
      <div className="flex gap-2">
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year"
          className="w-20 px-2 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-[#1A1F1C] text-xs focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]"
        />
        {/* Who introduced you — with contact suggestions */}
        <div className="flex-1 relative">
          <input
            value={person}
            onChange={(e) => { setPerson(e.target.value); setShowPersonSuggestions(true) }}
            onFocus={() => setShowPersonSuggestions(true)}
            onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
            placeholder="Who introduced you?"
            className="w-full px-2 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-[#1A1F1C] text-xs focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]"
          />
          {showPersonSuggestions && contacts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#DDE3DF] z-20 max-h-[200px] overflow-y-auto">
              {contacts
                .filter(c => !person || c.full_name.toLowerCase().includes(person.toLowerCase()))
                .map(c => (
                  <button
                    key={c.id}
                    onMouseDown={(e) => { e.preventDefault(); setPerson(c.full_name); setShowPersonSuggestions(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#1A1F1C] hover:bg-[#E6F0EA] transition-colors"
                  >
                    {c.full_name}
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#94A09A] uppercase tracking-wider mr-2">Rating</span>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => setRating(rating === i ? 0 : i)} className="p-0.5">
            <Star size={18} className={i <= rating ? 'text-[#C4A235]' : 'text-[#DDE3DF]'} fill={i <= rating ? '#C4A235' : 'none'} />
          </button>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!item.trim() || saving}
        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-all active:scale-[0.96]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save</>}
      </button>
    </div>
  )
}
