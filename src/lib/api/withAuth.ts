import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: User; supabase: SupabaseClient }
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest) => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(request, { user, supabase })
  }
}
