import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/photobook/projects/[id]/versions — list versions (newest first)
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: project } = await supabase
    .from('photobook_projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('photobook_project_versions')
    .select('id, name, created_at')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Versions list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions: data ?? [] })
}

// POST /api/photobook/projects/[id]/versions — snapshot current state
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: project, error: projErr } = await supabase
    .from('photobook_projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: pages, error: pagesErr } = await supabase
    .from('photobook_pages')
    .select('*')
    .eq('project_id', id)
    .order('page_number', { ascending: true })
  if (pagesErr) {
    return NextResponse.json({ error: pagesErr.message }, { status: 500 })
  }

  let body: { name?: string } = {}
  try {
    body = (await request.json()) as { name?: string }
  } catch {
    body = {}
  }

  const now = new Date()
  const defaultName = `Saved at ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const name = (typeof body.name === 'string' && body.name.trim().slice(0, 80)) || defaultName

  const { data: inserted, error } = await supabase
    .from('photobook_project_versions')
    .insert({
      project_id: id,
      user_id: user.id,
      name,
      snapshot_json: { project, pages: pages ?? [] },
    })
    .select('id, name, created_at')
    .single()

  if (error) {
    console.error('Version snapshot error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ version: inserted })
}
