'use client'

import { useState, useRef, useCallback } from 'react'
import { MapPin, Calendar, Check, Loader2, Pencil } from 'lucide-react'

interface WhenWhereCardProps {
  data: { location?: string; date?: string; lat?: number; lng?: number }
  onSave: (data: { location: string; date: string; lat?: number; lng?: number }) => void
  saved: boolean
}

export function WhenWhereCard({ data, onSave, saved }: WhenWhereCardProps) {
  const [location, setLocation] = useState(data.location || '')
  const [date, setDate] = useState(data.date || '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    data.lat && data.lng ? { lat: data.lat, lng: data.lng } : null
  )
  const [suggestions, setSuggestions] = useState<{ place_name: string; id: string; center: [number, number] }[]>([])
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(!saved) // start in edit mode if not saved
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) return
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address,place,locality,region&limit=4`
      )
      const data = await res.json()
      if (data.features) {
        setSuggestions(data.features.map((f: any) => ({
          place_name: f.place_name, id: f.id, center: f.center,
        })))
      }
    } catch {}
  }, [])

  const handleLocationChange = (val: string) => {
    setLocation(val)
    setCoords(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const selectSuggestion = (s: { place_name: string; center: [number, number] }) => {
    setLocation(s.place_name)
    setCoords({ lat: s.center[1], lng: s.center[0] })
    setSuggestions([])
  }

  const handleSave = async () => {
    if (!location.trim() && !date.trim()) return
    setSaving(true)
    await onSave({
      location: location.trim(),
      date: date.trim(),
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    })
    setSaving(false)
    setEditing(false)
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Saved view with map + edit button
  if (saved && !editing) {
    return (
      <div className="h-full flex flex-col p-5 gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70 flex items-center gap-1.5">
            <MapPin size={12} /> When & Where
          </h3>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/50 hover:text-white/80 text-xs transition-colors"
          >
            <Pencil size={11} /> Edit
          </button>
        </div>

        {/* Map */}
        {coords && mapboxToken ? (
          <div className="flex-1 rounded-xl overflow-hidden relative">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+7FBF9B(${coords.lng},${coords.lat})/${coords.lng},${coords.lat},12,0/500x300@2x?access_token=${mapboxToken}`}
              alt={location}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium">{location}</p>
              {date && <p className="text-white/50 text-xs mt-1">{date}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#406A56]/20 flex items-center justify-center">
              <MapPin size={20} className="text-[#7FBF9B]" />
            </div>
            <div className="text-center">
              {location && <p className="text-white text-sm font-medium">{location}</p>}
              {date && <p className="text-white/50 text-xs mt-1">{date}</p>}
              {!location && !date && <p className="text-white/30 text-sm">No location set</p>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 py-1 text-emerald-400 text-xs">
          <Check size={12} /> Saved
        </div>
      </div>
    )
  }

  // Edit form
  return (
    <div className="h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70 flex items-center gap-1.5">
          <MapPin size={12} /> When & Where
        </h3>
        {saved && (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="relative flex-1 flex flex-col gap-3">
        {/* Location */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
            Where was this?
          </label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="City, place, or address..."
              className="w-full px-3 py-3 bg-white/5 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 focus:border-[#D9C61A]/50 placeholder-white/30"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] rounded-xl shadow-lg border border-white/10 z-20 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSuggestion(s)}
                    className="w-full px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2"
                  >
                    <MapPin size={12} className="text-white/40 flex-shrink-0" />
                    {s.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
            When was this taken?
          </label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g. Summer 2019, March 2020..."
            className="w-full px-3 py-3 bg-white/5 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 focus:border-[#D9C61A]/50 placeholder-white/30"
          />
        </div>

        {/* Mini map preview */}
        {coords && mapboxToken && (
          <div className="rounded-xl overflow-hidden h-24 flex-shrink-0">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+7FBF9B(${coords.lng},${coords.lat})/${coords.lng},${coords.lat},10,0/400x120@2x?access_token=${mapboxToken}`}
              alt="Location preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[#C35F33]">🎉 Earn +15 XP</p>

      <button
        onClick={handleSave}
        disabled={(!location.trim() && !date.trim()) || saving}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-[#406A56] text-white hover:bg-[#4a7a64] disabled:opacity-40"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? 'Update →' : 'Next →'}
      </button>
    </div>
  )
}
