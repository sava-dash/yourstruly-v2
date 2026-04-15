'use client'

/**
 * PrintedCard — card for a previously printed photobook on the
 * /dashboard/photobook landing page. Shows cover, title, print date,
 * shipping status badge, and two CTAs: view digitally + reprint.
 */

import Image from 'next/image'
import { BookOpen, Copy, Loader2 } from 'lucide-react'

export interface PrintedCardProject {
  id: string
  title: string | null
  cover_image_url: string | null
  printed_at: string | null
  order_status: string | null
}

interface Props {
  project: PrintedCardProject
  onView: (id: string) => void
  onReprint: (id: string) => void
  reprinting?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  processing: 'In production',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  complete: 'Delivered',
  completed: 'Delivered',
}

function badgeColor(status: string | null): { bg: string; fg: string } {
  if (!status) return { bg: '#F2F1E5', fg: '#666' }
  if (status === 'delivered' || status === 'complete' || status === 'completed') {
    return { bg: '#D3E1DF', fg: '#2d4d3e' }
  }
  if (status === 'shipped') return { bg: '#D3E1DF', fg: '#2d4d3e' }
  return { bg: '#F2F1E5', fg: '#666' }
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Printed recently'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return 'Printed recently'
  return `Printed ${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

export default function PrintedCard({ project, onView, onReprint, reprinting }: Props) {
  const title = project.title?.trim() || 'Untitled book'
  const statusKey = (project.order_status || '').toLowerCase()
  const statusLabel = STATUS_LABEL[statusKey]
  const { bg, fg } = badgeColor(statusKey)

  return (
    <div
      className="flex flex-col bg-white rounded-xl border border-[#e7e2d5] overflow-hidden shadow-sm"
      style={{ fontFamily: "'Inter Tight', system-ui, sans-serif" }}
    >
      <div className="relative w-full aspect-[4/3] bg-[#F2F1E5]">
        {project.cover_image_url ? (
          <Image
            src={project.cover_image_url}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#406A56]/40 text-sm">
            No cover image
          </div>
        )}
        {statusLabel && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: bg, color: fg }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3
            className="text-lg font-semibold text-[#2d2d2d] leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#666]">{formatDate(project.printed_at)}</p>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row items-stretch gap-2">
          <button
            type="button"
            onClick={() => onView(project.id)}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#406A56] hover:bg-[#34594a] text-white font-medium px-4 transition-colors"
          >
            <BookOpen className="w-4 h-4" aria-hidden />
            View digitally
          </button>
          <button
            type="button"
            onClick={() => onReprint(project.id)}
            disabled={reprinting}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-[#C35F33] text-[#C35F33] hover:bg-[#C35F33]/10 disabled:opacity-50 font-medium px-4 transition-colors"
          >
            {reprinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Creating reprint&hellip;
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden />
                Reprint this book
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
