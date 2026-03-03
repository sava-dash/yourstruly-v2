/**
 * Google OAuth 2.0 Flow for Google People API
 * 
 * This module handles the OAuth 2.0 PKCE flow for accessing Google Contacts.
 * Required scopes: contacts.readonly, userinfo.email, userinfo.profile
 * 
 * Environment Variables Required:
 * - GOOGLE_CLIENT_ID: From Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: From Google Cloud Console
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google People API
 * 4. Create OAuth 2.0 credentials (Web application type)
 * 5. Add authorized redirect URIs:
 *    - http://localhost:3000/api/contacts/import/google (development)
 *    - https://yourdomain.com/api/contacts/import/google (production)
 * 6. Copy Client ID and Client Secret to .env.local
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_PEOPLE_API_BASE = 'https://people.googleapis.com/v1'

// OAuth Scopes needed for Google Contacts import
export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE() {
  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)
  return { verifier, challenge }
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

function generateCodeChallenge(verifier: string): string {
  // In browser environment, we use the verifier directly
  // The challenge is calculated server-side or passed through
  return verifier
}

function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate a secure random state parameter
 */
export function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

/**
 * Build Google OAuth authorization URL
 */
export function buildAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  codeChallengeMethod?: string
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '))
  url.searchParams.set('state', params.state)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', params.codeChallengeMethod || 'S256')
  
  return url.toString()
}

/**
 * Server-side: Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  codeVerifier: string
}): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Token exchange failed: ${errorText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error_description) {
        errorMessage = `Google OAuth error: ${errorJson.error_description}`
      } else if (errorJson.error) {
        errorMessage = `Google OAuth error: ${errorJson.error}`
      }
    } catch {
      // Use raw error text if not JSON
    }
    
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * Server-side: Refresh access token
 */
export async function refreshAccessToken(params: {
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<{
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

/**
 * Server-side: Fetch Google user profile
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<{
  id: string
  email: string
  name: string
  picture?: string
}> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile')
  }

  return response.json()
}

/**
 * Google Contact interface
 */
export interface GoogleContact {
  resourceName: string
  etag: string
  names?: Array<{
    displayName: string
    familyName?: string
    givenName?: string
    middleName?: string
  }>
  emailAddresses?: Array<{
    value: string
    type?: string
    formattedType?: string
  }>
  phoneNumbers?: Array<{
    value: string
    type?: string
    formattedType?: string
  }>
  photos?: Array<{
    url: string
    default?: boolean
  }>
  addresses?: Array<{
    formattedValue?: string
    type?: string
    city?: string
    region?: string
    country?: string
    postalCode?: string
  }>
  birthdays?: Array<{
    date?: {
      year?: number
      month: number
      day: number
    }
  }>
  organizations?: Array<{
    name?: string
    title?: string
  }>
  biographies?: Array<{
    value: string
  }>
}

/**
 * Server-side: Fetch contacts from Google People API
 */
export async function fetchGoogleContacts(
  accessToken: string,
  options: {
    pageSize?: number
    pageToken?: string
    personFields?: string
  } = {}
): Promise<{
  connections: GoogleContact[]
  nextPageToken?: string
  totalPeopleCount?: number
}> {
  const { pageSize = 100, pageToken, personFields = 'names,emailAddresses,phoneNumbers,photos,addresses,birthdays,organizations,biographies' } = options

  const url = new URL(`${GOOGLE_PEOPLE_API_BASE}/people/me/connections`)
  url.searchParams.set('personFields', personFields)
  url.searchParams.set('pageSize', pageSize.toString())
  url.searchParams.set('sortOrder', 'LAST_MODIFIED_DESCENDING')
  
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken)
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Failed to fetch contacts: ${errorText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMessage = `Google API error: ${errorJson.error.message}`
      } else if (errorJson.error_description) {
        errorMessage = `Google API error: ${errorJson.error_description}`
      }
    } catch {
      // Use raw error text if not JSON
    }
    
    throw new Error(errorMessage)
  }

  const data = await response.json()
  
  return {
    connections: data.connections || [],
    nextPageToken: data.nextPageToken,
    totalPeopleCount: data.totalPeopleCount,
  }
}

/**
 * Normalized contact for YoursTruly
 */
export interface NormalizedContact {
  sourceId: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  avatarUrl?: string
  address?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  birthDate?: string // YYYY-MM-DD format
  organization?: string
  jobTitle?: string
  notes?: string
}

/**
 * Map Google Contact to YoursTruly contact format
 */
export function normalizeGoogleContact(contact: GoogleContact): NormalizedContact {
  const name = contact.names?.[0]
  const email = contact.emailAddresses?.[0]
  const phone = contact.phoneNumbers?.[0]
  const photo = contact.photos?.[0]
  const address = contact.addresses?.[0]
  const birthday = contact.birthdays?.[0]?.date
  const org = contact.organizations?.[0]
  const bio = contact.biographies?.[0]

  // Format birthdate as YYYY-MM-DD
  let birthDate: string | undefined
  if (birthday) {
    const year = birthday.year || new Date().getFullYear() // Use current year if not specified
    const month = String(birthday.month).padStart(2, '0')
    const day = String(birthday.day).padStart(2, '0')
    birthDate = `${year}-${month}-${day}`
  }

  return {
    sourceId: contact.resourceName,
    fullName: name?.displayName || 'Unknown',
    firstName: name?.givenName,
    lastName: name?.familyName,
    email: email?.value,
    phone: phone?.value,
    avatarUrl: photo?.url,
    address: address?.formattedValue,
    city: address?.city,
    state: address?.region,
    country: address?.country,
    zipcode: address?.postalCode,
    birthDate,
    organization: org?.name,
    jobTitle: org?.title,
    notes: bio?.value,
  }
}

/**
 * Download image from URL and convert to base64
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null
    
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = blob.type || 'image/jpeg'
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Failed to download image:', error)
    return null
  }
}
