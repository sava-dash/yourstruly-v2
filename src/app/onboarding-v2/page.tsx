'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { QuickOnboardingFlow } from '@/components/onboarding/QuickOnboardingFlow';
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

export default function OnboardingV2Page() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

      setUser(user);
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

  return (
    <OnboardingErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
          </div>
        }
      >
        <QuickOnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkipAll={handleSkipOnboarding}
          userId={user?.id}
        />
      </Suspense>
    </OnboardingErrorBoundary>
  );
}
