import 'mapbox-gl/dist/mapbox-gl.css'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import VoiceFAB from '@/components/VoiceFAB'
import { DashboardTourProvider } from '@/components/dashboard/DashboardTour'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get profile for nav
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <DashboardTourProvider>
      <div className="min-h-screen relative">
        <TopNav user={user} profile={profile} />
        <main id="main-content" className="pt-14 pb-16 lg:pb-0" role="main">
          {children}
        </main>
        <BottomNav />
        <VoiceFAB />
      </div>
    </DashboardTourProvider>
  )
}
