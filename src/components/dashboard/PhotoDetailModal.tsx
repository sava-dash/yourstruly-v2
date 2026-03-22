'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Calendar, Plus, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PhotoDetailModalProps {
  photoId: string
  photoUrl: string
  memoryId?: string
  initialDate?: string
  initialLocation?: string
  onClose: () => void
  onSaved?: () => void
}

export default function PhotoDetailModal({
  photoId,
  photoUrl,
  memoryId,
  initialDate,
  initialLocation,
  onClose,
  onSaved,
}: PhotoDetailModalProps) {
  const [date, setDate] = useState(initialDate || '')
  const [location, setLocation] = useState(initialLocation || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryDescription, setMemoryDescription] = useState('')
  const [creatingMemory, setCreatingMemory] = useState(false)
  const [memoryCreated, setMemoryCreated] = useState(false)

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
        setShowMemoryPrompt(true)
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
          title: memoryTitle || location || 'A moment captured',
          description: memoryDescription || '',
          memory_date: date || new Date().toISOString(),
          location_name: location || null,
          attach_media_id: photoId,
        }),
      })
      if (res.ok) {
        setMemoryCreated(true)
        onSaved?.()
        setTimeout(onClose, 1500)
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
            display: 'flex',
            flexDirection: 'column',
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

          {/* Photo — covers full width */}
          <div style={{
            position: 'relative',
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
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Metadata form */}
          <div style={{ padding: '24px' }}>
            {!showMemoryPrompt ? (
              <>
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

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={18} color="#406A56" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
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
                    onClick={() => setShowMemoryPrompt(true)}
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
              </>
            ) : !memoryCreated ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#2d2d2d' }}>
                  {saved && <span style={{ color: '#406A56', marginRight: 8 }}>✓ Saved!</span>}
                  Want to add a memory with this photo?
                </h3>
                <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
                  Give it a title and description to preserve the story behind this moment.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    type="text"
                    value={memoryTitle}
                    onChange={(e) => setMemoryTitle(e.target.value)}
                    placeholder="Memory title"
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontSize: 15,
                      outline: 'none',
                    }}
                  />
                  <textarea
                    value={memoryDescription}
                    onChange={(e) => setMemoryDescription(e.target.value)}
                    placeholder="What's the story behind this photo?"
                    rows={3}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontSize: 15,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={handleCreateMemory}
                    disabled={creatingMemory}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#406A56',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {creatingMemory ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create Memory
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
                    Not now
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✨</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#406A56' }}>Memory created!</h3>
                <p style={{ fontSize: 14, color: '#999', marginTop: 4 }}>Your story is growing.</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
