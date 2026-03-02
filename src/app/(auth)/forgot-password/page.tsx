'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
    } else {
      setSubmitted(true);
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden flex items-center justify-center p-4">
        <div className="home-background" />
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#2d2d2d] mb-1 tracking-wider">YOURS</h1>
            <p className="text-2xl text-[#406A56] font-script italic -mt-1" style={{ fontFamily: 'Georgia, serif' }}>Truly</p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50 text-center">
            <div className="w-16 h-16 bg-[#406A56]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#406A56]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#406A56] hover:text-[#355a48] font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden flex items-center justify-center p-4">
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2d2d2d] mb-1 tracking-wider">YOURS</h1>
          <p className="text-2xl text-[#406A56] font-script italic -mt-1" style={{ fontFamily: 'Georgia, serif' }}>Truly</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#406A56] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-2">Reset your password</h2>
          <p className="text-gray-600 mb-6">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {/* Live region for error announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {error}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-[#406A56]/20 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]/40 transition-all"
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "forgot-error" : undefined}
                />
              </div>
            </div>

            {error && (
              <div id="forgot-error" role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#406A56] hover:bg-[#355a48] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
