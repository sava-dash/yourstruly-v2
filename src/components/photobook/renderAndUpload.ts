/**
 * Photobook render + upload pipeline
 *
 * For each in-memory page, render a 300 DPI print-ready PNG (with Prodigi
 * bleed) via `renderExport`, convert the data URL to a Blob, and POST it to
 * `/api/photobook/projects/[id]/assets`. The server stores the image in the
 * public `photobooks` bucket and writes its URL onto the matching
 * `photobook_pages.content_json.rendered_url`.
 *
 * Keeps the create page lean — all browser-side print logic lives here.
 */

import { renderExport, type PageContent, type SlotContent } from '@/lib/photobook/renderer'
import { getTemplateById } from '@/lib/photobook/templates'

// Shape matches what create/page.tsx stores in state for each page.
export interface UploadablePage {
  id: string
  pageNumber: number
  layoutId: string
  slots: Array<{
    slotId: string
    type: 'photo' | 'text' | 'qr'
    fileUrl?: string
    text?: string
    qrMemoryId?: string
    qrWisdomId?: string
  }>
  background?: string
}

export interface RenderProgress {
  /** 1-based index of the page currently being processed */
  current: number
  total: number
  phase: 'rendering' | 'uploading'
}

export interface RenderedPageResult {
  pageNumber: number
  url: string
}

export interface RenderAndUploadOptions {
  projectId: string
  pages: UploadablePage[]
  /** Public origin for QR targets; falls back to window.location.origin */
  publicBaseUrl?: string
  onProgress?: (p: RenderProgress) => void
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function slotsToContent(
  page: UploadablePage,
  publicBaseUrl: string
): PageContent {
  const slots: Record<string, SlotContent> = {}
  for (const s of page.slots) {
    if (s.type === 'photo' && s.fileUrl) {
      slots[s.slotId] = { type: 'photo', value: s.fileUrl }
    } else if (s.type === 'text' && s.text) {
      slots[s.slotId] = { type: 'text', value: s.text }
    } else if (s.type === 'qr') {
      const target = s.qrMemoryId
        ? `${publicBaseUrl}/share/memory/${s.qrMemoryId}`
        : s.qrWisdomId
          ? `${publicBaseUrl}/share/wisdom/${s.qrWisdomId}`
          : ''
      if (target) slots[s.slotId] = { type: 'qr', value: target }
    }
  }
  return { slots, background: page.background }
}

function pageTypeFor(page: UploadablePage, total: number): 'front_cover' | 'back_cover' | 'content' {
  if (page.pageNumber === 1) return 'front_cover'
  if (page.pageNumber === total) return 'back_cover'
  return 'content'
}

/**
 * Render every page in order and upload to storage. Rejects with a plain
 * English message on the first failure so the caller can surface it as-is.
 */
export async function renderAndUploadAll(
  opts: RenderAndUploadOptions
): Promise<RenderedPageResult[]> {
  const { projectId, pages, onProgress } = opts
  const publicBaseUrl =
    opts.publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')

  const results: RenderedPageResult[] = []
  const total = pages.length

  for (let i = 0; i < total; i++) {
    const page = pages[i]
    const template = getTemplateById(page.layoutId)
    if (!template) {
      throw new Error(
        `We couldn't prepare page ${page.pageNumber} because its layout is missing. Please edit that page and try again.`
      )
    }

    onProgress?.({ current: i + 1, total, phase: 'rendering' })

    let dataUrl: string
    try {
      const rendered = await renderExport(template, slotsToContent(page, publicBaseUrl))
      dataUrl = rendered.dataUrl
    } catch (err) {
      console.error('[photobook] render failed for page', page.pageNumber, err)
      throw new Error(
        `We couldn't render page ${page.pageNumber}. Please try again in a moment.`
      )
    }

    onProgress?.({ current: i + 1, total, phase: 'uploading' })

    const blob = dataUrlToBlob(dataUrl)
    const form = new FormData()
    form.append('pageNumber', String(page.pageNumber))
    form.append('pageType', pageTypeFor(page, total))
    form.append('image', blob, `page-${page.pageNumber}.png`)

    const resp = await fetch(`/api/photobook/projects/${projectId}/assets`, {
      method: 'POST',
      body: form,
    })

    if (!resp.ok) {
      let msg = 'Upload failed. Please try again.'
      try {
        const j = await resp.json()
        if (j?.error) msg = j.error
      } catch { /* ignore */ }
      throw new Error(`Page ${page.pageNumber}: ${msg}`)
    }

    const json = (await resp.json()) as { url: string; pageNumber: number }
    results.push({ pageNumber: json.pageNumber, url: json.url })
  }

  return results
}
