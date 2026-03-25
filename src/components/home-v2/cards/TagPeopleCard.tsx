'use client'

import { useState } from 'react'
import { Users, Check, Loader2 } from 'lucide-react'
import FaceTagger from '@/components/media/FaceTagger'

interface TagPeopleCardProps {
  photoUrl?: string
  photoId?: string
  data: { tagged?: boolean }
  onSave: (data: { tagged: boolean }) => void
  saved: boolean
}

export function TagPeopleCard({ photoUrl, photoId, data, onSave, saved }: TagPeopleCardProps) {
  const [saving, setSaving] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)

  const handleXpEarned = (amount: number) => {
    setXpEarned(prev => prev + amount)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ tagged: true })
    setSaving(false)
  }

  if (!photoId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-5 text-white/30">
        <Users size={32} className="mb-2" />
        <p className="text-sm">No photo to tag</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70 flex items-center gap-1.5">
          <Users size={12} /> Tag People
        </h3>
        {xpEarned > 0 && (
          <span className="text-xs text-[#C35F33]">+{xpEarned} XP</span>
        )}
      </div>

      {/* FaceTagger — the real deal */}
      <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        <FaceTagger
          mediaId={photoId}
          imageUrl={photoUrl || ''}
          onXPEarned={handleXpEarned}
        />
      </div>

      {/* Done button */}
      {!saved && (
        <div className="px-5 pb-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              'bg-[#406A56] text-white hover:bg-[#4a7a64] disabled:opacity-40'
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Done Tagging →'}
          </button>
        </div>
      )}

      {saved && (
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-sm">
            <Check size={14} /> Tags saved
          </div>
        </div>
      )}
    </div>
  )
}
