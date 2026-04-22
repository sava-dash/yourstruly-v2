import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Create a new contact from a synopsis suggestion. Called when the user
 * taps "Add" on a person the AI extracted from a memory transcript.
 *
 * Body: { name: string, relation?: string | null, memoryId?: string | null }
 * Returns: { contactId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
    const relation = typeof body.relation === 'string' && body.relation.trim() ? body.relation.trim().slice(0, 40) : null
    const memoryId = typeof body.memoryId === 'string' ? body.memoryId : null

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    // Soft-dedup: if a contact with the same full_name already exists for
    // this user, reuse it. Mirrors the AddContactModal behavior.
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .ilike('full_name', name)
      .limit(1)
      .maybeSingle()

    let contactId: string | null = existing?.id || null
    if (!contactId) {
      const payload: Record<string, any> = {
        user_id: user.id,
        full_name: name,
      }
      if (relation) payload.relationship_type = relation
      const { data: inserted, error } = await supabase
        .from('contacts')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        console.error('[memory/contact] insert failed:', error)
        return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
      }
      contactId = inserted.id
    } else if (relation) {
      // Existing contact with no relationship_type — backfill with the detected one.
      await supabase
        .from('contacts')
        .update({ relationship_type: relation })
        .eq('id', contactId)
        .is('relationship_type', null)
    }

    // Link to the memory so "Who was there" on the memory detail shows them.
    if (memoryId && contactId) {
      await supabase
        .from('memory_people')
        .upsert(
          [{ memory_id: memoryId, contact_id: contactId, user_id: user.id }] as any,
          { ignoreDuplicates: true, onConflict: 'memory_id,contact_id' },
        )
    }

    return NextResponse.json({ contactId })
  } catch (err) {
    console.error('[memory/contact] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
