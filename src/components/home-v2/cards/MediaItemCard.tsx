'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Play } from 'lucide-react'

interface MediaItemCardProps {
  url: string
  name: string
  type: string
  addedBy?: { name: string; avatarUrl?: string }
  onRemove?: () => void
}

export function MediaItemCard({ url, name, type, addedBy, onRemove }: MediaItemCardProps) {
  const [showPreview, setShowPreview] = useState(false)
  const isVideo = type.startsWith('video/')

  return (
    <div className="h-full flex flex-col relative">
      {/* Media fill */}
      <div
        className="flex-1 bg-black rounded-t-xl overflow-hidden cursor-pointer relative"
        onClick={() => setShowPreview(true)}
      >
        {isVideo ? (
          <>
            <video src={url} preload="metadata" muted playsInline className="w-full h-full object-cover" onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1 }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <Play size={18} className="text-white ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          <Image src={url} alt={name} fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Bottom info */}
      <div className="p-2 flex items-center justify-between">
        {addedBy && (
          <span className="text-[10px] text-[#94A09A]">
            Added by {addedBy.name}
          </span>
        )}
        {onRemove && (
          <button onClick={onRemove} className="p-1 rounded-full hover:bg-[#E6F0EA] text-[#94A09A] hover:text-[#5A6660]">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Full preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowPreview(false)}>
          <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
            <X size={20} />
          </button>
          {isVideo ? (
            <video src={url} controls autoPlay className="max-w-full max-h-full" />
          ) : (
            <Image src={url} alt={name} fill className="object-contain p-4" unoptimized />
          )}
        </div>
      )}
    </div>
  )
}
