'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, Briefcase, Sparkles, BookOpen, Brain, Target, Mic, Keyboard, Video, Loader2, X } from 'lucide-react';
import { AnimatedQuestion } from '@/components/conversation/AnimatedQuestion';

// Lazy load MediaRecorder for voice/video recording
const MediaRecorder = lazy(() => import('@/components/conversation/MediaRecorder').then(mod => ({ default: mod.MediaRecorder })));

type QuestionCategory = 'family' | 'career' | 'love' | 'memories' | 'wisdom' | 'life-goals' | 'spirituality';
type InputMode = 'text' | 'voice' | 'video';

interface UserProfile {
  interests?: string[];
  hobbies?: string[];
  skills?: string[];
  lifeGoals?: string[];
  personalityTraits?: string[];
  religion?: string;
  background?: string;
  favoriteQuote?: string;
}

interface HeartfeltQuestionProps {
  userProfile: UserProfile;
  onComplete: (answer: string, audioUrl?: string, videoUrl?: string) => void;
  onSkip?: () => void;
}

interface GeneratedQuestion {
  category: QuestionCategory;
  question: string;
  context: string;
}

const CATEGORY_CONFIG: Record<QuestionCategory, { 
  label: string; 
  icon: React.ReactNode;
  colorClass: string;
  description: string;
}> = {
  family: {
    label: 'Family',
    icon: <Users size={18} />,
    colorClass: 'heartfelt-category-family',
    description: 'The bonds that shape who we are'
  },
  career: {
    label: 'Career',
    icon: <Briefcase size={18} />,
    colorClass: 'heartfelt-category-career',
    description: 'Your journey and achievements'
  },
  love: {
    label: 'Love',
    icon: <Heart size={18} />,
    colorClass: 'heartfelt-category-love',
    description: 'Relationships that matter most'
  },
  memories: {
    label: 'Memories',
    icon: <Sparkles size={18} />,
    colorClass: 'heartfelt-category-memories',
    description: 'Moments that defined you'
  },
  wisdom: {
    label: 'Wisdom',
    icon: <Brain size={18} />,
    colorClass: 'heartfelt-category-wisdom',
    description: 'Lessons learned along the way'
  },
  'life-goals': {
    label: 'Life Goals',
    icon: <Target size={18} />,
    colorClass: 'heartfelt-category-career',
    description: 'What you aspire to achieve'
  },
  spirituality: {
    label: 'Spirituality',
    icon: <Sparkles size={18} />,
    colorClass: 'heartfelt-category-love',
    description: 'Faith and meaning'
  }
};

// Questions organized by category and personalization triggers
const QUESTION_TEMPLATES: Record<QuestionCategory, {
  triggers: string[];
  questions: string[];
}> = {
  family: {
    triggers: ['family', 'home', 'parent', 'children', 'legacy', 'family-legacy'],
    questions: [
      "What's a tradition from your family that you hope will continue for generations?",
      "Who in your family has shaped who you are today, and what did they teach you?",
      "What's the most important lesson about love that you learned from your family?",
      "If you could preserve one family memory forever, which would it be and why?",
      "What do you want future generations of your family to know about where you came from?",
    ]
  },
  career: {
    triggers: ['career', 'work', 'business', 'leadership', 'professional', 'career-success'],
    questions: [
      "What moment in your career made you feel most proud of who you've become?",
      "If you could share one piece of advice about work with your younger self, what would it be?",
      "What dream did you have for your career that actually came true?",
      "Who believed in you when you didn't believe in yourself professionally?",
    ]
  },
  love: {
    triggers: ['love', 'relationship', 'romance', 'marriage', 'strong-relationships', 'nurturing', 'empathetic'],
    questions: [
      "How did you know when you found something real, and what did that feel like?",
      "What's the bravest thing you've ever done for love?",
      "If you could relive one perfect moment with someone you love, which would you choose?",
      "What has love taught you that nothing else could?",
    ]
  },
  memories: {
    triggers: ['memories', 'travel', 'adventure', 'adventurous', 'photography', 'collecting'],
    questions: [
      "What memory instantly brings a smile to your face, no matter what?",
      "If you could bottle one moment from your life to experience again, which would it be?",
      "What seemingly small moment turned out to be incredibly significant?",
      "What experience changed the course of your life in ways you didn't expect?",
    ]
  },
  wisdom: {
    triggers: ['wisdom', 'teaching', 'mentor', 'learn', 'reflective', 'analytical', 'learn-grow'],
    questions: [
      "What's the hardest truth you've learned that you wish someone had told you sooner?",
      "If you could only pass down one lesson to the next generation, what would it be?",
      "What mistake taught you the most valuable lesson of your life?",
      "How has your definition of success changed over time?",
    ]
  },
  'life-goals': {
    triggers: ['driven', 'goals', 'achievement', 'help-others', 'financial-freedom', 'creative-work', 'adventure'],
    questions: [
      "What's one dream you're still working toward, and why does it matter to you?",
      "Looking back, which of your accomplishments surprised you the most?",
      "What goal seemed impossible when you were younger but you achieved anyway?",
      "If you could be remembered for one thing, what would you want it to be?",
    ]
  },
  spirituality: {
    triggers: ['spiritual', 'spirituality', 'religion', 'faith', 'christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 'spiritual-growth', 'peace'],
    questions: [
      "What gives your life the deepest sense of meaning and purpose?",
      "How has your faith or spirituality shaped the decisions you've made?",
      "What moment made you reflect most deeply on life's bigger questions?",
      "What practices help you find peace or connection to something greater?",
    ]
  }
};

function generatePersonalizedQuestion(userProfile: UserProfile): GeneratedQuestion {
  const signals: string[] = [
    ...(userProfile.interests || []),
    ...(userProfile.hobbies || []),
    ...(userProfile.skills || []),
    ...(userProfile.lifeGoals || []),
    ...(userProfile.personalityTraits || []),
    userProfile.religion || '',
    userProfile.background || '',
  ].map(s => s.toLowerCase()).filter(Boolean);

  const categoryScores: Record<QuestionCategory, number> = {
    family: 0, career: 0, love: 0, memories: 0, wisdom: 0, 'life-goals': 0, spirituality: 0,
  };

  for (const [category, config] of Object.entries(QUESTION_TEMPLATES)) {
    for (const trigger of config.triggers) {
      if (signals.some(s => s.includes(trigger) || trigger.includes(s))) {
        categoryScores[category as QuestionCategory] += 1;
      }
    }
  }

  if (userProfile.religion && !['prefer-not', 'agnostic', 'atheist'].includes(userProfile.religion)) {
    categoryScores.spirituality += 2;
  }
  
  if (signals.includes('family-legacy') || signals.includes('family')) {
    categoryScores.family += 2;
  }

  if (userProfile.favoriteQuote) {
    categoryScores.wisdom += 1;
  }

  let selectedCategory: QuestionCategory = 'memories';
  let maxScore = 0;
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = category as QuestionCategory;
    }
  }

  const questions = QUESTION_TEMPLATES[selectedCategory].questions;
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

  let context = 'We want to hear your story';
  if (userProfile.interests && userProfile.interests.length > 0) {
    context = `Since you're interested in ${userProfile.interests[0].replace('-', ' ')}`;
  } else if (userProfile.lifeGoals && userProfile.lifeGoals.length > 0) {
    context = `Based on what matters most to you`;
  }

  return { category: selectedCategory, question: randomQuestion, context };
}

export function HeartfeltQuestion({ userProfile, onComplete, onSkip }: HeartfeltQuestionProps) {
  const [generatedQuestion, setGeneratedQuestion] = useState<GeneratedQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [answer, setAnswer] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'audio' | 'video' | undefined>(undefined);
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate personalized question on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const question = generatePersonalizedQuestion(userProfile);
      setGeneratedQuestion(question);
      setIsGenerating(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [userProfile]);

  // Focus textarea in text mode
  useEffect(() => {
    if (inputMode === 'text' && showInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [inputMode, showInput]);

  const handleTypingComplete = useCallback(() => {
    setTimeout(() => setShowInput(true), 400);
  }, []);

  // Handle voice/video recording complete
  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number, type: 'video' | 'audio') => {
    setIsTranscribing(true);
    setTranscriptionFailed(false);
    
    // Create a local URL for the media blob immediately
    const url = URL.createObjectURL(blob);
    setMediaUrl(url);
    setMediaType(type);
    
    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording.${type === 'video' ? 'webm' : 'webm'}`);
      formData.append('mediaType', type);
      
      const response = await fetch('/api/engagement/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');
      
      const data = await response.json();
      const transcription = data.transcription || '';
      
      if (transcription.trim()) {
        setAnswer(transcription);
        setTranscriptionFailed(false);
      } else {
        // Transcription returned empty - may happen with short recordings or unclear audio
        setTranscriptionFailed(true);
        // Set a placeholder so submit is enabled, but user knows to review
        setAnswer('[Transcription unavailable - your recording is saved]');
      }
      setInputMode('text'); // Switch to text to show/edit transcription
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscriptionFailed(true);
      // Set placeholder so submit is enabled even without transcription
      setAnswer('[Transcription unavailable - your recording is saved]');
      setInputMode('text');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Check if we can submit - either has text answer or has media recording
  const canSubmit = !isSubmitting && (answer.trim().length > 0 || !!mediaUrl);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    
    // Pass the appropriate URL based on media type
    const audioUrl = mediaType === 'audio' ? mediaUrl : undefined;
    const videoUrl = mediaType === 'video' ? mediaUrl : undefined;
    
    // Clean up placeholder text if transcription failed but we have media
    const finalAnswer = transcriptionFailed && mediaUrl 
      ? '' // Empty string - the media URL is what matters
      : answer;
    
    onComplete(finalAnswer, audioUrl, videoUrl);
  }, [canSubmit, answer, transcriptionFailed, mediaUrl, mediaType, onComplete]);

  const config = generatedQuestion ? CATEGORY_CONFIG[generatedQuestion.category] : null;

  return (
    <div className="glass-card glass-card-strong p-8 max-w-2xl mx-auto relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#406A56]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#D9C61A]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#406A56]/10 mb-4">
            <BookOpen size={28} className="text-[#406A56]" />
          </div>
          <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-2 font-playfair">
            A Question Just for You
          </h2>
          <p className="text-gray-500 text-sm">
            Based on what you&apos;ve shared, we&apos;d love to hear more...
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              className="flex flex-col items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-12 h-12 border-4 border-[#406A56]/20 border-t-[#406A56] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="mt-4 text-gray-500 text-lg" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>
                Crafting your question...
              </p>
            </motion.div>
          ) : generatedQuestion && config ? (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Category Badge */}
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#406A56]/10 text-[#406A56] text-sm font-medium">
                  {config.icon}
                  {config.label}
                </span>
              </motion.div>

              {/* Animated Question */}
              <div className="mb-8">
                <AnimatedQuestion
                  question={generatedQuestion.question}
                  animate={true}
                  centered={true}
                  size="lg"
                  enableTTS={true}
                  onTypingComplete={handleTypingComplete}
                />
              </div>

              {/* Input Section */}
              <AnimatePresence>
                {showInput && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Input Mode Selector */}
                    <div className="flex justify-center gap-2 mb-4">
                      <button
                        onClick={() => setInputMode('text')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          inputMode === 'text'
                            ? 'bg-[#406A56] text-white'
                            : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                        }`}
                      >
                        <Keyboard size={16} />
                        Text
                      </button>
                      <button
                        onClick={() => setInputMode('voice')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          inputMode === 'voice'
                            ? 'bg-[#406A56] text-white'
                            : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                        }`}
                      >
                        <Mic size={16} />
                        Voice
                      </button>
                      <button
                        onClick={() => setInputMode('video')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          inputMode === 'video'
                            ? 'bg-[#406A56] text-white'
                            : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                        }`}
                      >
                        <Video size={16} />
                        Video
                      </button>
                    </div>

                    {/* Text Input */}
                    {inputMode === 'text' && (
                      <div>
                        <textarea
                          ref={textareaRef}
                          value={transcriptionFailed && answer.startsWith('[') ? '' : answer}
                          onChange={(e) => {
                            setAnswer(e.target.value);
                            // Clear transcription failed state when user starts typing
                            if (transcriptionFailed && e.target.value.length > 0) {
                              setTranscriptionFailed(false);
                            }
                          }}
                          placeholder={
                            transcriptionFailed && mediaUrl
                              ? "Your recording is saved. Optionally add a description..."
                              : "Share your thoughts... This becomes your first memory."
                          }
                          className="w-full p-4 rounded-xl bg-white/80 border border-[#406A56]/20 
                                     text-[#2d2d2d] placeholder-gray-400 resize-none
                                     focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]/40
                                     transition-all"
                          rows={5}
                          autoFocus
                        />
                        
                        {/* Media preview if available */}
                        {mediaUrl && mediaType === 'video' && (
                          <div className="mt-3 relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-[#406A56] flex items-center gap-1">
                                <Video size={14} />
                                Video response attached
                              </span>
                              <button
                                onClick={() => {
                                  setMediaUrl(undefined);
                                  setMediaType(undefined);
                                }}
                                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                              >
                                <X size={12} />
                                Remove
                              </button>
                            </div>
                            <video
                              src={mediaUrl}
                              controls
                              className="w-full max-h-40 rounded-lg object-cover"
                            />
                          </div>
                        )}
                        
                        {mediaUrl && mediaType === 'audio' && (
                          <div className="mt-3 p-3 bg-[#406A56]/5 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#406A56] flex items-center gap-2">
                                <Mic size={14} />
                                Voice response attached
                              </span>
                              <button
                                onClick={() => {
                                  setMediaUrl(undefined);
                                  setMediaType(undefined);
                                }}
                                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                              >
                                <X size={12} />
                                Remove
                              </button>
                            </div>
                            <audio src={mediaUrl} controls className="w-full mt-2" />
                          </div>
                        )}
                        
                        {/* Transcription warning */}
                        {transcriptionFailed && mediaUrl && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <p className="font-medium">Transcription unavailable</p>
                            <p className="mt-1 text-amber-600">
                              Your {mediaType} recording is saved. You can type a description or just submit the recording.
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-4">
                          {onSkip && (
                            <button
                              onClick={onSkip}
                              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Skip for now
                            </button>
                          )}
                          <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="ml-auto flex items-center gap-2 px-6 py-2.5 
                                       bg-[#406A56] text-white rounded-xl font-medium
                                       hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed
                                       transition-all"
                          >
                            {isSubmitting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                            Save & Continue
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Voice/Video Recording */}
                    {(inputMode === 'voice' || inputMode === 'video') && (
                      <Suspense fallback={
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
                        </div>
                      }>
                        {isTranscribing ? (
                          <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-[#406A56] mb-4" />
                            <p className="text-gray-500">Transcribing your response...</p>
                          </div>
                        ) : (
                          <div className="py-4">
                            {/* Back to text button */}
                            <button
                              onClick={() => setInputMode('text')}
                              className="text-sm text-[#406A56]/60 hover:text-[#406A56] flex items-center gap-1 mb-4"
                            >
                              ← Back to text input
                            </button>
                            
                            <MediaRecorder
                              onRecordingComplete={handleRecordingComplete}
                              allowVideo={true}
                              defaultMode={inputMode === 'video' ? 'video' : 'voice'}
                            />
                            
                            {onSkip && (
                              <div className="flex justify-center mt-4">
                                <button
                                  onClick={onSkip}
                                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  Skip for now
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Suspense>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category description */}
              {!showInput && (
                <motion.p 
                  className="text-center text-gray-400 text-sm mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {config.description}
                </motion.p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
