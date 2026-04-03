'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-[#1A1F1C] mb-2">Admin Error</h1>
        <p className="text-[#5A6660] mb-6">Something went wrong in the admin panel.</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
