'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Play, Users } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy-load FaceTagger so it doesn't bloat the initial bundle for cards
// that have no detected faces.
const FaceTagger = dynamic(() => import('@/components/media/FaceTagger'), { ssr: false })

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
  suggestions?: { contactId: string; contactName: string; similarity: number }[]
}

interface MediaItemCardProps {
  url: string
  name: string
  type: string
  addedBy?: { name: string; avatarUrl?: string }
  onRemove?: () => void
  /** Storage path — used to create a memory_media row for FaceTagger */
  mediaPath?: string
  /** Faces detected during upload by Rekognition */
  detectedFaces?: DetectedFace[]
  /** memory_media row ID, if the upload was already persisted */
  mediaId?: string
}

export function MediaItemCard({
  url,
  name,
  type,
  addedBy,
  onRemove,
  mediaPath,
  detectedFaces,
  mediaId: initialMediaId,
}: MediaItemCardProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [showTagger, setShowTagger] = useState(false)
  const [resolvedMediaId, setResolvedMediaId] = useState<string | null>(initialMediaId || null)
  const [resolvingMedia, setResolvingMedia] = useState(false)
  const isVideo = (type || '').startsWith('video')
  const isImage = !isVideo
  const hasFaces = Array.isArray(detectedFaces) && detectedFaces.length > 0
  // Debug: check if mediaId was passed from upload
  if (typeof window !== 'undefined' && isImage && !resolvedMediaId) {
    console.warn('[MediaItemCard] No mediaId for image:', url?.slice(-40))
  }

  // Ensure a memory_media row exists for this image. If the upload didn't
  // create one (race condition, deploy mismatch, RLS), create it on-demand
  // via a lightweight API call so FaceTagger has a mediaId to work with.
  const ensureMediaRow = async (): Promise<string | null> => {
    if (resolvedMediaId) return resolvedMediaId
    setResolvingMedia(true)
    try {
      const res = await fetch('/api/media/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.mediaId) {
          setResolvedMediaId(data.mediaId)
          return data.mediaId
        }
      }
    } catch (err) {
      console.error('[MediaItemCard] ensureMediaRow failed', err)
    } finally {
      setResolvingMedia(false)
    }
    return null
  }

  const [tagError, setTagError] = useState(false)

  const handleTagClick = async () => {
    setTagError(false)
    const mid = await ensureMediaRow()
    if (mid) {
      setShowTagger(true)
    } else {
      console.error('[MediaItemCard] Could not resolve mediaId for face tagging')
      setTagError(true)
      setTimeout(() => setTagError(false), 3000)
    }
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Media fill */}
      <div
        className="flex-1 bg-black rounded-t-xl overflow-hidden cursor-pointer relative"
        onClick={() => {
          if (showTagger) return
          setShowPreview(true)
        }}
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
        ) : showTagger && resolvedMediaId ? (
          // FaceTagger takes over the image area
          <div className="w-full h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <FaceTagger
              mediaId={resolvedMediaId}
              imageUrl={url}
            />
          </div>
        ) : (
          <Image src={url} alt={name} fill className="object-cover" unoptimized />
        )}

        {/* Tag people button — always shown on images */}
        {isImage && !showTagger && (
          <button
            onClick={async (e) => {
              e.stopPropagation()
              await handleTagClick()
            }}
            disabled={resolvingMedia}
            className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md text-white text-xs font-semibold transition-colors disabled:opacity-60 ${
              tagError ? 'bg-red-600/80' : 'bg-black/60 hover:bg-black/80'
            }`}
          >
            <Users size={14} />
            {resolvingMedia
              ? 'Loading…'
              : tagError
                ? 'Retry'
              : hasFaces
                ? `${detectedFaces!.length} ${detectedFaces!.length === 1 ? 'face' : 'faces'}`
                : 'Tag People'}
          </button>
        )}

        {/* Auto-identified names overlay — quick summary of who Rekognition found */}
        {hasFaces && !showTagger && (() => {
          const identified = detectedFaces!
            .flatMap((f) => (f.suggestions || []).filter((s) => s.similarity >= 80))
            .slice(0, 3)
          if (identified.length === 0) return null
          return (
            <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-[11px] text-white/90 font-medium truncate">
                {identified.map((s) => s.contactName).join(', ')}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Bottom info */}
      <div className="p-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          {addedBy && (
            <span className="text-[10px] text-[#94A09A] truncate">
              Added by {addedBy.name}
            </span>
          )}
          {isImage && (
            <button
              onClick={async () => {
                if (showTagger) {
                  setShowTagger(false)
                } else {
                  await handleTagClick()
                }
              }}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                showTagger
                  ? 'bg-[#2D5A3D] text-white'
                  : 'bg-[#E6F0EA] text-[#2D5A3D] hover:bg-[#D0E5D6]'
              }`}
            >
              {showTagger ? 'Done tagging' : 'Tag people'}
            </button>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-1 rounded-full hover:bg-[#E6F0EA] text-[#94A09A] hover:text-[#5A6660] flex-shrink-0">
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
