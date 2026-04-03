export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#94A09A] text-sm">Gathering your stories...</p>
      </div>
    </div>
  )
}
