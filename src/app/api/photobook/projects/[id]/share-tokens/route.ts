import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildShareTokenUrl,
  listProjectShareTokens,
  mintBookShareToken,
  revokeShareToken,
  type ShareTarget,
} from '@/lib/photobook/share-tokens'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function requireProjectOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }

  const { data: project } = await supabase
    .from('photobook_projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' as const, status: 404 }
  if (project.user_id !== user.id) return { error: 'Forbidden' as const, status: 403 }
  return { user, project }
}

// POST /api/photobook/projects/[id]/share-tokens
// Body: { target: { type: 'memory' | 'wisdom', id: string } }
// Returns: { token, url, reused }
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params
  const supabase = await createClient()

  const auth = await requireProjectOwnership(supabase, projectId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { target?: ShareTarget } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const target = body.target
  if (
    !target ||
    (target.type !== 'memory' && target.type !== 'wisdom') ||
    typeof target.id !== 'string' ||
    target.id.length === 0
  ) {
    return NextResponse.json(
      { error: 'target.type must be "memory" or "wisdom" and target.id required' },
      { status: 400 }
    )
  }

  try {
    const { token, reused } = await mintBookShareToken(supabase, {
      userId: auth.user.id,
      projectId,
      target,
    })
    const origin = request.nextUrl.origin
    return NextResponse.json({ token, url: buildShareTokenUrl(token, origin), reused })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mint token'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/photobook/projects/[id]/share-tokens
// Returns: { tokens: ShareTokenRow[] } — for the revoke UI.
export async function GET(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params
  const supabase = await createClient()

  const auth = await requireProjectOwnership(supabase, projectId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const tokens = await listProjectShareTokens(supabase, projectId)
    return NextResponse.json({ tokens })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list tokens'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/photobook/projects/[id]/share-tokens
// Body: { token: string } — revokes that token.
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params
  const supabase = await createClient()

  const auth = await requireProjectOwnership(supabase, projectId)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { token?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const tokenValue = body.token
  if (!tokenValue || typeof tokenValue !== 'string') {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  // Ensure this token was minted for a page in this project.
  const tokens = await listProjectShareTokens(supabase, projectId)
  const owned = tokens.some((t) => t.token === tokenValue)
  if (!owned) {
    return NextResponse.json(
      { error: 'Token not found in this project' },
      { status: 404 }
    )
  }

  try {
    await revokeShareToken(supabase, tokenValue)
    return NextResponse.json({ revoked: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke token'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
