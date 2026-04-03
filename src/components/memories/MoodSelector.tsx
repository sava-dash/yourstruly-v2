'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Check } from 'lucide-react'
import { MOOD_DEFINITIONS, MoodType } from '@/lib/ai/moodAnalysis'

interface MoodSelectorProps {
  memoryId: string
  currentMood: MoodType | null
  isOverride: boolean
  onMoodChange?: (mood: MoodType) => void
  compact?: boolean
}

// All available moods grouped by category
const POSITIVE_MOODS: MoodType[] = ['joyful', 'proud', 'grateful', 'peaceful', 'nostalgic', 'loving', 'hopeful', 'playful']
const REFLECTIVE_MOODS: MoodType[] = ['bittersweet', 'melancholy', 'reflective', 'longing', 'solemn']
const ALL_MOODS: MoodType[] = [...POSITIVE_MOODS, ...REFLECTIVE_MOODS]

export default function MoodSelector({
  memoryId,
  currentMood,
  isOverride,
  onMoodChange,
  compact = false
}: MoodSelectorProps) {
  const [mood, setMood] = useState<MoodType | null>(currentMood)
  const [isManualOverride, setIsManualOverride] = useState(isOverride)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const updateMood = async (newMood: MoodType) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/memories/${memoryId}/mood`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: newMood })
      })

      if (res.ok) {
        setMood(newMood)
        setIsManualOverride(true)
        onMoodChange?.(newMood)
      }
    } catch (error) {
      console.error('Failed to update mood:', error)
    } finally {
      setSaving(false)
      setShowPicker(false)
    }
  }

  const resetToAI = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/memories/${memoryId}/mood`, {
        method: 'DELETE'
      })

      if (res.ok) {
        const data = await res.json()
        setMood(data.mood)
        setIsManualOverride(false)
        onMoodChange?.(data.mood)
      }
    } catch (error) {
      console.error('Failed to reset mood:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentDef = mood ? MOOD_DEFINITIONS[mood] : null

  if (compact) {
    // Compact view: just the mood chip with click-to-change
    return (
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={saving}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition-all hover:opacity-80"
          style={{
            backgroundColor: currentDef ? `${currentDef.color}15` : '#f3f4f6',
            color: currentDef?.color || '#6b7280'
          }}
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <span>{currentDef?.label || 'Add mood'}</span>
          )}
        </button>

        {/* Dropdown picker */}
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[160px] max-h-[300px] overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Positive</div>
              {POSITIVE_MOODS.map((m) => {
                const def = MOOD_DEFINITIONS[m]
                const isSelected = mood === m

                return (
                  <button
                    key={m}
                    onClick={() => updateMood(m)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: def.color }}
                    />
                    <span className="flex-1" style={{ color: isSelected ? def.color : '#374151' }}>
                      {def.label}
                    </span>
                    {isSelected && <Check size={14} className="text-green-500" />}
                  </button>
                )
              })}
              
              <div className="px-3 py-1 mt-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-2">Reflective</div>
              {REFLECTIVE_MOODS.map((m) => {
                const def = MOOD_DEFINITIONS[m]
                const isSelected = mood === m

                return (
                  <button
                    key={m}
                    onClick={() => updateMood(m)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: def.color }}
                    />
                    <span className="flex-1" style={{ color: isSelected ? def.color : '#374151' }}>
                      {def.label}
                    </span>
                    {isSelected && <Check size={14} className="text-green-500" />}
                  </button>
                )
              })}

              {isManualOverride && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={resetToAI}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                  >
                    <Sparkles size={14} />
                    <span>Reset to AI suggestion</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // Full view - muted style, only selected mood shows color
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[#2d2d2d]">Mood</h4>
        {isManualOverride && (
          <button
            onClick={resetToAI}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-[#2D5A3D]/60 hover:text-[#2D5A3D] transition-colors"
          >
            <Sparkles size={12} />
            Reset to AI
          </button>
        )}
      </div>

      {/* Show selected mood prominently, or picker if none */}
      {mood ? (
        <div className="space-y-3">
          {/* Selected mood chip */}
          <button 
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: `${currentDef?.color}15`,
              color: currentDef?.color,
              border: `1px solid ${currentDef?.color}30`
            }}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: currentDef?.color }}
            />
            <span>{currentDef?.label}</span>
            {saving && <RefreshCw size={12} className="animate-spin ml-1" />}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <span>Add mood</span>
        </button>
      )}

      {/* Mood picker - grouped by category */}
      {showPicker && (
        <div className="space-y-3 pt-2">
          {/* Positive moods */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Positive</p>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_MOODS.map((m) => {
                const def = MOOD_DEFINITIONS[m]
                const isSelected = mood === m

                return (
                  <button
                    key={m}
                    onClick={() => updateMood(m)}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? ''
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${def.color}15`,
                      color: def.color,
                      borderColor: `${def.color}40`
                    } : undefined}
                  >
                    <div 
                      className={`w-2 h-2 rounded-full ${isSelected ? '' : 'opacity-40'}`}
                      style={{ backgroundColor: def.color }}
                    />
                    <span>{def.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Reflective moods */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Reflective</p>
            <div className="flex flex-wrap gap-2">
              {REFLECTIVE_MOODS.map((m) => {
                const def = MOOD_DEFINITIONS[m]
                const isSelected = mood === m

                return (
                  <button
                    key={m}
                    onClick={() => updateMood(m)}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? ''
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${def.color}15`,
                      color: def.color,
                      borderColor: `${def.color}40`
                    } : undefined}
                  >
                    <div 
                      className={`w-2 h-2 rounded-full ${isSelected ? '' : 'opacity-40'}`}
                      style={{ backgroundColor: def.color }}
                    />
                    <span>{def.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Current mood description */}
      {currentDef && !showPicker && (
        <p className="text-xs text-gray-500 italic">
          {isManualOverride ? 'Manually set' : 'AI suggested'}: {currentDef.description}
        </p>
      )}
    </div>
  )
}
