import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/media/ensure
 *
 * Ensures a memory_media row exists for a given file_url. If one already
 * exists, returns its id. If not, creates one with memory_id=NULL so
 * FaceTagger has a row to attach tags to, and attachChainMedia can link
 * it to a memory later.
 *
 * Body: { fileUrl: string }
 * Response: { mediaId: string } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const fileUrl = body?.fileUrl as string
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Check if row already exists
    const { data: existing } = await adminClient
      .from('memory_media')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_url', fileUrl)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ mediaId: existing.id })
    }

    // Derive file_type from URL
    const urlLower = fileUrl.toLowerCase()
    const fileType = /\.(mp4|mov|webm|m4v)(\?|$)/.test(urlLower)
      ? 'video'
      : /\.(mp3|wav|m4a|ogg)(\?|$)/.test(urlLower)
        ? 'audio'
        : 'image'

    // Derive file_key from URL (last path segment after the bucket)
    const urlPath = new URL(fileUrl).pathname
    const fileKey = urlPath.split('/').slice(-2).join('/') || urlPath

    // Create the row
    const { data: newRow, error: insertErr } = await adminClient
      .from('memory_media')
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        file_key: fileKey,
        file_type: fileType,
        is_cover: false,
        sort_order: 0,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[/api/media/ensure] insert failed:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ mediaId: newRow.id })
  } catch (err: any) {
    console.error('[/api/media/ensure] error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
