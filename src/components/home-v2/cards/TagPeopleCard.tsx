'use client'

import { useState } from 'react'
import { Users, Check, Loader2, UserPlus } from 'lucide-react'
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
  const [isTagging, setIsTagging] = useState(!saved) // active tagging mode

  const handleXpEarned = (amount: number) => {
    setXpEarned(prev => prev + amount)
  }

  const handleDone = async () => {
    setSaving(true)
    await onSave({ tagged: true })
    setSaving(false)
    setIsTagging(false)
  }

  if (!photoId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-5 text-[#94A09A]">
        <Users size={32} className="mb-2" />
        <p className="text-sm">No photo to tag</p>
      </div>
    )
  }

  // Always render FaceTagger to avoid remounting (which re-triggers detection)
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
          <Users size={12} /> {isTagging ? 'Tag People' : 'People Tagged'}
        </h3>
        {xpEarned > 0 && (
          <span className="text-xs text-[#B8562E]">+{xpEarned} XP</span>
        )}
      </div>

      {isTagging && (
        <p className="px-5 text-[11px] text-[#94A09A] mb-2">
          Tap on faces to tag them, or tap anywhere on the photo to add a tag.
        </p>
      )}

      {/* FaceTagger — always mounted, never remounts */}
      <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        <FaceTagger
          mediaId={photoId}
          imageUrl={photoUrl || ''}
          onXPEarned={handleXpEarned}
        />
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-4 pt-2 space-y-2">
        {isTagging ? (
          <button
            onClick={handleDone}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Done Tagging</>}
          </button>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 py-1 text-[#2D5A3D] text-sm">
              <Check size={14} /> Tags saved
            </div>
            <button
              onClick={() => setIsTagging(true)}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-[#5A6660] hover:text-[#2D5A3D] bg-[#F5F3EE] hover:bg-[#E6F0EA] transition-colors flex items-center justify-center gap-1.5"
            >
              <UserPlus size={12} /> Tag more people
            </button>
          </>
        )}
      </div>
    </div>
  )
}
