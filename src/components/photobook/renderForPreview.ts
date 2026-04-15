/**
 * renderForPreview — compose editor pages into preview PNG dataURLs by
 * reusing the production `renderPage()` at a low DPI. Mirrors the slot
 * mapping in `renderAndUpload.ts` but also carries border, filter,
 * structured background, and page-level overlays.
 */

import { renderPage, type PageContent, type SlotContent } from '@/lib/photobook/renderer'
import { getTemplateById } from '@/lib/photobook/templates'
import type { PageBackground, PageOverlay } from '@/lib/photobook/overlays'
import type { PhotoBorder, PhotoFilter } from '@/lib/photobook/renderer'

/** Editor-side page shape (subset of PageData in create/page.tsx). */
export interface PreviewPage {
  id: string
  layoutId: string
  background?: string
  backgroundV2?: PageBackground | null
  overlays?: PageOverlay[]
  slots: Array<{
    slotId: string
    type: 'photo' | 'text' | 'qr'
    fileUrl?: string
    text?: string
    qrMemoryId?: string
    qrWisdomId?: string
    border?: PhotoBorder
    filter?: PhotoFilter
  }>
}

export interface PreviewRender {
  id: string
  imageUrl: string | null
  caption: string | null
}

/** Roughly 600px wide @ 1:1 — crisp on retina without melting CPU. */
const PREVIEW_WIDTH = 600
const PREVIEW_HEIGHT = 600

function pageToContent(page: PreviewPage, publicBaseUrl: string): PageContent {
  const slots: Record<string, SlotContent> = {}
  for (const s of page.slots) {
    if (s.type === 'photo' && s.fileUrl) {
      slots[s.slotId] = {
        type: 'photo',
        value: s.fileUrl,
        border: s.border,
        filter: s.filter,
      }
    } else if (s.type === 'text' && s.text) {
      slots[s.slotId] = { type: 'text', value: s.text }
    } else if (s.type === 'qr') {
      const target = s.qrMemoryId
        ? `${publicBaseUrl}/view/${s.qrMemoryId}`
        : s.qrWisdomId
          ? `${publicBaseUrl}/view/wisdom/${s.qrWisdomId}`
          : ''
      if (target) slots[s.slotId] = { type: 'qr', value: target }
    }
  }
  return {
    slots,
    // Prefer structured background; fall back to legacy CSS string.
    background: page.backgroundV2 ?? page.background ?? null,
    overlays: page.overlays,
  }
}

function captionFor(page: PreviewPage): string | null {
  const t = page.slots.find((s) => s.type === 'text' && s.text)?.text
  return t ? t.trim().slice(0, 80) : null
}

/** Hash a page's render-affecting content for cache keys. */
export function hashPage(page: PreviewPage): string {
  const minimal = {
    l: page.layoutId,
    b: page.background ?? null,
    bv: page.backgroundV2 ?? null,
    o: page.overlays ?? null,
    s: page.slots.map((s) => ({
      i: s.slotId,
      t: s.type,
      f: s.fileUrl ?? null,
      x: s.text ?? null,
      m: s.qrMemoryId ?? null,
      w: s.qrWisdomId ?? null,
      br: s.border ?? null,
      fl: s.filter ?? null,
    })),
  }
  return JSON.stringify(minimal)
}

/**
 * Render every page to a preview-quality dataURL. Pages with a missing
 * template fall back to a null `imageUrl` (FlipBookPreview shows a blank).
 */
export async function renderPagesForPreview(
  pages: PreviewPage[],
  publicBaseUrl?: string
): Promise<PreviewRender[]> {
  const baseUrl =
    publicBaseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const out: PreviewRender[] = []
  for (const page of pages) {
    const template = getTemplateById(page.layoutId)
    const caption = captionFor(page)
    if (!template) {
      out.push({ id: page.id, imageUrl: null, caption })
      continue
    }
    try {
      const rendered = await renderPage(template, pageToContent(page, baseUrl), {
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        devicePixelRatio: 1,
      })
      out.push({ id: page.id, imageUrl: rendered.dataUrl, caption })
    } catch (err) {
      console.error('[photobook] preview render failed for page', page.id, err)
      out.push({ id: page.id, imageUrl: null, caption })
    }
  }
  return out
}
