'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, Check, X } from 'lucide-react';
import { validatePassword, type PasswordValidationResult } from '@/lib/auth/password';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validation = useMemo<PasswordValidationResult>(() => {
    return validatePassword(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validation.isValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  const { requirements, strength } = validation;

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  if (success) {
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
            <div className="w-16 h-16 bg-[#2D5A3D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#2D5A3D]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-2">Password updated!</h2>
            <p className="text-gray-600 mb-4">
              Your password has been successfully reset.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-2">Reset your password</h2>
          <p className="text-gray-600 mb-6">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!showRequirements && e.target.value.length > 0) {
                      setShowRequirements(true);
                    }
                  }}
                  onFocus={() => setShowRequirements(true)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/50 border border-[#2D5A3D]/20 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D]/40 transition-all"
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
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-[#2D5A3D]/20 text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D]/40 transition-all"
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                />
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs mt-1 ${passwordsMatch ? 'text-[#2D5A3D]' : 'text-red-500'}`}>
                  {passwordsMatch ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </span>
                  ) : (
                    'Passwords do not match'
                  )}
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2D5A3D] hover:bg-[#355a48] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
