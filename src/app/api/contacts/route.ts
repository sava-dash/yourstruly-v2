import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('contacts')
    .select('id, full_name, nickname, email, phone, relationship_type, date_of_birth')
    .eq('user_id', user.id)
    .order('full_name')
    .limit(limit)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,nickname.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: contacts, error } = await query

  if (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 })
  }

  // Map to expected format
  const mappedContacts = contacts?.map(c => ({
    id: c.id,
    name: c.full_name,
    nickname: c.nickname,
    email: c.email,
    phone: c.phone,
    relationship_type: c.relationship_type,
    date_of_birth: c.date_of_birth
  })) || []

  return NextResponse.json({ contacts: mappedContacts })
}
