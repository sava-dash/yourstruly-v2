'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Calendar, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PhotoDetailModalProps {
  photoId: string
  photoUrl: string
  memoryId?: string
  initialDate?: string
  initialLocation?: string
  onClose: () => void
  onSaved?: () => void
  onCreateMemory?: (memoryId: string) => void
}

export default function PhotoDetailModal({
  photoId,
  photoUrl,
  memoryId,
  initialDate,
  initialLocation,
  onClose,
  onSaved,
  onCreateMemory,
}: PhotoDetailModalProps) {
  const [date, setDate] = useState(initialDate || '')
  const [location, setLocation] = useState(initialLocation || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creatingMemory, setCreatingMemory] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ place_name: string }>>([])
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Location autocomplete via Mapbox
  const handleLocationChange = (value: string) => {
    setLocation(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) {
      setLocationSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!token) return
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&limit=5&types=place,locality,neighborhood`
        )
        if (res.ok) {
          const data = await res.json()
          setLocationSuggestions(data.features?.map((f: any) => ({ place_name: f.place_name })) || [])
        }
      } catch {}
    }, 300)
  }

  const handleSaveMetadata = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/media/${photoId}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taken_at: date || null,
          location_name: location || null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        onSaved?.()
      }
    } catch (err) {
      console.error('Failed to save metadata:', err)
    }
    setSaving(false)
  }

  const handleCreateMemory = async () => {
    setCreatingMemory(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: location || 'A moment captured',
          description: '',
          memory_date: date || new Date().toISOString(),
          location_name: location || null,
          attach_media_id: photoId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved?.()
        onClose()
        // Open the memory in FeedDetailModal
        if (data.memory?.id && onCreateMemory) {
          onCreateMemory(data.memory.id)
        }
      }
    } catch (err) {
      console.error('Failed to create memory:', err)
    }
    setCreatingMemory(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <X size={18} />
          </button>

          {/* Photo */}
          <div style={{
            width: '100%',
            height: '45vh',
            minHeight: '280px',
            overflow: 'hidden',
            borderRadius: '24px 24px 0 0',
            background: '#1a1a1a',
          }}>
            <img
              src={photoUrl}
              alt="Photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Metadata form */}
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#2d2d2d' }}>
              When and where was this taken?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={18} color="#406A56" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <MapPin size={18} color="#406A56" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="Location (e.g. Brooklyn, NY)"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
                {/* Location suggestions dropdown */}
                {locationSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 28,
                    right: 0,
                    marginTop: 4,
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    zIndex: 30,
                    overflow: 'hidden',
                  }}>
                    {locationSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setLocation(s.place_name)
                          setLocationSuggestions([])
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          fontSize: 14,
                          color: '#2d2d2d',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(64,106,86,0.06)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                      >
                        <MapPin size={14} color="#406A56" />
                        {s.place_name}
                      </button>
                    ))}
                  </div>
                )}
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={handleSaveMetadata}
                disabled={saving || (!date && !location)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: (date || location) ? '#406A56' : 'rgba(0,0,0,0.08)',
                  color: (date || location) ? '#fff' : '#999',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: (date || location) ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Details
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent',
                  color: '#666',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>

            {/* After saving — prompt to create memory */}
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16,
                  padding: '16px',
                  borderRadius: 16,
                  background: 'rgba(64,106,86,0.06)',
                  border: '1px solid rgba(64,106,86,0.15)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: '#2d2d2d', marginBottom: 4 }}>
                  ✓ Details saved!
                </p>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                  Want to turn this into a full memory?
                </p>
                <button
                  onClick={handleCreateMemory}
                  disabled={creatingMemory}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#C35F33',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {creatingMemory ? <Loader2 size={14} className="animate-spin" /> : '+ Add to Memory'}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
