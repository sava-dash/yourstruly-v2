'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  const [editing, setEditing] = useState(!saved)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Auto-geocode pre-filled location (from concierge) to get coords for map
  useEffect(() => {
    if (location && !coords) {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) return
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${token}&types=place,locality,region,country&limit=1`)
        .then(r => r.json())
        .then(data => {
          if (data.features?.[0]?.center) {
            const [lng, lat] = data.features[0].center
            setCoords({ lat, lng })
          }
        })
        .catch(() => {})
    }
  }, []) // Only on mount — don't re-run on every location change

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
      <div className="h-full flex flex-col p-5 gap-4 cursor-pointer" onClick={() => setEditing(true)}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
            <MapPin size={12} /> When & Where
          </h3>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 text-[#2D5A3D] text-xs font-medium transition-colors"
          >
            <Pencil size={11} /> Edit Location
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
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-5">
              <p className="text-white text-2xl font-bold leading-tight">{location}</p>
              {date && <p className="text-white/80 text-base font-medium mt-1">{date}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E6F0EA] flex items-center justify-center">
              <MapPin size={20} className="text-[#3D6B52]" />
            </div>
            <div className="text-center">
              {location && <p className="text-[#1A1F1C] text-2xl font-bold leading-tight">{location}</p>}
              {date && <p className="text-[#94A09A] text-base font-medium mt-2">{date}</p>}
              {!location && !date && <p className="text-[#94A09A] text-sm">No location set</p>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 py-1 text-[#2D5A3D] text-xs">
          <Check size={12} /> Saved
        </div>
      </div>
    )
  }

  // Edit form
  return (
    <div className="h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
          <MapPin size={12} /> When & Where
        </h3>
        {saved && (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-[#94A09A] hover:text-[#5A6660] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="relative flex-1 flex flex-col gap-3">
        {/* Location */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#94A09A] mb-1.5 block">
            Where was this?
          </label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="City, place, or address..."
              className="w-full px-3 py-3 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 focus:border-[#3D6B52]/50 placeholder-[#94A09A]"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#DDE3DF] z-20 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSuggestion(s)}
                    className="w-full px-3 py-2.5 text-left text-sm text-[#1A1F1C] hover:bg-[#E6F0EA] flex items-center gap-2"
                  >
                    <MapPin size={12} className="text-[#94A09A] flex-shrink-0" />
                    {s.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#94A09A] mb-1.5 block">
            When was this roughly?
          </label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g. Summer 2019, March 2020..."
            className="w-full px-3 py-3 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 focus:border-[#3D6B52]/50 placeholder-[#94A09A]"
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

      <p className="text-center text-xs text-[#B8562E]">🎉 Earn +15 XP</p>

      <button
        onClick={handleSave}
        disabled={(!location.trim() && !date.trim()) || saving}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 active:scale-[0.96]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? 'Update →' : 'Next →'}
      </button>
    </div>
  )
}
