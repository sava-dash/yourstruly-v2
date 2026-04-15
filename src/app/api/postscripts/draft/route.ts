import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Draft autosave for postscripts (F1).
 * PUT body: { id?: string, ...formFields }
 * - With id: update existing draft owned by user
 * - Without id: create a new draft row
 *
 * Always status='draft'. Never deducts credits.
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedKeys = [
    'recipient_contact_id', 'circle_id',
    'recipient_name', 'recipient_email', 'recipient_phone',
    'title', 'message', 'video_url', 'audio_url',
    'delivery_type', 'delivery_date', 'delivery_event',
    'delivery_recurring', 'requires_confirmation',
    'has_gift', 'gift_type', 'gift_details', 'gift_budget',
    'trigger_type', 'executor_email', 'executor_name',
    'legacy_release_required', 'group_id'
  ] as const

  const updateData: Record<string, any> = { status: 'draft' }
  for (const key of allowedKeys) {
    if (key in body && body[key] !== undefined) {
      const v = body[key]
      // Coerce empty strings to null on dates / nullable text
      updateData[key] = v === '' ? null : v
    }
  }
  // Title is required by table; provide a placeholder if empty so insert succeeds
  if (!updateData.title || String(updateData.title).trim().length === 0) {
    updateData.title = 'Untitled draft'
  }
  if (!updateData.recipient_name || String(updateData.recipient_name).trim().length === 0) {
    updateData.recipient_name = 'Unnamed recipient'
  }

  const id: string | undefined = body.id

  if (id) {
    // Verify ownership
    const { data: existing, error: ownErr } = await supabase
      .from('postscripts')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (ownErr || !existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    if (existing.status && existing.status !== 'draft') {
      return NextResponse.json({ error: 'Cannot edit a non-draft postscript via draft endpoint' }, { status: 409 })
    }

    const { error: updErr } = await supabase
      .from('postscripts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updErr) {
      console.error('[draft PUT] update error:', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    return NextResponse.json({ id })
  }

  // Insert new draft
  const accessToken =
    crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '').slice(0, 8)

  const { data: created, error: insErr } = await supabase
    .from('postscripts')
    .insert({
      user_id: user.id,
      access_token: accessToken,
      ...updateData,
    })
    .select('id')
    .single()

  if (insErr || !created) {
    console.error('[draft PUT] insert error:', insErr)
    return NextResponse.json({ error: insErr?.message || 'Failed to create draft' }, { status: 500 })
  }
  return NextResponse.json({ id: created.id })
}
