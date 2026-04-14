'use client'

/**
 * CoverDesigner — front / spine / back live preview of the book cover.
 *
 * Props are the minimum needed to drive the 3-card preview. Saving is done
 * through POST /api/photobook/projects/[id]/cover; the parent passes
 * `projectId` so this component can persist on "Save cover".
 */

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Save } from 'lucide-react'
import { FONT_PAIR_STACKS, FontPair } from '@/lib/photobook/themes'

export interface CoverPhotoOption {
  mediaId: string
  fileUrl: string
  memoryTitle?: string
}

export interface CoverDesignState {
  frontImageMediaId: string | null
  frontImageUrl: string | null
  title: string
  subtitle: string
  spineText: string
  backText: string
  textColor: '#FFFFFF' | '#F2F1E5' | '#2A3E33' | '#C35F33'
  fontPair: FontPair
}

const TEXT_COLORS: Array<{ value: CoverDesignState['textColor']; label: string; swatch: string }> = [
  { value: '#FFFFFF', label: 'White', swatch: '#FFFFFF' },
  { value: '#F2F1E5', label: 'Cream', swatch: '#F2F1E5' },
  { value: '#2A3E33', label: 'Green Dark', swatch: '#2A3E33' },
  { value: '#C35F33', label: 'Terra Cotta', swatch: '#C35F33' },
]

const FONT_PAIRS: Array<{ value: FontPair; label: string }> = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'storybook', label: 'Storybook' },
  { value: 'editorial', label: 'Editorial' },
]

export const DEFAULT_COVER_DESIGN: CoverDesignState = {
  frontImageMediaId: null,
  frontImageUrl: null,
  title: 'Our Book',
  subtitle: '',
  spineText: '',
  backText: '',
  textColor: '#F2F1E5',
  fontPair: 'classic',
}

interface Props {
  projectId: string | null
  initial?: CoverDesignState | null
  photoOptions: CoverPhotoOption[]
  onSaved?: (cover: CoverDesignState) => void
}

export default function CoverDesigner({ projectId, initial, photoOptions, onSaved }: Props) {
  const [design, setDesign] = useState<CoverDesignState>(() => ({
    ...DEFAULT_COVER_DESIGN,
    ...(initial || {}),
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const stacks = useMemo(() => FONT_PAIR_STACKS[design.fontPair], [design.fontPair])

  const handleSave = async () => {
    if (!projectId) {
      onSaved?.(design)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      onSaved?.(design)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Cover save failed:', err)
      alert('We couldn\'t save your cover. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof CoverDesignState>(key: K, value: CoverDesignState[K]) => {
    setDesign((d) => ({ ...d, [key]: value }))
  }

  return (
    <div className="space-y-8">
      {/* Preview row: front / spine / back */}
      <div className="bg-[#F2F1E5] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#406A56] mb-4" style={{ fontFamily: stacks.body }}>
          Cover preview
        </h3>
        <div className="flex items-stretch justify-center gap-2 sm:gap-4 overflow-x-auto pb-2">
          {/* Back */}
          <CoverCard label="Back" className="flex-shrink-0 w-40 sm:w-48 aspect-[3/4]" bg="#2A3E33">
            <div
              className="p-4 text-[11px] sm:text-xs leading-snug"
              style={{ color: design.textColor, fontFamily: stacks.body }}
            >
              {design.backText || 'Back cover text appears here.'}
            </div>
          </CoverCard>
          {/* Spine */}
          <CoverCard label="Spine" className="flex-shrink-0 w-10 sm:w-12 aspect-[1/8]" bg="#406A56">
            <div
              className="h-full flex items-center justify-center"
              style={{
                writingMode: 'vertical-rl',
                color: design.textColor,
                fontFamily: stacks.heading,
                fontSize: 13,
                letterSpacing: '0.08em',
              }}
            >
              {design.spineText || 'Spine'}
            </div>
          </CoverCard>
          {/* Front */}
          <CoverCard label="Front" className="flex-shrink-0 w-40 sm:w-48 aspect-[3/4]" bg="#406A56">
            {design.frontImageUrl && (
              <Image
                src={design.frontImageUrl}
                alt="Cover"
                fill
                sizes="192px"
                className="object-cover"
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center">
              <div
                className="font-bold leading-tight"
                style={{
                  color: design.textColor,
                  fontFamily: stacks.heading,
                  fontSize: 18,
                  textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
              >
                {design.title || 'Title'}
              </div>
              {design.subtitle && (
                <div
                  className="mt-1"
                  style={{
                    color: design.textColor,
                    fontFamily: stacks.body,
                    fontSize: 11,
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                  }}
                >
                  {design.subtitle}
                </div>
              )}
            </div>
          </CoverCard>
        </div>
      </div>

      {/* Edit controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[#2d2d2d] mb-1">Title</label>
          <input
            value={design.title}
            maxLength={120}
            onChange={(e) => update('title', e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-[#DDE3DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2d2d2d] mb-1">Subtitle / author</label>
          <input
            value={design.subtitle}
            maxLength={240}
            onChange={(e) => update('subtitle', e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-[#DDE3DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2d2d2d] mb-1">Spine text</label>
          <input
            value={design.spineText}
            maxLength={80}
            onChange={(e) => update('spineText', e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-[#DDE3DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2d2d2d] mb-1">Back cover blurb</label>
          <textarea
            value={design.backText}
            maxLength={500}
            rows={2}
            onChange={(e) => update('backText', e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-[#DDE3DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]"
          />
        </div>
      </div>

      {/* Text color + font pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-medium text-[#2d2d2d] mb-2">Text color</div>
          <div className="flex gap-2 flex-wrap">
            {TEXT_COLORS.map((c) => {
              const active = design.textColor === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`Text color ${c.label}`}
                  onClick={() => update('textColor', c.value)}
                  className={`min-w-[44px] min-h-[44px] rounded-full border-2 transition-all flex items-center justify-center ${
                    active ? 'border-[#406A56] scale-110' : 'border-[#DDE3DF]'
                  }`}
                  style={{ backgroundColor: c.swatch }}
                >
                  {active && (
                    <Check className="w-4 h-4" style={{ color: c.value === '#FFFFFF' || c.value === '#F2F1E5' ? '#2A3E33' : '#FFFFFF' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-[#2d2d2d] mb-2">Font pairing</div>
          <div className="flex gap-2 flex-wrap">
            {FONT_PAIRS.map((fp) => {
              const active = design.fontPair === fp.value
              return (
                <button
                  key={fp.value}
                  type="button"
                  onClick={() => update('fontPair', fp.value)}
                  className={`min-h-[44px] px-4 rounded-xl border-2 font-medium transition-all ${
                    active
                      ? 'border-[#406A56] bg-[#406A56] text-white'
                      : 'border-[#DDE3DF] text-[#2d2d2d] hover:border-[#406A56]'
                  }`}
                  style={{ fontFamily: FONT_PAIR_STACKS[fp.value].heading }}
                >
                  {fp.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Front photo picker */}
      <div>
        <div className="text-sm font-medium text-[#2d2d2d] mb-2">Front cover photo</div>
        {photoOptions.length === 0 ? (
          <div className="text-sm text-[#666] p-4 bg-[#F2F1E5] rounded-lg">
            Add memories with photos to choose a cover image.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {photoOptions.map((p) => {
              const active = design.frontImageMediaId === p.mediaId
              return (
                <button
                  key={p.mediaId}
                  type="button"
                  onClick={() => {
                    update('frontImageMediaId', p.mediaId)
                    update('frontImageUrl', p.fileUrl)
                  }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all min-h-[44px] ${
                    active ? 'border-[#406A56] ring-2 ring-[#406A56]/30' : 'border-[#DDE3DF]'
                  }`}
                  aria-label={`Use ${p.memoryTitle ?? 'this photo'} as cover`}
                >
                  <Image src={p.fileUrl} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  {active && (
                    <div className="absolute inset-0 bg-[#406A56]/30 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[52px] px-6 bg-[#406A56] text-white font-semibold rounded-xl hover:bg-[#345548] disabled:opacity-50 flex items-center gap-2"
        >
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Saved' : saving ? 'Saving…' : 'Save cover'}
        </button>
      </div>
    </div>
  )
}

function CoverCard({
  label,
  className,
  bg,
  children,
}: {
  label: string
  className?: string
  bg: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-md shadow-md overflow-hidden ${className ?? ''}`}
        style={{ backgroundColor: bg }}
      >
        {children}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wider text-[#5A6660]">{label}</div>
    </div>
  )
}
