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

function OnboardingPageContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
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
    async (data: OnboardingData | any) => {
      if (!user) {
        router.push('/dashboard');
        return;
      }

      try {
        // Handle HeroUI format (simplified)
        const isHeroFormat = 'birthday' in data || 'traits' in data;
        
        const locationParts = data.location?.split(',').map((s: string) => s.trim()) || 
                             (data.birthplace ? [data.birthplace] : []);

        const updates: any = {
          full_name: (data.name || '').trim().replace(/\b\w/g, (c: string) => c.toUpperCase()),
          onboarding_completed: true,
          onboarding_step: 8,
        };

        // Map HeroUI fields to standard fields
        if (isHeroFormat) {
          updates.interests = data.interests || [];
          updates.personality_traits = data.traits || [];
          updates.religion = data.beliefs?.[0] || null;
          updates.background = data.journey || null;
          if (data.birthplace) {
            updates.city = data.birthplace;
          }
        } else {
          // Original format
          updates.interests = data.interests;
          updates.hobbies = data.hobbies;
          updates.skills = data.skills;
          updates.life_goals = data.lifeGoals;
          updates.personality_traits = data.personalityTraits;
          updates.religion = data.religion || null;
          updates.city = locationParts[0] || null;
          updates.state = locationParts[1] || null;
          updates.favorite_quote = data.favoriteQuote || null;
          updates.background = data.background || null;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Save birthplace as a memory + location_history
        const birthCity = locationParts[0] || data.birthplace || data.location;
        if (birthCity?.trim()) {
          const birthTitle = `Born in ${birthCity.split(',')[0].trim()}`;
          // Deduplicate
          const { data: existingBirth } = await supabase
            .from('memories')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', birthTitle)
            .limit(1);
          
          if (!existingBirth || existingBirth.length === 0) {
            await supabase.from('memories').insert({
              user_id: user.id,
              title: birthTitle,
              description: 'Where my story began.',
              memory_date: data.birthday || new Date().toISOString(),
              location_name: birthCity,
              tags: ['birthplace', 'location'],
            });
          }
        }

        // Save heartfelt answer as first memory
        const heartfelt = data.heartfeltAnswer || data.heartfelt;
        if (heartfelt?.trim()) {
          await supabase.from('memories').insert({
            user_id: user.id,
            title: 'My First Reflection',
            description: heartfelt,
            memory_date: new Date().toISOString(),
            tags: ['onboarding', 'reflection', 'first-memory'],
          });
        }

        // Hard navigation ensures profile update + cookies are fresh
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Error completing onboarding:', error);
        window.location.href = '/dashboard';
      }
    },
    [user, router, supabase]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
      </div>
    );
  }

  return (
    <OnboardingErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
          </div>
        }
      >
        <QuickOnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkipAll={handleSkipOnboarding}
          userId={user?.id}
          initialName={firstName}
        />
      </Suspense>
    </OnboardingErrorBoundary>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6f6fd2]" />
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
