'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { EnhancedOnboardingFlow } from '@/components/onboarding';
import { OnboardingErrorBoundary } from '@/components/ui/OnboardingErrorBoundary';

interface OnboardingData {
  name: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  lifeGoals: string[];
  personalityTraits: string[];
  religion: string;
  location: string;
  favoriteQuote: string;
  background: string;
  heartfeltAnswer?: string;
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  // Memoize supabase client to prevent re-creation on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!mounted) return;
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check if onboarding already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, full_name')
        .eq('id', user.id)
        .single();
      
      if (!mounted) return;
      
      if (profile?.onboarding_completed) {
        router.push('/dashboard');
        return;
      }
      
      setUser(user);
      setLoading(false);
    };
    
    checkUser();
    
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // IMPORTANT: All hooks must be called before any early returns!
  // This was causing React error #310 (different number of hooks between renders)
  const handleSkipOnboarding = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      router.push('/dashboard');
    }
  }, [user, router, supabase]);

  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    if (!user) {
      console.error('No user found');
      router.push('/dashboard');
      return;
    }
    
    try {
      // Build location string for city/state fields
      const locationParts = data.location?.split(',').map(s => s.trim()) || [];
      
      // Update profile with all onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          interests: data.interests,
          hobbies: data.hobbies,
          skills: data.skills,
          life_goals: data.lifeGoals,
          personality_traits: data.personalityTraits,
          religion: data.religion || null,
          city: locationParts[0] || null,
          state: locationParts[1] || null,
          favorite_quote: data.favoriteQuote || null,
          background: data.background || null,
          onboarding_completed: true,
          onboarding_step: 13,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Save heartfelt answer as first memory if provided
      if (data.heartfeltAnswer && data.heartfeltAnswer.trim()) {
        const { error: memoryError } = await supabase.from('memories').insert({
          user_id: user.id,
          title: 'My First Reflection',
          description: data.heartfeltAnswer,
          memory_date: new Date().toISOString(),
          tags: ['onboarding', 'reflection', 'first-memory'],
        });
        
        if (memoryError) {
          console.error('Memory creation error:', memoryError);
        }
      }

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Navigate anyway - better UX than being stuck
      router.push('/dashboard');
    }
  }, [user, router, supabase]);

  // Early return AFTER all hooks are called
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden flex items-center justify-center">
        <div className="home-background" />
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
      </div>
    );
  }

  return (
    <OnboardingErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-[#FDF8F3] relative overflow-hidden flex items-center justify-center">
          <div className="home-background" />
          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
        </div>
      }>
        <EnhancedOnboardingFlow 
          onComplete={handleOnboardingComplete} 
          onSkipAll={handleSkipOnboarding}
        />
      </Suspense>
    </OnboardingErrorBoundary>
  );
}
