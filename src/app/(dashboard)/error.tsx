'use client'

import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-[#1A1F1C] mb-2">We hit a bump</h1>
        <p className="text-[#5A6660] mb-6">
          Something went wrong loading your dashboard. Your memories are safe.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-[#DDE3DF] hover:border-[#2D5A3D] text-[#1A1F1C] rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
