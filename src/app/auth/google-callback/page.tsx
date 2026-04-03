/**
 * OAuth Popup Callback Handler
 * 
 * This page handles the OAuth redirect from Google when using popup mode.
 * It receives the authorization code and posts it to the parent window.
 */

'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function GoogleOAuthCallbackContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (window.opener) {
      if (error) {
        window.opener.postMessage(
          { 
            type: 'GOOGLE_OAUTH_ERROR', 
            error: errorDescription || error 
          },
          window.location.origin
        )
      } else if (code && state) {
        window.opener.postMessage(
          { 
            type: 'GOOGLE_OAUTH_CALLBACK', 
            code, 
            state 
          },
          window.location.origin
        )
      }
      // Close popup after a short delay
      setTimeout(() => window.close(), 100)
    } else {
      // Not in popup - might be a direct navigation
      console.warn('OAuth callback: not in popup context')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2D5A3D] mx-auto mb-4" />
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}

export default function GoogleOAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2D5A3D] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <GoogleOAuthCallbackContent />
    </Suspense>
  )
}
