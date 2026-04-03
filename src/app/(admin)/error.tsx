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
        <h1 className="text-xl font-semibold text-red-300 mb-2">Admin Error</h1>
        <p className="text-neutral-400 mb-6">Something went wrong in the admin panel.</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
