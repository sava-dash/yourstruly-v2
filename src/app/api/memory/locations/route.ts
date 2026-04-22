import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Location suggestions for the synopsis "Where" autocomplete.
 * Returns the user's distinct recent memory locations, sorted by recency.
 *
 * Query: ?q=partial (optional — prefix filter)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ suggestions: [] })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()

    let query = supabase
      .from('memories')
      .select('location_name, memory_date')
      .eq('user_id', user.id)
      .not('location_name', 'is', null)
      .order('memory_date', { ascending: false, nullsFirst: false })
      .limit(60)

    if (q) query = query.ilike('location_name', `%${q}%`)

    const { data } = await query

    const seen = new Set<string>()
    const suggestions: string[] = []
    for (const row of data || []) {
      const name = (row.location_name || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      suggestions.push(name)
      if (suggestions.length >= 8) break
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[memory/locations] error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
