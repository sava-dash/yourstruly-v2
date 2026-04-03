import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-amber-100 mb-2">Page not found</h1>
        <p className="text-neutral-400 mb-6">
          This dashboard page doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
