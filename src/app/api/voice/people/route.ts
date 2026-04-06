import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ResolvedPerson {
  name: string               // name as spoken
  contactId: string | null   // matched contact id, or null if new
  contactName: string | null // matched contact's full_name
  relationship: string | null
  isNew: boolean             // true if no existing contact matched
}

/**
 * POST /api/voice/people
 *
 * Takes an array of people names (from voice extraction) and resolves them
 * against the user's contacts. Returns matched contacts and flags unmatched
 * names as new.
 *
 * Body: { names: string[] }
 * Returns: { resolved: ResolvedPerson[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { names } = body

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ resolved: [] })
    }

    // Fetch all user contacts for matching
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, nickname, relationship_type')
      .eq('user_id', user.id)

    const allContacts = contacts || []

    const resolved: ResolvedPerson[] = names.map((spokenName: string) => {
      const nameLower = spokenName.toLowerCase().trim()

      // Try exact match on full_name or nickname
      const exactMatch = allContacts.find(c =>
        c.full_name?.toLowerCase() === nameLower ||
        c.nickname?.toLowerCase() === nameLower
      )
      if (exactMatch) {
        return {
          name: spokenName,
          contactId: exactMatch.id,
          contactName: exactMatch.full_name,
          relationship: exactMatch.relationship_type,
          isNew: false,
        }
      }

      // Try first-name match (spoken "Billy" matches contact "Billy Smith")
      const firstNameMatch = allContacts.find(c => {
        const firstName = c.full_name?.split(' ')[0]?.toLowerCase()
        const nick = c.nickname?.toLowerCase()
        return firstName === nameLower || nick === nameLower
      })
      if (firstNameMatch) {
        return {
          name: spokenName,
          contactId: firstNameMatch.id,
          contactName: firstNameMatch.full_name,
          relationship: firstNameMatch.relationship_type,
          isNew: false,
        }
      }

      // Try relationship match ("Mom" → relationship_type = "mother")
      const relationshipMap: Record<string, string> = {
        'mom': 'mother', 'mama': 'mother', 'ma': 'mother', 'mommy': 'mother',
        'dad': 'father', 'papa': 'father', 'pa': 'father', 'daddy': 'father',
        'grandma': 'grandmother', 'nana': 'grandmother', 'granny': 'grandmother', 'gram': 'grandmother',
        'grandpa': 'grandfather', 'granddad': 'grandfather', 'gramps': 'grandfather',
        'wife': 'spouse', 'husband': 'spouse', 'hubby': 'spouse',
        'bro': 'brother', 'sis': 'sister',
      }
      const mappedRelationship = relationshipMap[nameLower]
      if (mappedRelationship) {
        const relMatch = allContacts.find(c =>
          c.relationship_type?.toLowerCase() === mappedRelationship
        )
        if (relMatch) {
          return {
            name: spokenName,
            contactId: relMatch.id,
            contactName: relMatch.full_name,
            relationship: relMatch.relationship_type,
            isNew: false,
          }
        }
      }

      // Try partial/fuzzy match (spoken "Billy" contains in "Billy Bob")
      const partialMatch = allContacts.find(c =>
        c.full_name?.toLowerCase().includes(nameLower) ||
        nameLower.includes(c.full_name?.split(' ')[0]?.toLowerCase() || '___')
      )
      if (partialMatch) {
        return {
          name: spokenName,
          contactId: partialMatch.id,
          contactName: partialMatch.full_name,
          relationship: partialMatch.relationship_type,
          isNew: false,
        }
      }

      // No match — this is a new person
      return {
        name: spokenName,
        contactId: null,
        contactName: null,
        relationship: null,
        isNew: true,
      }
    })

    return NextResponse.json({ resolved })
  } catch (error) {
    console.error('Voice people resolve error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve people' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/voice/people
 *
 * Creates a new contact from voice input.
 * Body: { name: string, relationship?: string }
 * Returns: { contact: { id, full_name, relationship_type } }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, relationship } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        full_name: name.trim(),
        relationship_type: relationship || 'other',
      })
      .select('id, full_name, relationship_type')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Voice people create error:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
