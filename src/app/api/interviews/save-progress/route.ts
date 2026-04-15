import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/interviews/save-progress
// Auto-save in-progress conversation state. Token-only auth (no user session).
// Body: { token: string, progress: { exchanges, currentQuestionIndex, mode, ... } }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, progress } = body || {}

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    if (!progress || typeof progress !== 'object') {
      return NextResponse.json({ error: 'Progress payload required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validate token
    const { data: session, error: lookupErr } = await supabase
      .from('interview_sessions')
      .select('id, status, expires_at')
      .eq('access_token', token)
      .single()

    if (lookupErr || !session) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Interview link expired' }, { status: 410 })
    }

    if (session.status === 'completed') {
      // No-op rather than error — completion races with debounced save.
      return NextResponse.json({ ok: true, skipped: 'already-completed' })
    }

    const now = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('interview_sessions')
      .update({
        progress_data: progress,
        last_response_at: now,
      })
      .eq('id', session.id)

    if (updateErr) {
      console.error('save-progress update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, savedAt: now })
  } catch (err: any) {
    console.error('save-progress exception:', err)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}
