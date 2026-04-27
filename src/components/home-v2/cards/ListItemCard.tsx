'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Check, Loader2, Star, X, Music, Film, BookOpen, Utensils, Car, Shirt, MapPin, Quote, Dumbbell, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { searchBooks } from '@/lib/search/books'

interface ListItemCardProps {
  category: string // books, movies, music, tv_shows, foods, cars, clothes, places, quotes, hobbies, sports_teams
  promptText: string
  data: { item?: string; story?: string; imageUrl?: string; year?: string; person?: string; rating?: number; metadata?: any }
  onSave: (data: { item: string; story: string; imageUrl?: string; year?: string; person?: string; rating?: number; metadata?: any }) => void
  saved: boolean
}

// Editorial palette — color cycles across the 4 brand colors so different
// categories look distinct without losing system consistency. Used for the
// header tile + cover thumbnail + rating + SAVE button accents.
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; ink: string; searchApi?: string; placeholder: string }> = {
  books:        { icon: BookOpen, color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)', placeholder: 'Book title…', searchApi: 'books' },
  movies:       { icon: Film,     color: 'var(--ed-red, #E23B2E)',    ink: '#fff',                placeholder: 'Movie title…', searchApi: 'movies' },
  music:        { icon: Music,    color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff',                placeholder: 'Song or artist…', searchApi: 'music' },
  tv_shows:     { icon: Film,     color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)', placeholder: 'TV show…', searchApi: 'tv' },
  foods:        { icon: Utensils, color: 'var(--ed-red, #E23B2E)',    ink: '#fff',                placeholder: 'Dish or cuisine…' },
  cars:         { icon: Car,      color: 'var(--ed-ink, #111)',       ink: '#fff',                placeholder: 'Make and model…' },
  clothes:      { icon: Shirt,    color: 'var(--ed-ink, #111)',       ink: '#fff',                placeholder: 'Brand or style…' },
  places:       { icon: MapPin,   color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff',                placeholder: 'Place name…' },
  quotes:       { icon: Quote,    color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)', placeholder: 'The quote…' },
  hobbies:      { icon: Dumbbell, color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff',                placeholder: 'Activity…' },
  sports_teams: { icon: Trophy,   color: 'var(--ed-red, #E23B2E)',    ink: '#fff',                placeholder: 'Team name…' },
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
  const [searchResults, setSearchResults] = useState<{ name: string; artist?: string; year?: string; imageUrl?: string; previewUrl?: string; externalUrl?: string }[]>([])
  const [searchAttempted, setSearchAttempted] = useState(false)
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
    if (name.length < 2 || !config.searchApi) { setSearchResults([]); setSearchAttempted(false); return }
    setEnriching(true)
    setSearchAttempted(true)
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
        // Multi-source: canonical curated list + Google Books (plain + intitle) + Open Library.
        // De-duped and capped at 20. Provider failures skipped silently inside helper.
        const results = await searchBooks(name)
        setSearchResults(results)
        // Only auto-fill the cover if the top hit's title actually matches what the user typed
        // (prevents random hit data overwriting a half-typed query)
        const top = results[0]
        if (top && top.name.toLowerCase().includes(name.toLowerCase().slice(0, 4))) {
          if (top.imageUrl) setImageUrl(top.imageUrl)
          if (top.externalUrl) setExternalUrl(top.externalUrl)
        }
      }
    } catch {}
    setEnriching(false)
  }, [config.searchApi])

  const handleItemChange = (val: string) => {
    setItem(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => enrichItem(val), 300)
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
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{
                background: data.imageUrl ? 'rgba(255,255,255,0.15)' : config.color,
                color: data.imageUrl ? 'white' : config.ink,
                border: data.imageUrl ? 'none' : '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <Icon size={14} />
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

  // ── Edit view (editorial) ──
  return (
    <div
      className="h-full flex flex-col p-5 gap-3"
      style={{ background: 'var(--ed-cream, #F3ECDC)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            background: config.color,
            color: config.ink,
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
        >
          <Icon size={13} />
        </span>
        <p
          className="text-[10px] tracking-[0.18em] text-[var(--ed-ink,#111)] flex-1 truncate"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
        >
          {promptText.toUpperCase()}
        </p>
      </div>

      {/* Item input + cover preview */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              value={item}
              onChange={(e) => handleItemChange(e.target.value)}
              placeholder={config.placeholder}
              className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
            />
          </div>
          {(imageUrl || enriching) && (
            <div
              className="w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{
                background: 'var(--ed-paper, #FFFBF1)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              {enriching ? (
                <Loader2 size={14} className="animate-spin text-[var(--ed-muted,#6F6B61)]" />
              ) : imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
          )}
        </div>
        {/* Search suggestions dropdown */}
        {item.length >= 2 && (searchResults.length > 0 || enriching || searchAttempted) && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-20 max-h-[360px] overflow-y-auto overscroll-contain"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            {/* Loading skeleton */}
            {enriching && searchResults.length === 0 && (
              <div className="p-2 space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 min-h-[44px]">
                    {category === 'books' ? (
                      <div className="w-10 h-[60px] bg-[var(--ed-cream,#F3ECDC)] animate-pulse flex-shrink-0" style={{ border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                    ) : (
                      <div className="w-8 h-8 bg-[var(--ed-cream,#F3ECDC)] animate-pulse flex-shrink-0" style={{ border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                    )}
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[var(--ed-cream,#F3ECDC)] animate-pulse w-3/4" />
                      <div className="h-2.5 bg-[var(--ed-cream,#F3ECDC)] animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!enriching && searchAttempted && searchResults.length === 0 && (
              <div
                className="px-4 py-6 text-center text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                NO MATCHES — TRY A DIFFERENT SEARCH
              </div>
            )}

            {/* Results */}
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => {
                  setItem(result.name.split(' — ')[0].split(' (')[0])
                  if (result.artist && category === 'books' && !person) setPerson('')
                  if (result.year && !year) setYear(result.year)
                  if (result.imageUrl) setImageUrl(result.imageUrl)
                  if (result.previewUrl) setPreviewUrl(result.previewUrl)
                  if (result.externalUrl) setExternalUrl(result.externalUrl)
                  setSearchResults([])
                  setSearchAttempted(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--ed-cream,#F3ECDC)] transition-colors text-sm min-h-[44px]"
                style={{ borderBottom: '1.5px solid var(--ed-ink, #111)' }}
              >
                {category === 'books' ? (
                  <>
                    {result.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={result.imageUrl}
                        alt=""
                        className="w-10 h-[60px] object-cover flex-shrink-0"
                        style={{ border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    ) : (
                      <div
                        className="w-10 h-[60px] flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--ed-yellow, #F2C84B)', border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      >
                        <BookOpen size={16} className="text-[var(--ed-ink,#111)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[var(--ed-ink,#111)] truncate"
                        style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: 13 }}
                      >
                        {result.name.toUpperCase()}
                      </div>
                      <div
                        className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] truncate mt-0.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        {result.artist?.toUpperCase()}{result.year ? ` · ${result.year}` : ''}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {result.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={result.imageUrl}
                        alt=""
                        className="w-8 h-8 object-cover flex-shrink-0"
                        style={{ border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    )}
                    <span className="text-[var(--ed-ink,#111)] truncate text-sm">{result.name}</span>
                  </>
                )}
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
        className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input resize-none flex-1 min-h-[60px]"
      />

      {/* Optional fields row */}
      <div className="flex gap-2">
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year"
          className="w-20 px-2 py-2 text-xs text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
        />
        {/* Who introduced you — with contact suggestions */}
        <div className="flex-1 relative">
          <input
            value={person}
            onChange={(e) => { setPerson(e.target.value); setShowPersonSuggestions(true) }}
            onFocus={() => setShowPersonSuggestions(true)}
            onBlur={() => setTimeout(() => setShowPersonSuggestions(false), 200)}
            placeholder="Who introduced you?"
            className="w-full px-2 py-2 text-xs text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
          />
          {showPersonSuggestions && contacts.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 z-20 max-h-[200px] overflow-y-auto"
              style={{
                background: 'var(--ed-paper, #FFFBF1)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              {contacts
                .filter(c => !person || c.full_name.toLowerCase().includes(person.toLowerCase()))
                .map(c => (
                  <button
                    key={c.id}
                    onMouseDown={(e) => { e.preventDefault(); setPerson(c.full_name); setShowPersonSuggestions(false) }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--ed-ink,#111)] hover:bg-[var(--ed-cream,#F3ECDC)] transition-colors"
                    style={{ borderBottom: '1.5px solid var(--ed-ink, #111)' }}
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
        <span
          className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mr-2"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
        >
          RATING
        </span>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => setRating(rating === i ? 0 : i)} className="p-0.5">
            <Star
              size={18}
              className={i <= rating ? 'text-[var(--ed-red,#E23B2E)]' : 'text-[var(--ed-muted,#6F6B61)]/30'}
              fill={i <= rating ? 'var(--ed-red, #E23B2E)' : 'none'}
            />
          </button>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!item.trim() || saving}
        className="w-full py-3 text-[10px] tracking-[0.18em] flex items-center justify-center gap-2 disabled:opacity-50 transition-transform hover:-translate-y-0.5 active:translate-y-0"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 700,
          background: 'var(--ed-red, #E23B2E)',
          color: '#fff',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} strokeWidth={3} /> SAVE</>}
      </button>
    </div>
  )
}
