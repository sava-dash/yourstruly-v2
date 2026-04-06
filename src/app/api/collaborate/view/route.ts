import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  await supabase
    .from('memory_collaborators')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('access_token', token)
    .in('status', ['pending', 'sent'])

  return NextResponse.json({ success: true })
}
