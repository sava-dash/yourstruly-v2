'use client'

import { useState, useCallback } from 'react'
import { Search, Music, Check, Loader2, ExternalLink, X } from 'lucide-react'

interface SongResult {
  id: string
  name: string
  artist: string
  album?: string
  albumArt?: string
  previewUrl?: string
  spotifyUrl?: string
  appleMusicUrl?: string
}

interface SongCardProps {
  data: { song?: SongResult; note?: string }
  onSave: (data: { song: SongResult; note: string }) => void
  saved: boolean
}

export function SongCard({ data, onSave, saved }: SongCardProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SongResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SongResult | null>(data.song || null)
  const [note, setNote] = useState(data.note || '')
  const [saving, setSaving] = useState(false)
  const [playingPreview, setPlayingPreview] = useState(false)

  const searchSongs = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      // Use iTunes Search API (free, no auth required, returns preview URLs)
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=6`
      )
      const data = await res.json()
      setResults((data.results || []).map((r: any) => ({
        id: String(r.trackId),
        name: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        albumArt: r.artworkUrl100?.replace('100x100', '300x300'),
        previewUrl: r.previewUrl,
        spotifyUrl: null,
        appleMusicUrl: r.trackViewUrl,
      })))
    } catch {
      setResults([])
    }
    setSearching(false)
  }, [])

  const handleSearch = (val: string) => {
    setQuery(val)
    // Debounce
    const timer = setTimeout(() => searchSongs(val), 400)
    return () => clearTimeout(timer)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await onSave({ song: selected, note: note.trim() })
    setSaving(false)
  }

  // ── Saved view: beautiful song display ──
  if (saved && data.song) {
    const song = data.song
    return (
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Album art background */}
        {song.albumArt && (
          <div className="absolute inset-0">
            <img src={song.albumArt} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(40px) brightness(0.4) saturate(1.3)' }} />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          {/* Album art */}
          {song.albumArt && (
            <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-2xl">
              <img src={song.albumArt} alt={song.album} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Song info */}
          <div>
            <p className="text-lg font-bold text-white leading-tight">{song.name}</p>
            <p className="text-sm text-white/70 mt-1">{song.artist}</p>
            {song.album && <p className="text-xs text-white/50 mt-0.5">{song.album}</p>}
          </div>

          {/* Personal note */}
          {data.note && (
            <p className="text-sm text-white/80 italic mt-2 max-w-[80%]" style={{ fontStyle: 'italic' }}>
              &ldquo;{data.note}&rdquo;
            </p>
          )}

          {/* Preview play */}
          {song.previewUrl && (
            <audio src={song.previewUrl} controls className="w-full max-w-[240px] mt-2 h-8 opacity-80" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
          )}

          {/* Link to full song */}
          {song.appleMusicUrl && (
            <a
              href={song.appleMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors mt-1"
            >
              <ExternalLink size={11} /> Listen on Apple Music
            </a>
          )}
        </div>

        {/* Music icon watermark */}
        <div className="absolute bottom-4 right-4 opacity-10">
          <Music size={60} className="text-white" />
        </div>
      </div>
    )
  }

  // ── Edit view: search & select ──
  return (
    <div className="h-full flex flex-col p-5 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
        <Music size={12} /> Add a Song
      </h3>

      {/* Selected song preview */}
      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAF7] border border-[#DDE3DF]">
          {selected.albumArt && (
            <img src={selected.albumArt} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1F1C] truncate">{selected.name}</p>
            <p className="text-xs text-[#94A09A] truncate">{selected.artist}</p>
          </div>
          <button onClick={() => setSelected(null)} className="p-1 text-[#94A09A] hover:text-[#B8562E]">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A09A]" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for a song..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]"
            />
            {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#94A09A]" />}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {results.map(song => (
              <button
                key={song.id}
                onClick={() => { setSelected(song); setResults([]) }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#E6F0EA] transition-colors text-left"
              >
                {song.albumArt && (
                  <img src={song.albumArt} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1A1F1C] font-medium truncate">{song.name}</p>
                  <p className="text-[11px] text-[#94A09A] truncate">{song.artist}</p>
                </div>
              </button>
            ))}
            {query.length > 1 && !searching && results.length === 0 && (
              <p className="text-center text-xs text-[#94A09A] py-4">No songs found</p>
            )}
            {!query && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Music size={32} className="text-[#DDE3DF] mb-3" />
                <p className="text-sm text-[#94A09A]">Search for a song that reminds you of this memory</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Personal note */}
      {selected && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why does this song matter? (optional)"
          className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none"
          rows={3}
          style={{ fontSize: '14px' }}
        />
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-all active:scale-[0.96]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save Song</>}
      </button>
    </div>
  )
}
