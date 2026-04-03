import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#2D5A3D]/30 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-[#1A1F1C] mb-2">Page not found</h2>
        <p className="text-[#5A6660] mb-6">
          This page doesn&apos;t exist, but your stories live on.
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
