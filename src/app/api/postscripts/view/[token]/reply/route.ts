import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/postscripts/view/[token]/reply
 *
 * Allow the recipient to write back after reading a PostScript.
 * Stores the reply text on the postscript row so the sender can see it.
 * No auth required — uses the access token for validation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const body = await request.json()
    const replyText = (body.reply || '').toString().trim().slice(0, 2000)

    if (!replyText) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find the postscript by token
    const { data: postscript, error: fetchErr } = await supabase
      .from('postscripts')
      .select('id, status')
      .eq('access_token', token)
      .single()

    if (fetchErr || !postscript) {
      return NextResponse.json({ error: 'PostScript not found' }, { status: 404 })
    }

    // Only allow replies on sent/opened PostScripts
    if (postscript.status === 'draft') {
      return NextResponse.json({ error: 'This PostScript has not been delivered yet' }, { status: 403 })
    }

    // Store the reply — use reply_text and reply_at columns.
    // If columns don't exist, gracefully handle it.
    const { error: updateErr } = await supabase
      .from('postscripts')
      .update({
        reply_text: replyText,
        reply_at: new Date().toISOString(),
      })
      .eq('id', postscript.id)

    if (updateErr) {
      console.error('[postscript/reply] update failed:', updateErr)
      // If reply_text column doesn't exist, store in metadata
      const { error: metaErr } = await supabase
        .from('postscripts')
        .update({
          metadata: { reply: replyText, reply_at: new Date().toISOString() },
        } as any)
        .eq('id', postscript.id)
      if (metaErr) {
        console.error('[postscript/reply] metadata fallback failed:', metaErr)
        return NextResponse.json({ error: 'Could not save reply' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[postscript/reply] error:', err)
    return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 })
  }
}
