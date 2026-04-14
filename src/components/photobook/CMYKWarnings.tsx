'use client'

/**
 * CMYKWarnings — side panel that lists photos likely to shift in print.
 *
 * Parent owns the current page list and passes in an array of photos to
 * scan. We call `scanPhotos` and render results with per-row "View" that
 * calls `onJumpToPage`.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react'
import { scanPhotos, PhotoInput, PhotoWarning } from '@/lib/photobook/cmyk-check'

interface Props {
  open: boolean
  onClose: () => void
  photos: PhotoInput[]
  onJumpToPage?: (pageNumber: number) => void
}

export default function CMYKWarnings({ open, onClose, photos, onJumpToPage }: Props) {
  const [scanning, setScanning] = useState(false)
  const [warnings, setWarnings] = useState<PhotoWarning[]>([])
  const [done, setDone] = useState(false)

  const run = async () => {
    setScanning(true)
    setDone(false)
    try {
      const result = await scanPhotos(photos)
      setWarnings(result)
      setDone(true)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    if (open && photos.length > 0 && !done && !scanning) {
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photos])

  if (!open) return null

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white shadow-2xl border-l border-[#DDE3DF] z-50 flex flex-col"
      role="dialog"
      aria-label="Color check results"
    >
      <div className="flex items-center justify-between p-4 border-b border-[#DDE3DF]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#C35F33]" />
          <h3 className="font-semibold text-[#2A3E33]">Color check</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close color check"
          className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#F2F1E5] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {scanning && (
          <div className="flex items-center gap-2 text-[#5A6660] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Scanning {photos.length} photo{photos.length === 1 ? '' : 's'}…
          </div>
        )}

        {!scanning && done && warnings.length === 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[#D3E1DF]">
            <CheckCircle2 className="w-5 h-5 text-[#406A56] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#2A3E33]">
              All photos look safe for print. Vivid colors are within a normal range.
            </div>
          </div>
        )}

        {!scanning &&
          warnings.map((w) => (
            <div
              key={`${w.mediaId}-${w.pageNumber}`}
              className="flex gap-3 p-3 rounded-lg border border-[#F4D8C8] bg-[#FFF7F1]"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-[#F2F1E5]">
                <Image
                  src={photos.find((p) => p.mediaId === w.mediaId)?.thumbnailUrl || ''}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#2A3E33]">
                  Page {w.pageNumber}
                  {w.label ? ` · ${w.label}` : ''}
                </div>
                <div className="text-xs text-[#5A6660] mt-1">{w.reason}</div>
                <div className="text-[11px] text-[#94A09A] mt-1">
                  Saturation {(w.avgSaturation * 100).toFixed(0)}% · hue ~{Math.round(w.dominantHue)}°
                </div>
                {onJumpToPage && (
                  <button
                    type="button"
                    onClick={() => onJumpToPage(w.pageNumber)}
                    className="mt-2 min-h-[36px] px-3 text-xs font-medium text-[#406A56] border border-[#406A56] rounded-md hover:bg-[#406A56] hover:text-white"
                  >
                    View page
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <div className="p-4 border-t border-[#DDE3DF]">
        <button
          type="button"
          onClick={run}
          disabled={scanning}
          className="w-full min-h-[44px] px-4 rounded-xl border-2 border-[#406A56] text-[#406A56] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {scanning ? 'Scanning…' : 'Re-check'}
        </button>
      </div>
    </div>
  )
}
