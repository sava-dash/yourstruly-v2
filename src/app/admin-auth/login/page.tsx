import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  
  // Check if already logged in as admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Check if user is an admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();
    
    if (adminUser) {
      redirect(params.redirect || '/admin');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAF7]">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF7] via-[#F5EDE5] to-[#FAFAF7]" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-[#2D5A3D]/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-[#B8562E]/5 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D5A3D] to-[#4A3552] flex items-center justify-center mx-auto mb-4 shadow-xl">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">YoursTruly Admin</h1>
          <p className="text-[#2a1f1a]/60 mt-1">Sign in to access the admin portal</p>
        </div>

        {/* Login Form */}
        <div className="glass-modal p-8">
          {params.error && (
            <div className="mb-6 p-4 rounded-xl bg-[#B8562E]/10 border border-[#B8562E]/20 text-[#B8562E] text-sm">
              {params.error === 'access_denied' 
                ? 'You do not have admin access.' 
                : params.error === 'invalid_credentials'
                ? 'Invalid email or password.'
                : 'An error occurred. Please try again.'}
            </div>
          )}

          <AdminLoginForm redirect={params.redirect} />
        </div>

        <p className="text-center text-sm text-[#2a1f1a]/40 mt-6">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
