'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { QuickOnboardingFlow } from '@/components/onboarding/QuickOnboardingFlow';
import { HeroUIOnboarding } from '@/components/onboarding/HeroUIOnboarding';
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
  heartfeltConversation?: { role: 'assistant' | 'user'; content: string }[];
  uploadedImagesCount?: number;
}

function OnboardingPageContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [useHeroUI, setUseHeroUI] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Check for version parameter on mount
  useEffect(() => {
    const version = searchParams.get('v');
    const storedVersion = localStorage.getItem('onboarding-version');
    
    if (version === 'hero') {
      setUseHeroUI(true);
      localStorage.setItem('onboarding-version', 'hero');
    } else if (version === 'classic') {
      setUseHeroUI(false);
      localStorage.setItem('onboarding-version', 'classic');
    } else if (storedVersion === 'hero') {
      setUseHeroUI(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch profile to get full_name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const name = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '';

      if (!mounted) return;

      setUser(user);
      setFirstName(name);
      setLoading(false);
    };

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleSkipOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  }, [user, router, supabase]);

  const handleOnboardingComplete = useCallback(
    async (data: OnboardingData) => {
      if (!user) {
        router.push('/dashboard');
        return;
      }

      try {
        const locationParts = data.location?.split(',').map((s) => s.trim()) || [];

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
            onboarding_step: 8, // v2 is shorter
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Save heartfelt answer as first memory
        if (data.heartfeltAnswer?.trim()) {
          await supabase.from('memories').insert({
            user_id: user.id,
            title: 'My First Reflection',
            description: data.heartfeltAnswer,
            memory_date: new Date().toISOString(),
            tags: ['onboarding', 'reflection', 'first-memory'],
          });
        }

        router.push('/dashboard');
      } catch (error) {
        console.error('Error completing onboarding:', error);
        router.push('/dashboard');
      }
    },
    [user, router, supabase]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
      </div>
    );
  }

  const toggleVersion = () => {
    const newVersion = !useHeroUI;
    setUseHeroUI(newVersion);
    localStorage.setItem('onboarding-version', newVersion ? 'hero' : 'classic');
  };

  return (
    <OnboardingErrorBoundary>
      {/* Version toggle button */}
      <button
        onClick={toggleVersion}
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#406A56] border border-[#406A56]/20 hover:bg-[#406A56]/10 transition-colors shadow-lg"
      >
        {useHeroUI ? '🎨 HeroUI' : '⚡ Classic'} • Click to switch
      </button>

      <Suspense
        fallback={
          <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
          </div>
        }
      >
        {useHeroUI ? (
          <HeroUIOnboarding
            onComplete={handleOnboardingComplete}
            onSkip={handleSkipOnboarding}
            firstName={firstName}
          />
        ) : (
          <QuickOnboardingFlow
            onComplete={handleOnboardingComplete}
            onSkipAll={handleSkipOnboarding}
            userId={user?.id}
            initialName={firstName}
          />
        )}
      </Suspense>
    </OnboardingErrorBoundary>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
