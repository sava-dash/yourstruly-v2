import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>
}

interface SnapshotPage {
  page_number: number
  page_type?: string
  layout_type?: string
  content_json?: unknown
  background_color?: string | null
  background_image_url?: string | null
}

interface SnapshotShape {
  project?: Record<string, unknown>
  pages?: SnapshotPage[]
}

// POST /api/photobook/projects/[id]/versions/[versionId]/restore
export async function POST(_request: NextRequest, context: RouteContext) {
  const { id, versionId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ownership on project.
  const { data: project, error: projErr } = await supabase
    .from('photobook_projects')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (project.status === 'ordered') {
    return NextResponse.json(
      { error: 'Cannot restore into an ordered project' },
      { status: 400 },
    )
  }

  // Load the version.
  const { data: version, error: verErr } = await supabase
    .from('photobook_project_versions')
    .select('id, snapshot_json')
    .eq('id', versionId)
    .eq('project_id', id)
    .eq('user_id', user.id)
    .single()
  if (verErr || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const snapshot = (version.snapshot_json || {}) as SnapshotShape
  const snapshotPages = Array.isArray(snapshot.pages) ? snapshot.pages : []

  // Replace pages: delete current, insert from snapshot.
  const { error: delErr } = await supabase
    .from('photobook_pages')
    .delete()
    .eq('project_id', id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (snapshotPages.length > 0) {
    const rows = snapshotPages.map((p, idx) => ({
      project_id: id,
      page_number: p.page_number ?? idx + 1,
      page_type: p.page_type ?? (idx === 0 ? 'cover' : 'content'),
      layout_type: p.layout_type ?? 'single',
      content_json: p.content_json ?? {},
      background_color: p.background_color ?? null,
      background_image_url: p.background_image_url ?? null,
    }))
    const { error: insErr } = await supabase.from('photobook_pages').insert(rows)
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  // Return fresh pages.
  const { data: pages } = await supabase
    .from('photobook_pages')
    .select('*')
    .eq('project_id', id)
    .order('page_number', { ascending: true })

  return NextResponse.json({ success: true, pages: pages ?? [] })
}

// DELETE /api/photobook/projects/[id]/versions/[versionId]/restore
// (kept here so the version row can be removed from the same folder; the
// version-history panel calls this path.)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, versionId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('photobook_project_versions')
    .delete()
    .eq('id', versionId)
    .eq('project_id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
