'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, RefreshCw, Check } from 'lucide-react'

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
  { title: 'Progress Bar Labels', prefix: 'globe.progress', icon: '📊' },
  { title: 'Shared Buttons', prefix: 'globe.button', icon: '🔘' },
]

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
