'use client'

import { RefreshCw, Image, FileText, UserPlus, Mic } from 'lucide-react'

interface QuickActionsProps {
  onShuffle: () => void
  onPhotoUpload: () => void
  onPostscript: () => void
  onAddContact: () => void
  onQuickMemory: () => void
}

export function QuickActions({
  onShuffle,
  onPhotoUpload,
  onPostscript,
  onAddContact,
  onQuickMemory,
}: QuickActionsProps) {
  return (
    <div className="quick-actions">
      <button onClick={onShuffle} className="quick-action-btn">
        <div className="quick-action-icon"><RefreshCw size={18} /></div>
        <span>Shuffle</span>
      </button>
      <button onClick={onPhotoUpload} className="quick-action-btn">
        <div className="quick-action-icon"><Image size={18} /></div>
        <span>Add Photos</span>
      </button>
      <button onClick={onPostscript} className="quick-action-btn">
        <div className="quick-action-icon"><FileText size={18} /></div>
        <span>PostScript</span>
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
