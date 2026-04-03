'use client'

import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-amber-100 mb-2">Authentication Error</h1>
        <p className="text-neutral-400 mb-6">Something went wrong. Please try signing in again.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/login"
            className="px-5 py-2.5 border border-neutral-700 hover:border-neutral-500 text-neutral-300 rounded-lg font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
