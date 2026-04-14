import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

const MAX_BYTES = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

/**
 * POST /api/photobook/projects/[id]/assets
 *
 * Accepts a rendered (300 DPI, with bleed) page image for a photobook project
 * and writes it to the public `photobooks` storage bucket. The returned
 * public URL is then submitted to Prodigi at checkout time.
 *
 * FormData:
 *   - pageNumber: integer (1-based)
 *   - pageType:   'front_cover' | 'back_cover' | 'content'
 *   - image:      File/Blob (PNG/JPEG/WebP, <= 50MB)
 *
 * Side effect: updates `photobook_pages.content_json.rendered_url` for the
 * matching (project_id, page_number) row.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId } = await context.params

  // Early Content-Length guard so we don't buffer huge bodies into memory.
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    return NextResponse.json(
      { error: 'That rendered page is too large. Please try again.' },
      { status: 413 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ownership check
  const { data: project, error: projectErr } = await supabase
    .from('photobook_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const pageNumberRaw = form.get('pageNumber')
  const pageType = form.get('pageType')
  const image = form.get('image')

  const pageNumber = Number(pageNumberRaw)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: 'pageNumber must be a positive integer' }, { status: 400 })
  }
  if (pageType !== 'front_cover' && pageType !== 'back_cover' && pageType !== 'content') {
    return NextResponse.json({ error: 'Invalid pageType' }, { status: 400 })
  }
  if (!(image instanceof Blob)) {
    return NextResponse.json({ error: 'image file is required' }, { status: 400 })
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'That rendered page is too large. Please try again.' },
      { status: 413 }
    )
  }
  const mime = image.type || 'image/png'
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: 'Only PNG, JPEG, or WebP images are accepted.' },
      { status: 415 }
    )
  }

  // Upload under the per-user prefix required by the photobooks bucket RLS.
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  const path = `${user.id}/${projectId}/page-${pageNumber}.${ext}`
  const buffer = Buffer.from(await image.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('photobooks')
    .upload(path, buffer, { contentType: mime, upsert: true })

  if (uploadErr) {
    console.error('[photobook/assets] upload error:', uploadErr)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = admin.storage.from('photobooks').getPublicUrl(path)

  // Merge rendered_url into the corresponding page's content_json JSONB.
  // We fetch, merge, update — small page count (<100) so this is cheap.
  const { data: pageRow } = await admin
    .from('photobook_pages')
    .select('id, content_json')
    .eq('project_id', projectId)
    .eq('page_number', pageNumber)
    .maybeSingle()

  if (pageRow) {
    const mergedContent = {
      ...(pageRow.content_json || {}),
      rendered_url: publicUrl,
    }
    await admin
      .from('photobook_pages')
      .update({ content_json: mergedContent })
      .eq('id', pageRow.id)
  }

  return NextResponse.json({ url: publicUrl, pageNumber })
}
