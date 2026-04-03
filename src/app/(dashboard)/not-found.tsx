import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-[#1A1F1C] mb-2">Page not found</h1>
        <p className="text-[#5A6660] mb-6">
          This dashboard page doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
