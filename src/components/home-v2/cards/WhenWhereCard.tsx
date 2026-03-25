'use client'

import { useState, useRef, useCallback } from 'react'
import { MapPin, Calendar, Check, Loader2 } from 'lucide-react'

interface WhenWhereCardProps {
  data: { location?: string; date?: string }
  onSave: (data: { location: string; date: string }) => void
  saved: boolean
}

export function WhenWhereCard({ data, onSave, saved }: WhenWhereCardProps) {
  const [location, setLocation] = useState(data.location || '')
  const [date, setDate] = useState(data.date || '')
  const [suggestions, setSuggestions] = useState<{ place_name: string; id: string }[]>([])
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address,place,locality,region&limit=4`
      )
      const data = await res.json()
      if (data.features) {
        setSuggestions(data.features.map((f: any) => ({ place_name: f.place_name, id: f.id })))
      }
    } catch {}
  }, [])

  const handleLocationChange = (val: string) => {
    setLocation(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleSave = async () => {
    if (!location.trim() && !date.trim()) return
    setSaving(true)
    await onSave({ location: location.trim(), date: date.trim() })
    setSaving(false)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70 flex items-center gap-1.5">
        <MapPin size={12} /> When & Where
      </h3>

      <div className="relative flex-1 flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            value={location}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder="City, place, or address..."
            className="w-full px-3 py-2.5 bg-white/5 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 focus:border-[#D9C61A]/50 placeholder-white/30"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2a] rounded-xl shadow-lg border border-white/10 z-20 overflow-hidden">
              {suggestions.map(s => (
                <button key={s.id} onClick={() => { setLocation(s.place_name); setSuggestions([]) }} className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2">
                  <MapPin size={12} className="text-white/40 flex-shrink-0" />{s.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g. Summer 2019, March 2020..."
            className="w-full px-3 py-2.5 bg-white/5 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 focus:border-[#D9C61A]/50 placeholder-white/30"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={(!location.trim() && !date.trim()) || saving || saved}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-[#406A56] text-white hover:bg-[#4a7a64] disabled:opacity-40'
        }`}
      >
        {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
      </button>
    </div>
  )
}
