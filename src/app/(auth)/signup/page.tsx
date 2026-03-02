'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else if (data.user?.identities?.length === 0) {
      setError('An account with this email already exists. Please sign in instead.');
      setLoading(false);
    } else {
      if (data.session) {
        router.push('/onboarding');
      } else {
        router.push('/verify-email?email=' + encodeURIComponent(email));
      }
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 4;
    return 3;
  };

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-[#406A56]'];
  const currentStrength = passwordStrength();

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
          <p className="text-[#406A56]/70 mt-2">Start documenting your legacy today.</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-6">Create your account</h2>

          {/* Live region for error announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {error}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-fullname" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Full Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="signup-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/40 focus:border-[#406A56] transition-all"
                  placeholder="John Doe"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/40 focus:border-[#406A56] transition-all"
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? "signup-error" : undefined}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Password <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#406A56]/40 focus:border-[#406A56] transition-all"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={password.length > 0 ? "password-strength signup-error" : error ? "signup-error" : undefined}
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
              
              {password.length > 0 && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1 h-1" role="progressbar" aria-valuenow={currentStrength} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full ${
                          level <= currentStrength ? strengthColors[currentStrength] : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p id="password-strength" className={`text-xs mt-1 ${currentStrength >= 3 ? 'text-[#406A56]' : 'text-gray-400'}`}>
                    Password strength: {strengthLabels[currentStrength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  id="signup-terms"
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#406A56] focus:ring-[#406A56]"
                  aria-required="true"
                  aria-invalid={!agreedToTerms && !!error}
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#406A56] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#406A56] hover:underline">Privacy Policy</Link>
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </span>
              </label>
            </div>

            {error && (
              <div id="signup-error" role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#406A56] hover:text-[#355a48] font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Free tier benefits */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Free forever plan includes:</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#406A56]" /> 50 memories
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#406A56]" /> 1 GB storage
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#406A56]" /> 3 AI interviews
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
