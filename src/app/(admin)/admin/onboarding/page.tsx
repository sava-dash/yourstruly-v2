'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, RefreshCw, Check, Plus } from 'lucide-react'

interface CopyItem {
  id: string
  value: string
  description: string | null
  updated_at: string
}

// Group keys by section for organized display
const SECTIONS: { title: string; prefix: string; icon: string }[] = [
  { title: 'Welcome Card', prefix: 'globe.welcome', icon: '🌍' },
  { title: 'Places Lived', prefix: 'globe.places', icon: '📍' },
  { title: 'Adventure Message', prefix: 'globe.adventure', icon: '✨' },
  { title: 'Contacts / People', prefix: 'globe.contacts', icon: '👨‍👩‍👧‍👦' },
  { title: 'Interests', prefix: 'globe.interests', icon: '💡' },
  { title: 'Why Are You Here', prefix: 'globe.whyhere', icon: '💭' },
  { title: 'Photo Upload', prefix: 'globe.photos', icon: '📸' },
  { title: 'Photo Map', prefix: 'globe.photomap', icon: '🗺️' },
  { title: "Let's Go Transition", prefix: 'globe.letsgo', icon: '🚀' },
  { title: 'Heartfelt Question', prefix: 'globe.heartfelt', icon: '💜' },
  { title: 'Ready / Complete', prefix: 'globe.ready', icon: '🎉' },
  { title: 'Progress Bar Labels', prefix: 'globe.progress', icon: '📊' },
  { title: 'Shared Buttons', prefix: 'globe.button', icon: '🔘' },
]

// Default copy values — same as useOnboardingCopy defaults
const COPY_DEFAULTS: Record<string, { value: string; description: string | null }> = {
  'globe.welcome.greeting': { value: 'Hi {name} 👋', description: 'Greeting with {name} placeholder' },
  'globe.welcome.headline': { value: 'We look forward to hearing more about this adventure.', description: null },
  'globe.welcome.button': { value: "Let's begin", description: null },
  'globe.places.title_first': { value: 'Have you lived anywhere else?', description: 'First prompt' },
  'globe.places.title_more': { value: 'Anywhere else?', description: 'After adding first place' },
  'globe.places.greeting': { value: 'Your life journey 🌍', description: null },
  'globe.places.input_placeholder': { value: 'City or town name...', description: null },
  'globe.places.when_placeholder': { value: 'When did you move there? (e.g. Summer 2015)', description: null },
  'globe.places.button_first': { value: 'Add Place', description: null },
  'globe.places.button_more': { value: 'Add Another', description: null },
  'globe.places.done': { value: "I'm done", description: null },
  'globe.places.skip': { value: 'Skip', description: null },
  'globe.adventure.greeting': { value: 'What a journey ✨', description: null },
  'globe.adventure.headline': { value: "You've lived in so many amazing places, I can't wait to hear more about your adventures.", description: null },
  'globe.adventure.button': { value: 'Continue', description: null },
  'globe.contacts.greeting': { value: 'Your people 👨‍👩‍👧‍👦', description: null },
  'globe.contacts.headline': { value: 'Who are the important people in your life?', description: null },
  'globe.contacts.panel_title': { value: 'Family, Friends & Loved Ones', description: null },
  'globe.contacts.panel_subtitle': { value: 'Add the people who matter most', description: null },
  'globe.contacts.name_placeholder': { value: 'Name', description: null },
  'globe.contacts.relation_placeholder': { value: 'Relationship...', description: null },
  'globe.contacts.add_button': { value: '+ Add Person', description: null },
  'globe.interests.greeting': { value: 'Your interests 💡', description: null },
  'globe.interests.headline': { value: 'What are you into?', description: null },
  'globe.interests.panel_title': { value: 'Your Interests', description: null },
  'globe.interests.panel_subtitle': { value: "Pick what you're into", description: null },
  'globe.interests.custom_placeholder': { value: 'Add your own...', description: null },
  'globe.whyhere.panel_title': { value: 'Why are you here? 💭', description: null },
  'globe.whyhere.panel_subtitle': { value: 'What brought you to YoursTruly? What do you hope to preserve?', description: null },
  'globe.whyhere.placeholder': { value: "I'm here because...", description: null },
  'globe.photos.panel_title': { value: '📸 Your Photos', description: null },
  'globe.photos.panel_subtitle': { value: "Upload your favorite photos. We'll place geotagged ones on the globe to map your memories around the world.", description: null },
  'globe.photos.dropzone_text': { value: 'Drop photos here or click to browse', description: null },
  'globe.photos.dropzone_add': { value: 'Add more photos', description: null },
  'globe.photos.dropzone_hint': { value: 'JPG, PNG up to 20MB each', description: null },
  'globe.photos.button_upload': { value: 'Upload & Continue', description: null },
  'globe.photos.button_skip': { value: 'Skip', description: null },
  'globe.photos.uploading': { value: 'Uploading...', description: null },
  'globe.photomap.greeting': { value: 'Your memories around the world 🌍', description: null },
  'globe.photomap.count': { value: '{count} photo{plural} placed on your map.', description: 'Use {count} and {plural} (s)' },
  'globe.photomap.missing': { value: '{count} without location — you can add those later.', description: 'Photos without GPS' },
  'globe.letsgo.greeting': { value: "Let's bring this to life.", description: null },
  'globe.letsgo.headline': { value: "You've set your focus. Now see how easy it is to start capturing what matters.", description: null },
  'globe.letsgo.button': { value: 'Start', description: null },
  'globe.heartfelt.title': { value: "Let's Go Deeper", description: null },
  'globe.heartfelt.subtitle': { value: "Share what's on your mind. We'll capture the moments that matter", description: null },
  'globe.ready.title': { value: "You're all set!", description: null },
  'globe.ready.subtitle': { value: 'Your story is waiting to be told.', description: null },
  'globe.ready.button': { value: 'Go to Dashboard', description: null },
  'globe.progress.map': { value: 'Map', description: 'Progress bar label' },
  'globe.progress.places': { value: 'Places', description: 'Progress bar label' },
  'globe.progress.contacts': { value: 'People', description: 'Progress bar label' },
  'globe.progress.interests': { value: 'Interests', description: 'Progress bar label' },
  'globe.progress.whyhere': { value: 'Why', description: 'Progress bar label' },
  'globe.progress.photos': { value: 'Photos', description: 'Progress bar label' },
  'globe.progress.heartfelt': { value: 'Reflect', description: 'Progress bar label' },
  'globe.progress.ready': { value: 'Done', description: 'Progress bar label' },
  'globe.button.continue': { value: 'Continue', description: 'Shared continue button' },
  'globe.button.skip': { value: 'Skip', description: 'Shared skip button' },
}

export default function OnboardingAdminPage() {
  const [items, setItems] = useState<CopyItem[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCopy = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('onboarding_copy')
      .select('*')
      .order('id')
    if (!error && data) {
      setItems(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCopy() }, [fetchCopy])

  const handleSave = async (id: string) => {
    const newValue = edited[id]
    if (newValue === undefined) return

    setSaving(prev => ({ ...prev, [id]: true }))
    const { error } = await supabase
      .from('onboarding_copy')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('id', id)

    setSaving(prev => ({ ...prev, [id]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [id]: true }))
      setItems(prev => prev.map(item => item.id === id ? { ...item, value: newValue } : item))
      setEdited(prev => { const n = { ...prev }; delete n[id]; return n })
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000)
    }
  }

  const handleSaveAll = async () => {
    const keys = Object.keys(edited)
    for (const key of keys) {
      await handleSave(key)
    }
  }

  const [seeding, setSeeding] = useState(false)
  const seedMissing = async () => {
    setSeeding(true)
    const existingIds = new Set(items.map(i => i.id))
    const missing = Object.entries(COPY_DEFAULTS).filter(([id]) => !existingIds.has(id))

    if (missing.length === 0) {
      setSeeding(false)
      return
    }

    const rows = missing.map(([id, def]) => ({
      id,
      value: def.value,
      description: def.description,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('onboarding_copy').insert(rows)
    if (!error) {
      await fetchCopy()
    }
    setSeeding(false)
  }

  const missingCount = Object.keys(COPY_DEFAULTS).filter(id => !items.some(i => i.id === id)).length

  const getItemsByPrefix = (prefix: string) =>
    items.filter(item => item.id.startsWith(prefix))

  const hasEdits = Object.keys(edited).length > 0

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        Loading onboarding copy...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2d2d2d', margin: 0 }}>
            Onboarding Copy
          </h1>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
            Edit text shown during the onboarding flow. Changes are live immediately.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {missingCount > 0 && (
            <button
              onClick={seedMissing}
              disabled={seeding}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '12px',
                border: '1px solid #406A56', background: 'rgba(64,106,86,0.08)',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#406A56',
                opacity: seeding ? 0.6 : 1,
              }}
            >
              <Plus size={16} /> {seeding ? 'Seeding...' : `Seed ${missingCount} missing keys`}
            </button>
          )}
          <button
            onClick={fetchCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '12px',
              border: '1px solid #ddd', background: 'white',
              cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {hasEdits && (
            <button
              onClick={handleSaveAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '12px',
                border: 'none', background: '#406A56', color: 'white',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              }}
            >
              <Save size={16} /> Save All ({Object.keys(edited).length})
            </button>
          )}
        </div>
      </div>

      {SECTIONS.map(section => {
        const sectionItems = getItemsByPrefix(section.prefix)
        if (sectionItems.length === 0) return null

        return (
          <div key={section.prefix} style={{
            marginBottom: '28px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              background: 'rgba(0,0,0,0.02)',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
                {section.icon} {section.title}
              </h2>
            </div>

            {sectionItems.map(item => {
              const currentValue = edited[item.id] !== undefined ? edited[item.id] : item.value
              const isEdited = edited[item.id] !== undefined
              const isSaving = saving[item.id]
              const isSaved = saved[item.id]
              const shortKey = item.id.replace(section.prefix + '.', '')

              return (
                <div key={item.id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <code style={{
                        fontSize: '12px', padding: '2px 8px', borderRadius: '6px',
                        background: 'rgba(64,106,86,0.08)', color: '#406A56', fontWeight: 500,
                      }}>
                        {shortKey}
                      </code>
                      {item.description && (
                        <span style={{ fontSize: '12px', color: '#999' }}>{item.description}</span>
                      )}
                    </div>
                    {currentValue.length > 80 ? (
                      <textarea
                        value={currentValue}
                        onChange={(e) => setEdited(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={3}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '10px',
                          border: `1.5px solid ${isEdited ? '#406A56' : 'rgba(0,0,0,0.1)'}`,
                          background: isEdited ? 'rgba(64,106,86,0.03)' : 'rgba(0,0,0,0.02)',
                          fontSize: '14px', color: '#2d2d2d', outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => setEdited(prev => ({ ...prev, [item.id]: e.target.value }))}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '10px',
                          border: `1.5px solid ${isEdited ? '#406A56' : 'rgba(0,0,0,0.1)'}`,
                          background: isEdited ? 'rgba(64,106,86,0.03)' : 'rgba(0,0,0,0.02)',
                          fontSize: '14px', color: '#2d2d2d', outline: 'none',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flexShrink: 0, paddingTop: '24px' }}>
                    {isSaved ? (
                      <Check size={20} color="#406A56" />
                    ) : isEdited ? (
                      <button
                        onClick={() => handleSave(item.id)}
                        disabled={isSaving}
                        style={{
                          padding: '6px 12px', borderRadius: '8px',
                          border: 'none', background: '#406A56', color: 'white',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          opacity: isSaving ? 0.5 : 1,
                        }}
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
