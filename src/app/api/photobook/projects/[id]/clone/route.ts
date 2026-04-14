import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/photobook/projects/[id]/clone
// Clones an existing project (incl. pages) into a new draft. Used by the "Reprint"
// button on the orders page.
export async function POST(_request: NextRequest, context: RouteContext) {
  const { id: sourceId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch source project + pages (ownership check via user_id filter).
  const { data: source, error: sourceError } = await supabase
    .from('photobook_projects')
    .select(
      `
      *,
      photobook_pages (
        id,
        page_number,
        page_type,
        layout,
        content,
        background_color,
        background_image_url
      )
    `
    )
    .eq('id', sourceId)
    .eq('user_id', user.id)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Build the new project insert payload — copy only fields we know exist.
  const cloneTitle = `${source.title || 'Untitled'} (reprint)`
  const projectInsert: Record<string, unknown> = {
    user_id: user.id,
    title: cloneTitle,
    description: source.description ?? null,
    cover_image_url: source.cover_image_url ?? null,
    product_sku: source.product_sku ?? null,
    product_name: source.product_name ?? null,
    page_count: source.page_count ?? 0,
    status: 'draft',
  }

  const { data: newProject, error: insertProjectError } = await supabase
    .from('photobook_projects')
    .insert(projectInsert)
    .select('id')
    .single()

  if (insertProjectError || !newProject) {
    return NextResponse.json(
      { error: insertProjectError?.message || 'Failed to clone project' },
      { status: 500 }
    )
  }

  // Clone pages.
  const sourcePages: Array<Record<string, unknown>> = Array.isArray(
    source.photobook_pages
  )
    ? (source.photobook_pages as Array<Record<string, unknown>>)
    : []

  if (sourcePages.length > 0) {
    const pageRows = sourcePages.map((p) => ({
      project_id: newProject.id,
      page_number: p.page_number,
      page_type: p.page_type ?? 'content',
      layout: p.layout ?? null,
      content: p.content ?? {},
      background_color: p.background_color ?? null,
      background_image_url: p.background_image_url ?? null,
    }))

    const { error: pagesError } = await supabase
      .from('photobook_pages')
      .insert(pageRows)

    if (pagesError) {
      // Rollback the project to avoid orphaned empty drafts.
      await supabase.from('photobook_projects').delete().eq('id', newProject.id)
      return NextResponse.json(
        { error: `Failed to clone pages: ${pagesError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ project: { id: newProject.id } }, { status: 201 })
}
