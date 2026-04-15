import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/photobook/projects/[id]/save-as-theme
 * Body: { name: string; description?: string | null }
 *
 * Reads the current project + pages and persists a snapshot to
 * `photobook_user_themes` so the user can re-apply this layout/cover combo
 * to a new book later. RLS limits visibility to the owner only.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; description?: string | null } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = (body.name || '').toString().trim().slice(0, 80)
  const description = body.description
    ? body.description.toString().trim().slice(0, 240)
    : null
  if (!name) {
    return NextResponse.json({ error: 'Theme name required' }, { status: 400 })
  }

  // Load the project (owner-scoped) plus its pages.
  const { data: project, error: projErr } = await supabase
    .from('photobook_projects')
    .select(`
      id,
      title,
      cover_design,
      product_options,
      photobook_pages (
        page_number,
        page_type,
        layout,
        content_json,
        background_color,
        background_image_url
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  type PageRow = {
    page_number: number
    page_type: string
    layout: string
    content_json: Record<string, unknown> | null
    background_color: string | null
    background_image_url: string | null
  }
  const pages = (project.photobook_pages || []) as PageRow[]
  const sorted = pages.slice().sort((a, b) => a.page_number - b.page_number)

  // Build a depersonalized snapshot — drop photo media references but keep
  // layout, backgrounds, overlays, text styling, and the cover design.
  const sanitizedPages = sorted.map((p) => {
    const c = (p.content_json || {}) as Record<string, unknown>
    const slots = Array.isArray(c.slots)
      ? (c.slots as Array<Record<string, unknown>>).map((s) => {
          // Strip photo file refs so the theme is reusable; keep border/filter/enhance/text.
          const { fileUrl, mediaId, memoryId, qrMemoryId, qrWisdomId, ...rest } = s
          void fileUrl; void mediaId; void memoryId; void qrMemoryId; void qrWisdomId
          return rest
        })
      : []
    return {
      pageNumber: p.page_number,
      pageType: p.page_type,
      layoutId: p.layout,
      slots,
      background: c.backgroundV2 ?? p.background_color ?? null,
      overlays: Array.isArray(c.overlays) ? c.overlays : [],
    }
  })

  const snapshot = {
    version: 1,
    pageSequence: sorted.map((p) => p.layout),
    pages: sanitizedPages,
    coverDesign: project.cover_design ?? null,
    productOptions: project.product_options ?? null,
    sourceProjectId: project.id,
    sourceTitle: project.title,
    savedAt: new Date().toISOString(),
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('photobook_user_themes')
    .insert({
      user_id: user.id,
      name,
      description,
      snapshot_json: snapshot,
    })
    .select('id, name, description, created_at')
    .single()

  if (insertErr) {
    console.error('save-as-theme insert error', insertErr)
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 })
  }

  return NextResponse.json({ theme: inserted })
}
