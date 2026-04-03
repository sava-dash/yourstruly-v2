import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/admin/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-auth/login');
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF7] via-[#F5EDE5] to-[#FAFAF7]" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-[#2D5A3D]/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-[#B8562E]/5 to-transparent" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <AdminSidebar admin={admin} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader admin={admin} />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
