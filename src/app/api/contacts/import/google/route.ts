import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  fetchGoogleContacts,
  normalizeGoogleContact,
  downloadImageAsBase64,
} from '@/lib/oauth/google'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/**
 * GET /api/contacts/import/google
 * 
 * Query Parameters:
 * - code: Authorization code from Google OAuth callback
 * - state: State parameter for CSRF protection
 * - code_verifier: PKCE code verifier
 * 
 * Returns: Normalized contact data from Google People API
 */
export async function GET(request: NextRequest) {
  // Check if environment is configured
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { 
        error: 'Google OAuth not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. See setup instructions at https://console.cloud.google.com/',
        setupRequired: true 
      },
      { status: 503 }
    )
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please sign in to import contacts' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const codeVerifier = searchParams.get('code_verifier')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return NextResponse.json(
      { error: 'OAuth error', message: error },
      { status: 400 }
    )
  }

  // Validate state parameter for CSRF protection when code is present
  if (code && !state) {
    return NextResponse.json(
      { error: 'Missing state', message: 'State parameter is required for security' },
      { status: 400 }
    )
  }

  // Validate required parameters
  if (!code) {
    // Return auth URL for client to redirect
    // Use the popup callback page for better UX
    const redirectUri = `${request.nextUrl.origin}/auth/google-callback`
    
    // Accept code_challenge and state from client (generated with PKCE)
    const clientCodeChallenge = searchParams.get('code_challenge')
    const clientState = searchParams.get('state')
    
    if (!clientCodeChallenge) {
      return NextResponse.json(
        { error: 'Missing code_challenge', message: 'PKCE code_challenge is required' },
        { status: 400 }
      )
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')
    authUrl.searchParams.set('state', clientState || crypto.randomUUID())
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('code_challenge', clientCodeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state: clientState,
    })
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: 'Missing code_verifier', message: 'PKCE code verifier is required' },
      { status: 400 }
    )
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${request.nextUrl.origin}/auth/google-callback`
    console.log('[Google Import] Exchanging code for tokens with redirect URI:', redirectUri)
    
    let tokens
    try {
      tokens = await exchangeCodeForTokens({
        code,
        clientId: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        redirectUri,
        codeVerifier,
      })
      console.log('[Google Import] Token exchange successful')
    } catch (tokenError) {
      console.error('[Google Import] Token exchange failed:', tokenError)
      return NextResponse.json(
        { 
          error: 'Token exchange failed', 
          message: tokenError instanceof Error ? tokenError.message : 'Failed to exchange authorization code'
        },
        { status: 400 }
      )
    }

    // Fetch all contacts from Google
    const allContacts: Awaited<ReturnType<typeof fetchGoogleContacts>>['connections'] = []
    let pageToken: string | undefined
    let hasMore = true
    let pageCount = 0
    const maxPages = 10 // Safety limit

    try {
      while (hasMore && pageCount < maxPages) {
        const result = await fetchGoogleContacts(tokens.access_token, {
          pageSize: 100,
          pageToken,
        })

        allContacts.push(...result.connections)
        pageToken = result.nextPageToken
        hasMore = !!pageToken
        pageCount++
      }
      console.log(`[Google Import] Fetched ${allContacts.length} contacts from Google`)
    } catch (fetchError) {
      console.error('[Google Import] Failed to fetch contacts:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch contacts', 
          message: fetchError instanceof Error ? fetchError.message : 'Could not retrieve contacts from Google'
        },
        { status: 500 }
      )
    }

    // Normalize contacts
    const normalizedContacts = allContacts.map(normalizeGoogleContact)

    // Filter out contacts without meaningful data
    const validContacts = normalizedContacts.filter(c => 
      c.fullName && (c.email || c.phone)
    )

    // Get user's existing contacts to detect duplicates
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('email, phone, full_name')
      .eq('user_id', user.id)

    const existingEmails = new Set(existingContacts?.map(c => c.email?.toLowerCase()).filter(Boolean) || [])
    const existingPhones = new Set(existingContacts?.map(c => c.phone?.replace(/\D/g, '')).filter(Boolean) || [])

    // Mark potential duplicates
    const contactsWithDupCheck = validContacts.map(contact => ({
      ...contact,
      isDuplicate: contact.email && existingEmails.has(contact.email.toLowerCase()) ||
                   contact.phone && existingPhones.has(contact.phone.replace(/\D/g, '')),
    }))

    return NextResponse.json({
      success: true,
      contacts: contactsWithDupCheck,
      totalFetched: allContacts.length,
      validCount: validContacts.length,
      duplicateCount: contactsWithDupCheck.filter(c => c.isDuplicate).length,
      googleAccount: {
        hasRefreshToken: !!tokens.refresh_token,
      },
    })

  } catch (error) {
    console.error('Google contacts import error:', error)
    return NextResponse.json(
      { 
        error: 'Import failed', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts/import/google
 * 
 * Save selected Google contacts to the database
 * 
 * Body: {
 *   contacts: NormalizedContact[]
 *   defaultRelationship?: string
 * }
 * 
 * Returns: Import results
 */
export async function POST(request: NextRequest) {
  // Check if environment is configured
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { 
        error: 'Google OAuth not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
        setupRequired: true 
      },
      { status: 503 }
    )
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please sign in to import contacts' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { contacts, defaultRelationship = 'other' } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Contacts array is required' },
        { status: 400 }
      )
    }

    // Limit batch size
    const batchSize = 50
    const contactsToImport = contacts.slice(0, batchSize)

    // Upload avatars to Supabase Storage and get URLs
    const contactsWithAvatars = await Promise.all(
      contactsToImport.map(async (contact) => {
        if (!contact.avatarUrl) return contact

        try {
          // Download image
          const base64Image = await downloadImageAsBase64(contact.avatarUrl)
          if (!base64Image) return contact

          // Extract mime type and data
          const match = base64Image.match(/^data:(.+);base64,(.+)$/)
          if (!match) return contact

          const [, mimeType, base64Data] = match
          const extension = mimeType.split('/')[1] || 'jpg'
          const fileName = `${user.id}/google-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, Buffer.from(base64Data, 'base64'), {
              contentType: mimeType,
              upsert: false,
            })

          if (uploadError) {
            console.error('Avatar upload error:', uploadError)
            return contact
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

          return { ...contact, avatarUrl: publicUrl }
        } catch (error) {
          console.error('Failed to process avatar:', error)
          return contact
        }
      })
    )

    // Prepare contacts for insert
    const contactsToInsert = contactsWithAvatars.map(contact => ({
      user_id: user.id,
      full_name: contact.fullName,
      email: contact.email || null,
      phone: contact.phone || null,
      avatar_url: contact.avatarUrl || null,
      relationship_type: defaultRelationship,
      address: contact.address || null,
      city: contact.city || null,
      state: contact.state || null,
      country: contact.country || null,
      zipcode: contact.zipcode || null,
      date_of_birth: contact.birthDate || null,
      notes: contact.notes || null,
      // Track source for future reference
      metadata: {
        source: 'google_import',
        source_id: contact.sourceId,
        imported_at: new Date().toISOString(),
      },
    }))

    // Insert contacts
    const { data: insertedContacts, error: insertError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select('id, full_name, email')

    if (insertError) {
      console.error('Contact insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save contacts', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: insertedContacts?.length || 0,
      contacts: insertedContacts,
    })

  } catch (error) {
    console.error('Contact save error:', error)
    return NextResponse.json(
      { 
        error: 'Save failed', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
