/**
 * POST /api/wisdom/[id]/append
 *
 * Append more content to an existing wisdom (knowledge_entries) row.
 * Simpler than memories: no photos/people/location, just text + audio + tags.
 *
 * Storage:
 *   - response_text gets appended with an invisible <!--APPEND--> delimiter
 *     so undo can find the segment. Same format as memory append.
 *   - audio_url is replaced if a new one is provided (wisdom only carries
 *     one audio at a time; the prior URL is captured inside the appended
 *     block so deletion can restore it).
 *   - tags are unioned.
 *
 * Body: { text?, audioUrl?, tags? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AppendWisdomBody {
  text?: string
  audioUrl?: string | null
  tags?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: wisdomId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as AppendWisdomBody
    const admin = createAdminClient()

    const { data: entry, error: fetchErr } = await admin
      .from('knowledge_entries')
      .select('id, user_id, response_text, audio_url, tags')
      .eq('id', wisdomId)
      .single()
    if (fetchErr || !entry) {
      return NextResponse.json({ error: 'Wisdom entry not found' }, { status: 404 })
    }
    if (entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const segmentId = randomUUID()
    const nowIso = new Date().toISOString()
    const updates: Record<string, any> = {}

    // Wrap appended text in an invisible delimiter (same format as memories).
    // For wisdom we ALSO fold the previous audio_url into the block if the
    // user is replacing audio, so undo can restore it.
    const textPieces: string[] = []
    if (body.text?.trim()) textPieces.push(body.text.trim())
    const hasNewAudio = typeof body.audioUrl === 'string' && body.audioUrl.trim().length > 0
    if (hasNewAudio && entry.audio_url) {
      textPieces.push(`<!--prev-audio url="${entry.audio_url}"-->`)
    }
    const innerText = textPieces.join('\n\n')

    if (innerText) {
      const block = `\n\n<!--APPEND id="${segmentId}" at="${nowIso}" by="${user.id}"-->\n${innerText}\n<!--/APPEND-->`
      updates.response_text = `${entry.response_text || ''}${block}`
    }

    if (hasNewAudio) {
      updates.audio_url = body.audioUrl
    }

    if (Array.isArray(body.tags) && body.tags.length > 0) {
      const existing: string[] = Array.isArray(entry.tags) ? entry.tags : []
      updates.tags = Array.from(new Set([...existing, ...body.tags]))
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, segmentId, noop: true })
    }

    const { error: updErr } = await admin
      .from('knowledge_entries')
      .update(updates)
      .eq('id', wisdomId)
    if (updErr) {
      console.error('[wisdom/append] update failed:', updErr)
      return NextResponse.json({ error: 'Update failed', detail: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, segmentId })
  } catch (err) {
    console.error('[wisdom/append] unexpected error:', err)
    return NextResponse.json({ error: 'Append failed', detail: String(err) }, { status: 500 })
  }
}
