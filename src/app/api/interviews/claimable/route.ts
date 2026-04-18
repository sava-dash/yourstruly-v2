import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/interviews/claimable?email=...
 *
 * Public endpoint: given an email, returns the list of completed interview
 * sessions the user can still claim. Used by the signup page to surface a
 * "we found your past interviews" card after email entry.
 *
 * Returns minimal info — title, sender name, completed_at, access_token — so
 * the caller can later hand each token to /api/interviews/claim-account.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ sessions: [] })
  }

  const admin = createAdminClient()

  // Match either the interviewee-captured email or the sender-set
  // verification_email. claimed_by_user_id NULL = still claimable.
  const { data, error } = await admin
    .from('interview_sessions')
    .select(`
      access_token,
      title,
      completed_at,
      invitee_name,
      interviewee_email,
      verification_email,
      owner:profiles!interview_sessions_user_id_fkey(full_name, display_name)
    `)
    .eq('status', 'completed')
    .is('claimed_by_user_id', null)
    .or(`interviewee_email.eq.${email},verification_email.eq.${email}`)
    .order('completed_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[claimable] query error', error)
    return NextResponse.json({ sessions: [] })
  }

  const sessions = (data || []).map((s: any) => {
    const owner = Array.isArray(s.owner) ? s.owner[0] : s.owner
    return {
      token: s.access_token,
      title: s.title || 'Interview',
      completedAt: s.completed_at,
      senderName: owner?.display_name || owner?.full_name || 'A friend',
      invitee: s.invitee_name || null,
    }
  })

  return NextResponse.json({ sessions })
}
