'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const supabase = createClient();

  const handleResend = async () => {
    if (!email) return;
    
    setResending(true);
    await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] relative overflow-hidden flex items-center justify-center p-4">
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/images/logo-yours.png" 
            alt="YoursTruly" 
            className="h-20 w-auto mx-auto mb-2"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50 text-center">
          <div className="w-20 h-20 bg-[#C4A235]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#C4A235]" />
          </div>

          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-3">Verify your email</h2>
          
          <p className="text-gray-600 mb-2">
            We&apos;ve sent a verification link to
          </p>
          <p className="font-semibold text-[#2D5A3D] mb-6">
            {email || 'your email address'}
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Click the link in the email to complete your registration. 
            If you don&apos;t see it, check your spam folder.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={resending || resent || !email}
              className="w-full py-3 bg-[#2D5A3D]/10 text-[#2D5A3D] font-semibold rounded-xl hover:bg-[#2D5A3D]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resending...
                </>
              ) : resent ? (
                'Email resent!'
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resend verification email
                </>
              )}
            </button>

            <a
              href="/login"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#2D5A3D] font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
