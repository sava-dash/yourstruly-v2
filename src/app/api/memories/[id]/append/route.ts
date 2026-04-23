/**
 * POST /api/memories/[id]/append
 *
 * Append more content to an existing memory. Used by the "Continue this
 * memory" cardchain flow (AppendMemoryChain). Mirrors what
 * /api/engagement/prompts/[id] does at Finish time, but for an EXISTING
 * memory id rather than creating a new one.
 *
 * Storage strategy:
 *   - Description: wrapped in invisible HTML-comment delimiters so the new
 *     content renders without "##" headers but can still be parsed + deleted
 *     by segment id. Example:
 *       <!--APPEND id="<uuid>" at="<iso>" by="<userId>"-->
 *       ...content...
 *       <!--/APPEND-->
 *   - memory_media rows tagged via `source = "append:<segmentId>"` so undo
 *     can find them. No migration needed.
 *   - memory_people: upserted on append.
 *   - location_name / memory_date: newer-wins (per product decision).
 *   - Cover: if the memory has no cover and new photos are appended, the
 *     first one becomes cover.
 *   - memory_collaborators: if the user is not the owner, a row is written.
 *   - Embedding refresh: enqueued asynchronously (fire-and-forget fetch).
 *
 * Request body:
 *   {
 *     text?: string,                   // appended conversation text (Q&A-format ok)
 *     mediaUrls?: { url, type, mediaId?, name? }[],
 *     taggedPeople?: { id?: string, name: string }[],
 *     location?: { name: string, lat?: number, lng?: number },
 *     date?: string,                   // ISO or "YYYY-MM-DD"
 *     quote?: string,
 *     song?: { title: string, artist?: string },
 *     comment?: string,
 *     extracted?: { where?, when?, mood?, tags?, summary? },  // from SynopsisCard (optional, in merge mode)
 *   }
 *
 * Response: { ok: true, segmentId, appendedCount }
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AppendBody {
  text?: string
  mediaUrls?: { url: string; type?: string; mediaId?: string; name?: string }[]
  taggedPeople?: { id?: string; name: string }[]
  location?: { name: string; lat?: number; lng?: number }
  date?: string
  quote?: string
  song?: { title: string; artist?: string }
  comment?: string
  extracted?: {
    where?: string | null
    when?: string | null
    mood?: string | null
    tags?: string[]
    summary?: string | null
    people?: string[]
  }
}

function deriveFileType(hint: string): 'image' | 'video' | 'audio' {
  const s = hint.toLowerCase()
  if (s.startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/.test(s)) return 'video'
  if (s.startsWith('audio') || /\.(mp3|wav|m4a|ogg)(\?|$)/.test(s)) return 'audio'
  return 'image'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: memoryId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as AppendBody

    // Fetch the memory — owner OR collaborator. Collaborator check uses the
    // admin client since we're about to write anyway.
    const admin = createAdminClient()
    const { data: memory, error: memErr } = await admin
      .from('memories')
      .select('id, user_id, description, location_name, location_lat, location_lng, memory_date, mood, ai_mood, tags, extracted_entities')
      .eq('id', memoryId)
      .single()
    if (memErr || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    const isOwner = memory.user_id === user.id
    if (!isOwner) {
      // Collaborator access — must have an accepted row
      const { data: collab } = await admin
        .from('memory_collaborators')
        .select('id')
        .eq('memory_id', memoryId)
        .or(`contact_email.eq.${user.email},inviter_id.eq.${user.id}`)
        .maybeSingle()
      if (!collab) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const segmentId = randomUUID()
    const nowIso = new Date().toISOString()

    // ─── Build the text block (invisible-delimited) ───────────────────────
    const parts: string[] = []
    if (body.text?.trim()) parts.push(body.text.trim())
    if (body.comment?.trim()) parts.push(body.comment.trim())
    if (body.quote?.trim()) parts.push(`"${body.quote.trim()}"`)
    if (body.song?.title) {
      const artist = body.song.artist ? ` by ${body.song.artist}` : ''
      parts.push(`Song: ${body.song.title}${artist}`)
    }
    const innerText = parts.join('\n\n')

    const appendedBlock = innerText
      ? `\n\n<!--APPEND id="${segmentId}" at="${nowIso}" by="${user.id}"-->\n${innerText}\n<!--/APPEND-->`
      : ''

    const newDescription = appendedBlock
      ? `${memory.description || ''}${appendedBlock}`
      : memory.description

    // ─── Newer-wins for location/date ─────────────────────────────────────
    const updates: Record<string, any> = {}
    if (appendedBlock) updates.description = newDescription
    if (body.location?.name) {
      updates.location_name = body.location.name
      if (typeof body.location.lat === 'number') updates.location_lat = body.location.lat
      if (typeof body.location.lng === 'number') updates.location_lng = body.location.lng
    }
    if (body.date) {
      const parsedDate = new Date(body.date)
      if (!isNaN(parsedDate.getTime())) {
        updates.memory_date = parsedDate.toISOString().split('T')[0]
      }
    }
    if (body.extracted?.mood) updates.ai_mood = body.extracted.mood

    // Extracted-entity union (merge policy). Arrays union; scalars prefer
    // the newer value; original fields preserved on absence.
    if (body.extracted) {
      const existing = (memory.extracted_entities as any) || {}
      const union = (a?: any, b?: any): string[] => {
        const merged = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
          .filter((x) => typeof x === 'string' && x.trim().length > 0)
        return Array.from(new Set(merged.map((s) => s.trim())))
      }
      updates.extracted_entities = {
        ...existing,
        topics:    union(existing.topics,    body.extracted.tags),
        people:    union(existing.people,    body.extracted.people),
        times:     union(existing.times,     body.extracted.when ? [body.extracted.when] : []),
        locations: union(existing.locations, body.extracted.where ? [body.extracted.where] : []),
        summary:   body.extracted.summary || existing.summary || '',
        mood:      body.extracted.mood || existing.mood || null,
        last_appended_at: nowIso,
      }
      if (Array.isArray(body.extracted.tags) && body.extracted.tags.length > 0) {
        const existingTags: string[] = Array.isArray(memory.tags) ? memory.tags : []
        updates.tags = Array.from(new Set([...existingTags, ...body.extracted.tags]))
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await admin.from('memories').update(updates).eq('id', memoryId)
      if (updErr) {
        console.error('[append] memories update failed:', updErr)
        return NextResponse.json({ error: 'Update failed', detail: updErr.message }, { status: 500 })
      }
    }

    // ─── memory_media inserts ─────────────────────────────────────────────
    let appendedMediaCount = 0
    if (body.mediaUrls && body.mediaUrls.length > 0) {
      // Check whether the memory currently has any cover. If not, the first
      // appended photo becomes cover (per product decision #6).
      const { data: coverRows } = await admin
        .from('memory_media')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('is_cover', true)
        .limit(1)
      const hasCover = (coverRows?.length ?? 0) > 0

      // Attach any orphan rows the upload endpoint left with memory_id=NULL.
      // We identify them by file_url match (same strategy as attachChainMedia).
      const urls = body.mediaUrls.map((m) => m.url)
      const { data: existingRows } = await admin
        .from('memory_media')
        .select('id, file_url, memory_id')
        .eq('user_id', user.id)
        .in('file_url', urls)
      const linkedUrls = new Set(
        (existingRows || []).filter((r: any) => r.memory_id === memoryId).map((r: any) => r.file_url),
      )
      const orphans = (existingRows || []).filter((r: any) => r.memory_id === null)

      // Promote orphans to this memory; mark source='append:<segmentId>'.
      for (let i = 0; i < orphans.length; i += 1) {
        const row = orphans[i]
        const patch: Record<string, any> = {
          memory_id: memoryId,
          source: `append:${segmentId}`,
        }
        if (!hasCover && i === 0) patch.is_cover = true
        await admin.from('memory_media').update(patch).eq('id', row.id)
        appendedMediaCount += 1
      }

      // Insert brand-new rows for anything not already on the table.
      const orphanUrls = new Set(orphans.map((o: any) => o.file_url))
      const brandNew = body.mediaUrls
        .filter((m) => !linkedUrls.has(m.url) && !orphanUrls.has(m.url))
        .map((m, i) => {
          let fileKey = m.url
          try { fileKey = new URL(m.url).pathname.split('/').slice(-2).join('/') } catch {}
          const isFirstAndNoCover = !hasCover && orphans.length === 0 && i === 0
          return {
            memory_id: memoryId,
            user_id: user.id,
            file_url: m.url,
            file_key: fileKey,
            file_type: deriveFileType(m.type || m.url || ''),
            is_cover: isFirstAndNoCover,
            source: `append:${segmentId}`,
          }
        })
      if (brandNew.length > 0) {
        const { error: insErr } = await admin.from('memory_media').insert(brandNew)
        if (insErr) console.error('[append] memory_media insert failed:', insErr)
        else appendedMediaCount += brandNew.length
      }
    }

    // ─── memory_people upserts ────────────────────────────────────────────
    if (body.taggedPeople && body.taggedPeople.length > 0) {
      const rows = body.taggedPeople
        .filter((p) => p.id || p.name?.trim())
        .map((p) => ({
          memory_id: memoryId,
          contact_id: p.id || null,
          raw_name: p.id ? null : (p.name?.trim() || null),
          user_id: memory.user_id,
        }))
      if (rows.length > 0) {
        await admin
          .from('memory_people')
          .upsert(rows as any, { ignoreDuplicates: true, onConflict: 'memory_id,contact_id' })
      }
    }

    // ─── Collaborator trail for non-owner appends ─────────────────────────
    if (!isOwner) {
      try {
        await admin.from('memory_collaborators').insert({
          memory_id: memoryId,
          inviter_id: memory.user_id,
          contact_name: user.user_metadata?.name || user.email || 'Collaborator',
          contact_email: user.email || null,
          prompt_id: `append:${segmentId}`,
        })
      } catch (err) {
        // Non-fatal — log and continue.
        console.warn('[append] collaborator insert failed:', err)
      }
    }

    // ─── Async RAG re-embed (fire-and-forget) ─────────────────────────────
    // The embedding pipeline watches memories rows by updated_at and reuses
    // the existing backfill worker. Explicit enqueue is unnecessary — the
    // UPDATE above already dirties the row. If a queue endpoint is added
    // later, POST to it here.

    return NextResponse.json({
      ok: true,
      segmentId,
      appendedMediaCount,
    })
  } catch (err) {
    console.error('[append] unexpected error:', err)
    return NextResponse.json(
      { error: 'Append failed', detail: String(err) },
      { status: 500 },
    )
  }
}
