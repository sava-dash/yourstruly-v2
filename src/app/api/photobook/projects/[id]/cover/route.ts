import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface CoverBody {
  frontImageMediaId?: string | null
  frontImageUrl?: string | null
  title?: string
  subtitle?: string
  spineText?: string
  backText?: string
  textColor?: string
  fontPair?: string
}

const ALLOWED_TEXT_COLORS = new Set(['#FFFFFF', '#F2F1E5', '#2A3E33', '#C35F33'])
const ALLOWED_FONT_PAIRS = new Set(['classic', 'modern', 'storybook', 'editorial'])

function sanitize(body: CoverBody) {
  const sanitized: Record<string, unknown> = {}
  if (body.frontImageMediaId !== undefined) sanitized.frontImageMediaId = body.frontImageMediaId
  if (body.frontImageUrl !== undefined) sanitized.frontImageUrl = body.frontImageUrl
  if (typeof body.title === 'string') sanitized.title = body.title.slice(0, 120)
  if (typeof body.subtitle === 'string') sanitized.subtitle = body.subtitle.slice(0, 240)
  if (typeof body.spineText === 'string') sanitized.spineText = body.spineText.slice(0, 80)
  if (typeof body.backText === 'string') sanitized.backText = body.backText.slice(0, 500)
  if (typeof body.textColor === 'string' && ALLOWED_TEXT_COLORS.has(body.textColor)) {
    sanitized.textColor = body.textColor
  }
  if (typeof body.fontPair === 'string' && ALLOWED_FONT_PAIRS.has(body.fontPair)) {
    sanitized.fontPair = body.fontPair
  }
  return sanitized
}

// POST /api/photobook/projects/[id]/cover — save cover design
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing, error: ownErr } = await supabase
    .from('photobook_projects')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (ownErr || !existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (existing.status === 'ordered') {
    return NextResponse.json(
      { error: 'Cannot modify an ordered project' },
      { status: 400 },
    )
  }

  let body: CoverBody
  try {
    body = (await request.json()) as CoverBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const coverDesign = sanitize(body)

  const { error } = await supabase
    .from('photobook_projects')
    .update({ cover_design: coverDesign, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Cover design save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, cover_design: coverDesign })
}

// GET /api/photobook/projects/[id]/cover — read cover design
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('photobook_projects')
    .select('cover_design')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cover_design: data.cover_design ?? null })
}
