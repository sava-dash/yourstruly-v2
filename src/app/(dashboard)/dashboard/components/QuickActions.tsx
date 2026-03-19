'use client'

import { Image, UserPlus, Mic } from 'lucide-react'

interface QuickActionsProps {
  onPhotoUpload: () => void
  onAddContact: () => void
  onQuickMemory: () => void
}

export function QuickActions({
  onPhotoUpload,
  onAddContact,
  onQuickMemory,
}: QuickActionsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '8px',
      width: '100%',
    }}>
      <button onClick={onPhotoUpload} className="quick-action-btn">
        <div className="quick-action-icon"><Image size={18} /></div>
        <span>Add Photos</span>
      </button>
      <button onClick={onAddContact} className="quick-action-btn">
        <div className="quick-action-icon"><UserPlus size={18} /></div>
        <span>Add Contact</span>
      </button>
      <button onClick={onQuickMemory} className="quick-action-btn">
        <div className="quick-action-icon"><Mic size={18} /></div>
        <span>Quick Memory</span>
      </button>
    </div>
  )
}
