'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, Check, X } from 'lucide-react';
import { validatePassword, type PasswordValidationResult } from '@/lib/auth/password';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validation = useMemo<PasswordValidationResult>(() => {
    return validatePassword(password);
  }, [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (!validation.isValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim().replace(/\b\w/g, c => c.toUpperCase()),
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
        // Hard navigation ensures auth cookies are fully set before middleware runs
        // router.push can race with cookie writes, causing infinite spinner
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/verify-email?email=' + encodeURIComponent(email);
      }
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const { requirements, strength } = validation;

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4 relative overflow-hidden">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/images/logo-yours.png" 
            alt="YoursTruly" 
            className="h-20 w-auto mx-auto mb-2"
          />
          <p className="text-[#2D5A3D]/70 mt-2">Live on.</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-6">Create your account</h2>

          {/* Live region for error announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {error}
          </div>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-gray-300 shadow-sm hover:shadow-md mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with email</span>
            </div>
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/40 focus:border-[#2D5A3D] transition-all"
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/40 focus:border-[#2D5A3D] transition-all"
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!showRequirements && e.target.value.length > 0) {
                      setShowRequirements(true);
                    }
                  }}
                  onFocus={() => setShowRequirements(true)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-gray-200 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/40 focus:border-[#2D5A3D] transition-all"
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  aria-invalid={!!error || (password.length > 0 && !validation.isValid)}
                  aria-describedby="password-requirements password-strength"
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
              
              {/* Password Requirements Checklist */}
              {showRequirements && (
                <div id="password-requirements" className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Password must contain:</p>
                  <ul className="space-y-1.5">
                    <li className={`flex items-center gap-2 text-xs transition-colors ${requirements.minLength ? 'text-[#2D5A3D]' : 'text-gray-500'}`}>
                      {requirements.minLength ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-2 text-xs transition-colors ${requirements.hasUppercase ? 'text-[#2D5A3D]' : 'text-gray-500'}`}>
                      {requirements.hasUppercase ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      At least 1 uppercase letter
                    </li>
                    <li className={`flex items-center gap-2 text-xs transition-colors ${requirements.hasLowercase ? 'text-[#2D5A3D]' : 'text-gray-500'}`}>
                      {requirements.hasLowercase ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      At least 1 lowercase letter
                    </li>
                    <li className={`flex items-center gap-2 text-xs transition-colors ${requirements.hasNumber ? 'text-[#2D5A3D]' : 'text-gray-500'}`}>
                      {requirements.hasNumber ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      At least 1 number
                    </li>
                    <li className={`flex items-center gap-2 text-xs transition-colors ${requirements.hasSpecialChar ? 'text-[#2D5A3D]' : 'text-gray-500'}`}>
                      {requirements.hasSpecialChar ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      At least 1 special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              )}
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1 h-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full ${
                          level <= strength.score ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p id="password-strength" className={`text-xs mt-1 ${strength.score >= 3 ? 'text-[#2D5A3D]' : 'text-gray-400'}`}>
                    Password strength: {strength.label}
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
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                  aria-required="true"
                  aria-invalid={!agreedToTerms && !!error}
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#2D5A3D] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#2D5A3D] hover:underline">Privacy Policy</Link>
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
              className="w-full py-3.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
            <Link href="/login" className="text-[#2D5A3D] hover:text-[#234A31] font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Free tier benefits */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Free forever plan includes:</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#2D5A3D]" /> 50 memories
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#2D5A3D]" /> 1 GB storage
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#2D5A3D]" /> 3 AI interviews
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
