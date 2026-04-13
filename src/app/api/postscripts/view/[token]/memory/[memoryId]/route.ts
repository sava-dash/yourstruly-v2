import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/postscripts/view/[token]/memory/[memoryId]
 *
 * Public endpoint for PostScript recipients to view a shared memory.
 * Validates that:
 * 1. The PostScript access token is valid
 * 2. The memory is actually attached to that PostScript
 * Then returns the full memory data (bypassing RLS).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; memoryId: string }> }
) {
  const { token, memoryId } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify PostScript exists and get its ID
  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id')
    .eq('access_token', token)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify this memory is attached to this PostScript
  const { data: attachment } = await supabase
    .from('postscript_memory_attachments')
    .select('memory_id')
    .eq('postscript_id', postscript.id)
    .eq('memory_id', memoryId)
    .single()

  if (!attachment) {
    return NextResponse.json({ error: 'Memory not shared with this PostScript' }, { status: 403 })
  }

  // Fetch the full memory with media
  const { data: memory, error } = await supabase
    .from('memories')
    .select(`
      id, title, description, memory_date, location_name,
      ai_summary, ai_mood, ai_category,
      memory_media(id, file_url, file_type, is_cover)
    `)
    .eq('id', memoryId)
    .single()

  if (error || !memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  return NextResponse.json({ memory })
}
