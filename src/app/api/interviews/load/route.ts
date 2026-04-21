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

    // Load session with contact and questions. Owner profile is fetched
    // separately because user_id FKs to auth.users, not profiles — PostgREST
    // can't embed across that hop.
    const { data: session, error } = await supabase
      .from('interview_sessions')
      .select(`
        id, title, status, user_id, expires_at,
        progress_data, opened_at, started_at, last_response_at,
        sender_note,
        contact:contacts(id, full_name),
        session_questions(id, question_text, status, sort_order, branch_rules)
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

    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name, display_name, avatar_url')
      .eq('id', session.user_id)
      .maybeSingle()

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

    // Normalize contact (array vs object) + attach owner.
    const formattedSession = {
      ...session,
      contact: Array.isArray(session.contact) ? session.contact[0] : session.contact,
      owner: owner || null,
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
