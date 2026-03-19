'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, ChevronDown, ChevronUp, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DEFAULT_CONFIG, type GamificationConfig, type XpLevelConfig, type BadgeConfig, type ChallengeTemplate } from '@/lib/gamification-config'

export default function GamificationAdminPage() {
  const [config, setConfig] = useState<GamificationConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('xpLevels')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/gamification')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch {}
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/gamification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      }
    } catch (err) {
      setError('Failed to save. Make sure the site_config table exists.')
    }
    setSaving(false)
  }

  const handleReset = () => {
    if (confirm('Reset all gamification wording to defaults?')) {
      setConfig(DEFAULT_CONFIG)
    }
  }

  const updateXpLevel = (index: number, field: keyof XpLevelConfig, value: any) => {
    const updated = [...config.xpLevels]
    updated[index] = { ...updated[index], [field]: field === 'minXp' || field === 'level' ? Number(value) : value }
    setConfig({ ...config, xpLevels: updated })
  }

  const updateBadge = (index: number, field: keyof BadgeConfig, value: string) => {
    const updated = [...config.badges]
    updated[index] = { ...updated[index], [field]: value }
    setConfig({ ...config, badges: updated })
  }

  const updateChallenge = (index: number, field: keyof ChallengeTemplate, value: any) => {
    const updated = [...config.challengeTemplates]
    if (field === 'targets') {
      updated[index] = { ...updated[index], targets: value.split(',').map((n: string) => Number(n.trim())).filter((n: number) => n > 0) }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setConfig({ ...config, challengeTemplates: updated })
  }

  const updateStreakMessage = (key: string, value: string) => {
    setConfig({ ...config, streakMessages: { ...config.streakMessages, [key]: value } })
  }

  const SectionHeader = ({ id, title, count }: { id: string, title: string, count: number }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? '' : id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: '12px',
        cursor: 'pointer',
        marginBottom: activeSection === id ? '0' : '8px',
        borderBottomLeftRadius: activeSection === id ? 0 : '12px',
        borderBottomRightRadius: activeSection === id ? 0 : '12px',
      }}
    >
      <span style={{ fontSize: '15px', fontWeight: '700', color: '#333' }}>{title} ({count})</span>
      {activeSection === id ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
    </button>
  )

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    background: '#fff',
  } as const

  const labelStyle = {
    fontSize: '10px',
    fontWeight: '700' as const,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '4px',
    display: 'block',
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/dashboard" style={{ color: '#888' }}><ArrowLeft size={20} /></Link>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>🎮 Gamification Settings</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Edit all wording for badges, challenges, XP levels & more</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleReset} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: saved ? '#406A56' : '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* XP Levels */}
      <SectionHeader id="xpLevels" title="⚡ XP Levels" count={config.xpLevels.length} />
      {activeSection === 'xpLevels' && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {config.xpLevels.map((lvl, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: '0 0 50px' }}>
                  <label style={labelStyle}>Emoji</label>
                  <input value={lvl.emoji} onChange={e => updateXpLevel(i, 'emoji', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Title</label>
                  <input value={lvl.title} onChange={e => updateXpLevel(i, 'title', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '0 0 80px' }}>
                  <label style={labelStyle}>Min XP</label>
                  <input type="number" value={lvl.minXp} onChange={e => updateXpLevel(i, 'minXp', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Level-up Message</label>
                <input value={lvl.message} onChange={e => updateXpLevel(i, 'message', e.target.value)} style={inputStyle} placeholder="Message shown when user reaches this level" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      <SectionHeader id="badges" title="🏆 Badges" count={config.badges.length} />
      {activeSection === 'badges' && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {config.badges.map((badge, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: '0 0 50px' }}>
                  <label style={labelStyle}>Emoji</label>
                  <input value={badge.emoji} onChange={e => updateBadge(i, 'emoji', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name</label>
                  <input value={badge.name} onChange={e => updateBadge(i, 'name', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={labelStyle}>Type</label>
                  <input value={badge.type} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#888' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description (shown when locked)</label>
                <input value={badge.description} onChange={e => updateBadge(i, 'description', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Congrats Message (shown when earned)</label>
                <input value={badge.congratsMessage} onChange={e => updateBadge(i, 'congratsMessage', e.target.value)} style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Challenges */}
      <SectionHeader id="challenges" title="🎯 Weekly Challenges" count={config.challengeTemplates.length} />
      {activeSection === 'challenges' && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {config.challengeTemplates.map((ch, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: '0 0 50px' }}>
                  <label style={labelStyle}>Emoji</label>
                  <input value={ch.emoji} onChange={e => updateChallenge(i, 'emoji', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Label (use &#123;n&#125; for count)</label>
                  <input value={ch.label} onChange={e => updateChallenge(i, 'label', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={labelStyle}>Targets</label>
                  <input value={ch.targets.join(', ')} onChange={e => updateChallenge(i, 'targets', e.target.value)} style={inputStyle} placeholder="2, 3, 5" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description (why this matters)</label>
                <input value={ch.description} onChange={e => updateChallenge(i, 'description', e.target.value)} style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streak Messages */}
      <SectionHeader id="streaks" title="🔥 Streak Messages" count={Object.keys(config.streakMessages).length} />
      {activeSection === 'streaks' && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(config.streakMessages).map(([days, msg]) => (
            <div key={days} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: '0 0 60px', fontSize: '13px', fontWeight: '700', color: '#C35F33', textAlign: 'center' }}>
                {days} days
              </div>
              <input value={msg} onChange={e => updateStreakMessage(days, e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#f8f8f4', borderRadius: '12px', border: '1px solid #e8e8e0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px', color: '#666' }}>Preview</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {config.xpLevels.map(lvl => (
            <div key={lvl.level} style={{ padding: '6px 12px', background: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #eee' }}>
              {lvl.emoji} <strong>{lvl.title}</strong> <span style={{ color: '#888' }}>({lvl.minXp}+ XP)</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {config.badges.map(b => (
            <div key={b.type} style={{ padding: '4px 8px', background: '#fff', borderRadius: '6px', fontSize: '11px', border: '1px solid #eee' }}>
              {b.emoji} {b.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
