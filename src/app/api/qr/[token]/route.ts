import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/qr/[token]
 * Validate QR token and return memory/wisdom content if authorized
 * This is a public endpoint that can be accessed without authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { token } = await params
  
  // Get user's session if they're logged in
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  
  // Get contact email from query params (for non-logged in users)
  const searchParams = request.nextUrl.searchParams
  const contactEmail = searchParams.get('email')
  
  try {
    // Check if token exists and get access info using our helper function
    const { data: accessCheck, error: accessError } = await supabase.rpc(
      'can_access_qr_token',
      {
        p_token: token,
        p_user_id: userId,
        p_contact_email: contactEmail
      }
    )
    
    if (accessError) {
      console.error('QR access check error:', accessError)
      return NextResponse.json(
        { error: 'Failed to validate token' },
        { status: 500 }
      )
    }
    
    // If no results, try backwards-compat fallback: older photobooks encoded
    // raw memory/wisdom UUIDs in their QR codes before the share-token system
    // existed. Resolve those as a last resort.
    if (!accessCheck || accessCheck.length === 0) {
      const fallback = await resolveLegacyIdFallback(supabase, token)
      if (fallback) {
        return NextResponse.json({
          access: 'granted',
          contentType: fallback.contentType,
          content: fallback.content,
          sharedBy: fallback.sharedBy,
          viewer: { isLoggedIn: !!userId, userId: userId || null },
          legacyFallback: true,
        })
      }
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    const access = accessCheck[0]
    
    // Log the access attempt
    await supabase.from('qr_access_logs').insert({
      token_id: access.token_id,
      user_id: userId,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      was_granted: access.can_access,
      denial_reason: access.denial_reason
    })
    
    if (!access.can_access) {
      // Normalize 'Token revoked' -> 'revoked' so the viewer can show the
      // author-friendly "removed by the author" copy.
      const normalizedReason =
        access.denial_reason === 'Token revoked'
          ? 'revoked'
          : access.denial_reason
      return NextResponse.json(
        {
          error: 'Access Denied',
          reason: normalizedReason,
          message: getDenialMessage(access.denial_reason),
        },
        { status: 403 }
      )
    }
    
    // Increment view count
    await supabase.rpc('increment_qr_token_view_count', { p_token: token })
    
    // Fetch content based on what's linked to the token
    let content: any = null
    let contentType: 'memory' | 'wisdom' | null = null
    let ownerProfile: any = null
    
    // Get the token details
    const { data: tokenData } = await supabase
      .from('qr_access_tokens')
      .select('*, profiles:created_by_user_id(full_name, avatar_url)')
      .eq('token', token)
      .single()
    
    ownerProfile = tokenData?.profiles
    
    if (access.memory_id) {
      // Fetch memory with media
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .select(`
          *,
          memory_media (
            id,
            file_url,
            file_type,
            is_cover,
            width,
            height,
            duration
          ),
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('id', access.memory_id)
        .single()
      
      if (memoryError || !memory) {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        )
      }
      
      content = memory
      contentType = 'memory'
    } else if (access.wisdom_id) {
      // Fetch wisdom entry
      const { data: wisdom, error: wisdomError } = await supabase
        .from('wisdom_entries')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('id', access.wisdom_id)
        .single()
      
      if (wisdomError || !wisdom) {
        return NextResponse.json(
          { error: 'Wisdom entry not found' },
          { status: 404 }
        )
      }
      
      content = wisdom
      contentType = 'wisdom'
    }
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      access: 'granted',
      contentType,
      content,
      sharedBy: ownerProfile,
      viewer: {
        isLoggedIn: !!userId,
        userId: userId || null
      }
    })
    
  } catch (error) {
    console.error('QR token validation error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * Backwards-compat: older photobooks printed `/view/{memoryId}` or
 * `/view/wisdom/{wisdomId}` directly. When such a raw UUID hits this endpoint
 * (the new viewer normalises those to `/view/{token}`), try resolving against
 * the `memories` and `wisdom_entries` tables. Public read only — anyone who
 * scans the printed book already had physical access to it.
 */
async function resolveLegacyIdFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  maybeId: string
): Promise<
  | {
      contentType: 'memory' | 'wisdom'
      content: unknown
      sharedBy: { full_name: string; avatar_url?: string } | null
    }
  | null
> {
  // Only attempt UUID lookups — protects against SQL/regex oddities.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(maybeId)) return null

  const { data: memory } = await supabase
    .from('memories')
    .select(
      `
      *,
      memory_media (id, file_url, file_type, is_cover, width, height, duration),
      profiles:user_id (full_name, avatar_url)
    `
    )
    .eq('id', maybeId)
    .maybeSingle()

  if (memory) {
    return {
      contentType: 'memory',
      content: memory,
      sharedBy: (memory as { profiles?: { full_name: string; avatar_url?: string } })
        .profiles || null,
    }
  }

  const { data: wisdom } = await supabase
    .from('wisdom_entries')
    .select(`*, profiles:user_id (full_name, avatar_url)`)
    .eq('id', maybeId)
    .maybeSingle()

  if (wisdom) {
    return {
      contentType: 'wisdom',
      content: wisdom,
      sharedBy: (wisdom as { profiles?: { full_name: string; avatar_url?: string } })
        .profiles || null,
    }
  }

  return null
}

function getDenialMessage(reason: string | null): string {
  switch (reason) {
    case 'Token not found':
      return 'This QR code link is invalid or has been removed.'
    case 'Token revoked':
      return 'This memory has been removed by the author.'
    case 'Token expired':
      return 'This QR code has expired. Please ask the owner to create a new one.'
    case 'Max views reached':
      return 'This QR code has reached its maximum number of views.'
    case 'Not authorized':
      return 'You do not have permission to view this content. This memory was shared with specific people.'
    default:
      return 'Access denied. Please contact the person who shared this with you.'
  }
}
