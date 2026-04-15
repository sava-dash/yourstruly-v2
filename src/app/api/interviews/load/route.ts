import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const started = searchParams.get('started') === 'true'

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Load session with contact and questions
    const { data: session, error } = await supabase
      .from('interview_sessions')
      .select(`
        id, title, status, user_id, expires_at,
        progress_data, opened_at, started_at, last_response_at,
        contact:contacts(id, full_name),
        owner:profiles!interview_sessions_user_id_fkey(full_name, display_name),
        session_questions(id, question_text, status, sort_order)
      `)
      .eq('access_token', token)
      .single()

    if (error || !session) {
      console.error('Interview load error:', error)
      return NextResponse.json(
        { error: 'Interview not found or link expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This interview link has expired' },
        { status: 410 }
      )
    }

    // Sort questions
    session.session_questions.sort((a: any, b: any) => a.sort_order - b.sort_order)

    // Bump opened_at on first open; bump started_at when caller signals Begin.
    const updates: Record<string, string> = {}
    if (!session.opened_at) {
      updates.opened_at = new Date().toISOString()
    }
    if (started && !session.started_at) {
      updates.started_at = new Date().toISOString()
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('interview_sessions')
        .update(updates)
        .eq('id', session.id)
      if (updateErr) {
        // Non-fatal — analytics best-effort.
        console.warn('Interview load analytics update failed:', updateErr)
      } else {
        Object.assign(session, updates)
      }
    }

    // Normalize contact (array vs object)
    const formattedSession = {
      ...session,
      contact: Array.isArray(session.contact) ? session.contact[0] : session.contact
    }

    return NextResponse.json({ session: formattedSession })
  } catch (err) {
    console.error('Interview load exception:', err)
    return NextResponse.json(
      { error: 'Failed to load interview' },
      { status: 500 }
    )
  }
}
