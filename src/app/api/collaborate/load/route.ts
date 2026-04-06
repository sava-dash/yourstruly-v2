import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const { data: collab, error } = await supabase
    .from('memory_collaborators')
    .select('id, contact_name, prompt_text, story_context, status, inviter_id')
    .eq('access_token', token)
    .single()

  if (error || !collab) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  if (collab.status === 'completed') {
    return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
  }

  // Get inviter name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', collab.inviter_id)
    .single()

  return NextResponse.json({
    id: collab.id,
    contact_name: collab.contact_name,
    prompt_text: collab.prompt_text,
    story_context: collab.story_context,
    inviter_name: profile?.full_name || 'Someone',
    status: collab.status,
  })
}
