import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { token, responseText, responseAudioUrl, responseVideoUrl } = await request.json()

  if (!token || !responseText) {
    return NextResponse.json({ error: 'Token and response required' }, { status: 400 })
  }

  // Validate token and get collaboration
  const { data: collab, error } = await supabase
    .from('memory_collaborators')
    .select('id, inviter_id, contact_name, prompt_id, memory_id')
    .eq('access_token', token)
    .single()

  if (error || !collab) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  }

  // Update collaboration with response
  const { error: updateError } = await supabase
    .from('memory_collaborators')
    .update({
      response_text: responseText,
      response_audio_url: responseAudioUrl || null,
      response_video_url: responseVideoUrl || null,
      contributor_name: collab.contact_name,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', collab.id)

  if (updateError) {
    console.error('Failed to save response:', updateError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Notify the inviter (optional — send email or create notification)
  try {
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', collab.inviter_id)
      .single()

    // Could send push notification or email here
    // For now, the collaboration will show up when they view the memory
  } catch {}

  return NextResponse.json({ success: true })
}
