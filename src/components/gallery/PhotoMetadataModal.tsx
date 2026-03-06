'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, MapPin, Check, Loader2, Search } from 'lucide-react'

interface MediaItem {
  id: string
  file_url: string
  taken_at: string | null
  exif_lat: number | null
  exif_lng: number | null
  memory?: {
    title?: string
    location_name?: string
  }
}

interface LocationResult {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  media: MediaItem | null
  onClose: () => void
  onSave: (updates: { taken_at?: string; exif_lat?: number; exif_lng?: number; location_name?: string }) => Promise<void>
}

export default function PhotoMetadataModal({ media, onClose, onSave }: Props) {
  const [date, setDate] = useState(media?.taken_at?.split('T')[0] || '')
  const [time, setTime] = useState(media?.taken_at?.split('T')[1]?.slice(0, 5) || '12:00')
  const [locationQuery, setLocationQuery] = useState(media?.memory?.location_name || '')
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    media?.exif_lat && media?.exif_lng ? {
      display_name: media?.memory?.location_name || 'Saved location',
      lat: media.exif_lat.toString(),
      lon: media.exif_lng.toString()
    } : null
  )
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced location search using OpenStreetMap Nominatim (free)
  useEffect(() => {
    // Don't search if location already selected or query too short
    if (selectedLocation || locationQuery.length < 3) {
      setLocationResults([])
      setShowResults(false)
      return
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
          { headers: { 'User-Agent': 'YoursTruly/1.0' } }
        )
        const data = await res.json()
        setLocationResults(data)
        setShowResults(true)
      } catch (e) {
        console.error('Location search error:', e)
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [locationQuery, selectedLocation])

  const handleSelectLocation = (location: LocationResult) => {
    setSelectedLocation(location)
    setLocationQuery(location.display_name.split(',').slice(0, 2).join(',')) // Shortened display
    setShowResults(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: { taken_at?: string; exif_lat?: number; exif_lng?: number; location_name?: string } = {}
      
      if (date) {
        updates.taken_at = `${date}T${time || '12:00'}:00.000Z`
      }
      if (selectedLocation) {
        updates.exif_lat = parseFloat(selectedLocation.lat)
        updates.exif_lng = parseFloat(selectedLocation.lon)
        updates.location_name = locationQuery
      }
      
      await onSave(updates)
      onClose()
    } catch (e) {
      console.error('Save error:', e)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!media) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/90 backdrop-blur-[24px] border border-white/50 rounded-[20px] shadow-[0_4px_16px_rgba(195,95,51,0.06),0_20px_60px_rgba(0,0,0,0.1)] w-full max-w-md max-h-[90vh] flex flex-col"
        >
          {/* Header with photo preview */}
          <div className="relative h-40 bg-gray-100 flex-shrink-0">
            <img 
              src={media.file_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            <div className="absolute bottom-3 left-4">
              <h3 className="text-white font-semibold">Edit Photo Details</h3>
              <p className="text-white/80 text-sm">Add date and location (+10 XP)</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-5 flex-1 min-h-[320px]">
            {/* Date & Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] mb-2">
                <Calendar size={16} className="text-[#406A56]" />
                When was this taken?
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#406A56] focus:ring-2 focus:ring-[#406A56]/20 outline-none text-[#1a1a1a] font-medium"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-28 px-3 py-2.5 rounded-lg border border-gray-300 focus:border-[#406A56] focus:ring-2 focus:ring-[#406A56]/20 outline-none text-[#1a1a1a] font-medium"
                />
              </div>
            </div>

            {/* Location Search */}
            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] mb-2">
                <MapPin size={16} className="text-[#406A56]" />
                Where was this taken?
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value)
                    setSelectedLocation(null)
                  }}
                  onFocus={() => locationResults.length > 0 && setShowResults(true)}
                  aria-label="Search" placeholder="Search for a place..."
                  className="w-full px-3 py-2.5 pl-10 rounded-lg border border-gray-300 focus:border-[#406A56] focus:ring-2 focus:ring-[#406A56]/20 outline-none text-[#1a1a1a] font-medium placeholder:text-gray-400 placeholder:font-normal"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {searching ? (
                    <Loader2 size={16} className="text-gray-400 animate-spin" />
                  ) : (
                    <Search size={16} className="text-gray-400" />
                  )}
                </div>
                {selectedLocation && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check size={16} className="text-[#406A56]" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && locationResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                  {locationResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full px-3 py-2.5 text-left hover:bg-[#406A56]/10 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-[#1a1a1a] truncate">
                        {result.display_name.split(',').slice(0, 2).join(',')}
                      </p>
                      <p className="text-xs text-[#555] truncate">
                        {result.display_name.split(',').slice(2).join(',').trim()}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {selectedLocation && (
                <p className="text-xs text-[#406A56] mt-1.5 font-medium">
                  ✓ Location selected
                </p>
              )}
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex gap-3 p-5 pt-3 border-t border-gray-100 bg-white flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-[#1a1a1a] hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!date && !selectedLocation)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#406A56] text-white hover:bg-[#355a48] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  Save
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
