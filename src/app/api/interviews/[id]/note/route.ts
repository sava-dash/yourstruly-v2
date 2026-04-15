import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

// PATCH /api/interviews/[id]/note
// Body: { note: string }
// Allows the sender (session owner) to set/update an optional personal note
// shown to the recipient on the interview cold open. Capped at 280 chars
// app-side. Empty string clears the note.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Session id required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const raw = typeof body?.note === 'string' ? body.note : ''
    const note = raw.trim().slice(0, 280)

    const supabase = await (createServerClient as () => Promise<any>)()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: session, error: lookupErr } = await admin
      .from('interview_sessions')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (lookupErr || !session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updateErr } = await admin
      .from('interview_sessions')
      .update({ sender_note: note.length > 0 ? note : null })
      .eq('id', id)

    if (updateErr) {
      console.error('interview note update failed:', updateErr)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, note })
  } catch (err) {
    console.error('interview note exception:', err)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}
