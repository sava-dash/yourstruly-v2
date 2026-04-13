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

    // Store the reply. Try updating the gift_details column with reply appended
    // (it's a nullable text field that accepts any string).
    // If the PostScript has no gift, we use gift_details purely for the reply.
    // If it has a gift, we append the reply as a JSON wrapper.
    const replyPayload = JSON.stringify({
      reply: replyText,
      reply_at: new Date().toISOString(),
      original_gift: postscript.status === 'draft' ? null : undefined,
    })

    // Try gift_details as storage (it's a text column, always exists)
    const existingGiftDetails = await supabase
      .from('postscripts')
      .select('gift_details')
      .eq('id', postscript.id)
      .single()

    let newGiftDetails: string
    if (existingGiftDetails.data?.gift_details) {
      // Append reply to existing gift details
      try {
        const existing = JSON.parse(existingGiftDetails.data.gift_details)
        existing._reply = replyText
        existing._reply_at = new Date().toISOString()
        newGiftDetails = JSON.stringify(existing)
      } catch {
        newGiftDetails = existingGiftDetails.data.gift_details
      }
    } else {
      newGiftDetails = JSON.stringify({ _reply: replyText, _reply_at: new Date().toISOString() })
    }

    const { error: updateErr } = await supabase
      .from('postscripts')
      .update({ gift_details: newGiftDetails })
      .eq('id', postscript.id)

    if (updateErr) {
      console.error('[postscript/reply] save failed:', updateErr.message)
      return NextResponse.json({ error: 'Could not save reply' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[postscript/reply] error:', err)
    return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 })
  }
}
