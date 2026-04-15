'use client'

/**
 * DraftCard — compact card for an in-progress photobook draft on the
 * /dashboard/photobook landing page. Shows cover thumb, title, page count
 * and last-edited time-ago. Primary CTA resumes editing; secondary deletes.
 */

import Image from 'next/image'
import { Trash2, Pencil } from 'lucide-react'

export interface DraftCardProject {
  id: string
  title: string | null
  cover_image_url: string | null
  page_count: number | null
  updated_at: string
}

interface Props {
  project: DraftCardProject
  onContinue: (id: string) => void
  onDelete: (id: string) => void
  deleting?: boolean
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'recently'
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export default function DraftCard({ project, onContinue, onDelete, deleting }: Props) {
  const title = project.title?.trim() || 'Untitled book'
  const pages = project.page_count ?? 0
  const edited = timeAgo(project.updated_at)

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
            No cover yet
          </div>
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
          <p className="mt-1 text-sm text-[#666]">
            {pages} page{pages === 1 ? '' : 's'} &middot; Edited {edited}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onContinue(project.id)}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#406A56] hover:bg-[#34594a] text-white font-medium px-4 transition-colors"
          >
            <Pencil className="w-4 h-4" aria-hidden />
            Continue editing
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            disabled={deleting}
            aria-label="Delete draft"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-[#C35F33] text-[#C35F33] hover:bg-[#C35F33]/10 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
