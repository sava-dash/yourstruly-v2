/**
 * DELETE /api/memories/[id]/append/[segmentId]
 *
 * Undo a specific appended segment. Strips the <!--APPEND id="..."-->...
 * <!--/APPEND--> block from the memory's description and deletes any
 * memory_media rows tagged source = "append:<segmentId>".
 *
 * Authorization: either the memory owner OR the original appender (whose
 * user-id is stored inside the delimiter's `by="..."` attribute).
 *
 * Entity arrays in `extracted_entities` are left alone — a people/topic
 * might have been mentioned in multiple segments, so we can't safely remove
 * it just because one segment went away.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; segmentId: string }> },
) {
  try {
    const { id: memoryId, segmentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: memory, error: memErr } = await admin
      .from('memories')
      .select('id, user_id, description')
      .eq('id', memoryId)
      .single()
    if (memErr || !memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 })

    // Match the segment's block in the description.
    // The delimiter is written by /api/memories/[id]/append as:
    //   <!--APPEND id="<uuid>" at="<iso>" by="<userId>"-->...<!--/APPEND-->
    const blockRe = new RegExp(
      `\\n*<!--APPEND id="${segmentId}" at="([^"]*)" by="([^"]*)"-->([\\s\\S]*?)<!--/APPEND-->`,
      'm',
    )
    const match = (memory.description || '').match(blockRe)
    if (!match) {
      // Segment not in description — still try to clean orphan media rows.
      const { error: delErr } = await admin
        .from('memory_media')
        .delete()
        .eq('memory_id', memoryId)
        .eq('source', `append:${segmentId}`)
      if (delErr) console.warn('[append/delete] media cleanup failed:', delErr)
      return NextResponse.json({ ok: true, removedBlock: false })
    }

    const authorUserId = match[2]
    const isOwner = memory.user_id === user.id
    const isAuthor = authorUserId === user.id
    if (!isOwner && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newDescription = memory.description.replace(blockRe, '')
    const { error: updErr } = await admin
      .from('memories')
      .update({ description: newDescription })
      .eq('id', memoryId)
    if (updErr) {
      console.error('[append/delete] description update failed:', updErr)
      return NextResponse.json({ error: 'Update failed', detail: updErr.message }, { status: 500 })
    }

    // Clean up the media rows tagged to this segment.
    await admin
      .from('memory_media')
      .delete()
      .eq('memory_id', memoryId)
      .eq('source', `append:${segmentId}`)

    // Clean up any collaborator row we wrote for this append.
    await admin
      .from('memory_collaborators')
      .delete()
      .eq('memory_id', memoryId)
      .eq('prompt_id', `append:${segmentId}`)

    return NextResponse.json({ ok: true, removedBlock: true })
  } catch (err) {
    console.error('[append/delete] unexpected error:', err)
    return NextResponse.json(
      { error: 'Delete failed', detail: String(err) },
      { status: 500 },
    )
  }
}
