'use client';

import { motion } from 'framer-motion';
import { 
  Heart, 
  User, 
  Sparkles, 
  Target, 
  Palette, 
  Briefcase, 
  Brain,
  MapPin,
  Quote,
  BookOpen,
  Trophy,
  Lightbulb,
  Compass,
  Shield,
  Star
} from 'lucide-react';

// ============================================
// STEP EXPLANATION DATA
// ============================================

export interface StepExplanation {
  title: string;
  subtitle: string;
  description: string;
  valueProposition: string;
  icon: React.ReactNode;
  gradient: string;
  illustration?: string;
}

export const STEP_EXPLANATIONS: Record<string, StepExplanation> = {
  welcome: {
    title: "Your Story Matters",
    subtitle: "Let's Begin",
    description: "Every person has a unique journey worth preserving. We're here to help you capture the essence of who you are—your wisdom, memories, and the moments that shaped you.",
    valueProposition: "This 2-minute onboarding helps us create deeply personalized experiences that honor your unique story.",
    icon: <Sparkles className="w-8 h-8" />,
    gradient: "from-[#406A56] to-[#8DACAB]",
  },
  name: {
    title: "Your Identity",
    subtitle: "The Foundation",
    description: "Your name is the first thread in the tapestry of your legacy. It's how your loved ones will find you, remember you, and connect with your stories.",
    valueProposition: "This personalizes every interaction and helps family members recognize and connect with your stories.",
    icon: <User className="w-8 h-8" />,
    gradient: "from-[#406A56] to-[#D9C61A]",
  },
  interests: {
    title: "What Captivates You",
    subtitle: "Your Passions",
    description: "The things that spark your curiosity reveal the truest parts of you. Your interests guide the memories you'll want to preserve and the stories worth telling.",
    valueProposition: "We use this to suggest relevant prompts, connect you with similar family members, and curate content that truly resonates with you.",
    icon: <Heart className="w-8 h-8" />,
    gradient: "from-[#C35F33] to-[#D9C61A]",
  },
  hobbies: {
    title: "How You Spend Your Time",
    subtitle: "Your Pursuits",
    description: "Hobbies are the activities that bring you joy, relaxation, and fulfillment. They represent the colorful details that make your life uniquely yours.",
    valueProposition: "This helps us understand what activities to associate with your memories and which experiences you might want to document most.",
    icon: <Palette className="w-8 h-8" />,
    gradient: "from-[#D9C61A] to-[#406A56]",
  },
  skills: {
    title: "Your Strengths",
    subtitle: "What You Excel At",
    description: "The skills you've developed represent years of growth, learning, and dedication. They're gifts that can inspire and guide future generations.",
    valueProposition: "We highlight these in your legacy profile and use them to suggest prompts about lessons learned and wisdom gained.",
    icon: <Briefcase className="w-8 h-8" />,
    gradient: "from-[#406A56] to-[#8DACAB]",
  },
  personality: {
    title: "Who You Are",
    subtitle: "Your Character",
    description: "Your personality traits define how you move through the world. Understanding your nature helps us create experiences that feel authentic to you.",
    valueProposition: "This shapes how we communicate with you—whether you prefer gentle reflection or energetic exploration of your memories.",
    icon: <Brain className="w-8 h-8" />,
    gradient: "from-[#8DACAB] to-[#C35F33]",
  },
  'life-goals': {
    title: "What Drives You",
    subtitle: "Your Aspirations",
    description: "Your life goals represent your deepest values and the legacy you want to leave. They're the north star that guides your most meaningful decisions.",
    valueProposition: "We use this to create prompts about your journey, achievements, and the wisdom you've gathered along the way.",
    icon: <Target className="w-8 h-8" />,
    gradient: "from-[#C35F33] to-[#D9C61A]",
  },
  religion: {
    title: "Your Beliefs",
    subtitle: "Faith & Spirituality",
    description: "Spirituality often provides the framework for how we understand life's biggest questions. Your beliefs shape your perspective in profound ways.",
    valueProposition: "This helps us respectfully personalize prompts around meaning, purpose, and the values you hold most dear.",
    icon: <Compass className="w-8 h-8" />,
    gradient: "from-[#D9C61A] to-[#406A56]",
  },
  location: {
    title: "Where You Call Home",
    subtitle: "Your Roots",
    description: "The places we've lived become part of our story. They hold memories of who we were and how we've grown over time.",
    valueProposition: "This contextualizes your memories geographically and helps family members understand the settings that shaped your life.",
    icon: <MapPin className="w-8 h-8" />,
    gradient: "from-[#406A56] to-[#8DACAB]",
  },
  'favorite-quote': {
    title: "Words That Inspire",
    subtitle: "Your Philosophy",
    description: "The quotes we live by reveal our deepest values and the wisdom we've embraced. They're guideposts for how we navigate life.",
    valueProposition: "We feature this prominently in your profile and use it to understand the principles that guide your life.",
    icon: <Quote className="w-8 h-8" />,
    gradient: "from-[#8DACAB] to-[#C35F33]",
  },
  background: {
    title: "Your Journey",
    subtitle: "What Brings You Here",
    description: "Understanding why you're here helps us support your unique path. Whether you're preserving memories for family or reflecting on your own, your story deserves care.",
    valueProposition: "This shapes the entire experience—we'll tailor prompts, suggestions, and features to match your specific goals.",
    icon: <BookOpen className="w-8 h-8" />,
    gradient: "from-[#C35F33] to-[#D9C61A]",
  },
  'heartfelt-question': {
    title: "Your First Memory",
    subtitle: "Begin Your Legacy",
    description: "This is where your story begins. Based on everything you've shared, we've crafted a question designed just for you—to capture something meaningful from the start.",
    valueProposition: "Your answer becomes your first preserved memory, instantly creating value and setting the tone for your ongoing journey.",
    icon: <Lightbulb className="w-8 h-8" />,
    gradient: "from-[#D9C61A] to-[#406A56]",
  },
  celebration: {
    title: "You're All Set",
    subtitle: "Welcome Home",
    description: "You've taken the most important step—beginning. Your profile is now personalized to help you capture and preserve the moments that matter most.",
    valueProposition: "Everything we've learned shapes how YoursTruly will serve you and your family for years to come.",
    icon: <Trophy className="w-8 h-8" />,
    gradient: "from-[#406A56] to-[#D9C61A]",
  },
};

// ============================================
// COMPONENT
// ============================================

interface OnboardingStepExplanationProps {
  step: string;
  showForMobile?: boolean;
}

export function OnboardingStepExplanation({ step, showForMobile = false }: OnboardingStepExplanationProps) {
  const explanation = STEP_EXPLANATIONS[step];
  
  if (!explanation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: showForMobile ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: showForMobile ? -20 : 20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`
        ${showForMobile ? 'lg:hidden' : 'hidden lg:flex'}
        ${showForMobile ? 'w-full mb-6' : 'w-full max-w-md flex-col'}
      `}
    >
      <div className={`
        glass-card glass-card-strong overflow-hidden
        ${showForMobile ? 'p-5' : 'p-8 h-full'}
      `}>
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${explanation.gradient}
            flex items-center justify-center shadow-lg
          `}>
            <div className="text-white">
              {explanation.icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#C35F33]/70 mb-1">
              {explanation.subtitle}
            </p>
            <h3 className="text-xl font-bold text-[#2d2d2d] font-playfair leading-tight">
              {explanation.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#2d2d2d]/80 leading-relaxed mb-5 text-[15px]">
          {explanation.description}
        </p>

        {/* Value Proposition - Trust Builder */}
        <div className="bg-gradient-to-r from-[#406A56]/5 to-[#8DACAB]/5 rounded-xl p-4 border border-[#406A56]/10">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-[#406A56]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#406A56] uppercase tracking-wide mb-1">
                Why This Matters
              </p>
              <p className="text-sm text-[#2d2d2d]/70 leading-relaxed">
                {explanation.valueProposition}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator for Desktop */}
        {!showForMobile && (
          <div className="mt-8 pt-6 border-t border-[#406A56]/10">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D9C61A] fill-[#D9C61A]" />
              <p className="text-xs text-[#2d2d2d]/60 italic">
                Your data is private and secure. You control who sees your story.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// ILLUSTRATION PLACEHOLDER COMPONENT
// ============================================

interface StepIllustrationProps {
  step: string;
  className?: string;
}

export function StepIllustration({ step, className = "" }: StepIllustrationProps) {
  const explanation = STEP_EXPLANATIONS[step];
  
  if (!explanation) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Abstract decorative illustration based on step */}
      <div className={`
        w-full aspect-square max-w-[200px] mx-auto rounded-3xl
        bg-gradient-to-br ${explanation.gradient}
        p-6 flex items-center justify-center
        shadow-2xl shadow-black/10
      `}>
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute bottom-8 left-8 w-12 h-12 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/5" />
        </div>
        
        {/* Icon */}
        <div className="relative z-10 text-white">
          {explanation.icon}
        </div>
      </div>
      
      {/* Floating decorative elements */}
      <motion.div
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#D9C61A]/30 backdrop-blur-sm"
        animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#C35F33]/30 backdrop-blur-sm"
        animate={{ y: [0, 5, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </div>
  );
}
