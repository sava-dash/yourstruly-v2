import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/postscripts/view/[token]/wisdom/[wisdomId]
 *
 * Public endpoint for PostScript recipients to view shared wisdom.
 * Validates the PostScript token and that the wisdom is attached.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; wisdomId: string }> }
) {
  const { token, wisdomId } = await params

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: postscript } = await supabase
    .from('postscripts')
    .select('id')
    .eq('access_token', token)
    .single()

  if (!postscript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: attachment } = await supabase
    .from('postscript_wisdom_attachments')
    .select('wisdom_id')
    .eq('postscript_id', postscript.id)
    .eq('wisdom_id', wisdomId)
    .single()

  if (!attachment) {
    return NextResponse.json({ error: 'Wisdom not shared with this PostScript' }, { status: 403 })
  }

  const { data: wisdom, error } = await supabase
    .from('knowledge_entries')
    .select('id, prompt_text, response_text, category, created_at')
    .eq('id', wisdomId)
    .single()

  if (error || !wisdom) {
    return NextResponse.json({ error: 'Wisdom not found' }, { status: 404 })
  }

  return NextResponse.json({ wisdom })
}
