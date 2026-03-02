'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="home-background" />
      
      {/* Animated blobs */}
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      <div className="home-blob home-blob-3" />
      <div className="home-blob home-blob-4" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2d2d2d] mb-1 tracking-wider">YOURS</h1>
          <p className="text-2xl text-[#406A56] font-script italic -mt-1" style={{ fontFamily: 'Georgia, serif' }}>Truly</p>
          <p className="text-[#406A56]/70 mt-2">Document your life. Connect generations.</p>
        </div>

        {/* Glass card */}
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-6">Welcome back</h2>

          {/* Live region for error announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {error}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/40 focus:border-[#406A56] transition-all"
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Password <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/40 focus:border-[#406A56] transition-all"
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#406A56] focus:ring-[#406A56]" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-[#406A56] hover:text-[#355a48] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div id="login-error" role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#406A56] hover:bg-[#355a48] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#406A56] hover:text-[#355a48] font-semibold">
              Get started free
            </Link>
          </p>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Your memories are encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  );
}
