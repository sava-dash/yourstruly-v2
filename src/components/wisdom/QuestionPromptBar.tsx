'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Lightbulb, Heart, Users, Briefcase, Compass, Utensils, GraduationCap, Mic, Shuffle } from 'lucide-react';

export interface WisdomQuestion {
  id: string;
  question_text: string;
  category: string;
}

// Category styling - backgrounds and accent colors
const CATEGORY_STYLES: Record<string, { 
  bg: string; 
  accent: string; 
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = {
  life_lessons: { 
    bg: 'linear-gradient(135deg, #F5ECD7 0%, #F0E6C8 100%)', 
    accent: '#D9C61A',
    icon: Lightbulb 
  },
  relationships: { 
    bg: 'linear-gradient(135deg, #F5DFD0 0%, #F0D5C2 100%)', 
    accent: '#C35F33',
    icon: Heart 
  },
  family: { 
    bg: 'linear-gradient(135deg, #E0EBE5 0%, #D5E4DC 100%)', 
    accent: '#406A56',
    icon: Users 
  },
  career: { 
    bg: 'linear-gradient(135deg, #E8E0EC 0%, #DFD5E5 100%)', 
    accent: '#4A3552',
    icon: Briefcase 
  },
  values: { 
    bg: 'linear-gradient(135deg, #E8F0EF 0%, #DEE8E7 100%)', 
    accent: '#8DACAB',
    icon: Compass 
  },
  recipes: { 
    bg: 'linear-gradient(135deg, #F5DFD0 0%, #F0D5C2 100%)', 
    accent: '#C35F33',
    icon: Utensils 
  },
  advice: { 
    bg: 'linear-gradient(135deg, #F5ECD7 0%, #F0E6C8 100%)', 
    accent: '#D9C61A',
    icon: GraduationCap 
  },
  wisdom: { 
    bg: 'linear-gradient(135deg, #E8E0EC 0%, #DFD5E5 100%)', 
    accent: '#4A3552',
    icon: Lightbulb 
  },
};

// Categories to fetch questions for
const WISDOM_CATEGORIES = ['life_lessons', 'relationships', 'family', 'career', 'values', 'recipes', 'advice', 'wisdom'];

interface QuestionPromptBarProps {
  onCreateWisdom: (question: WisdomQuestion) => void;
  onVoiceCapture?: (question: WisdomQuestion) => void;
}

export function QuestionPromptBar({ onCreateWisdom, onVoiceCapture }: QuestionPromptBarProps) {
  const [allQuestions, setAllQuestions] = useState<WisdomQuestion[]>([]);
  const [displayedQuestions, setDisplayedQuestions] = useState<WisdomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadUnansweredQuestions();
  }, []);

  // Shuffle to show different 5 questions
  const shuffleQuestions = () => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setDisplayedQuestions(shuffled.slice(0, 5));
  };

  const loadUnansweredQuestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get wisdom-related questions that user hasn't answered yet
    const { data: allQuestions } = await supabase
      .from('interview_questions')
      .select('id, question_text, category')
      .or('is_system.eq.true,user_id.eq.' + user.id)
      .in('category', WISDOM_CATEGORIES)
      .limit(50);

    // Get user's existing wisdom entries from knowledge_entries table
    const { data: existingWisdom } = await supabase
      .from('knowledge_entries')
      .select('prompt_text')
      .eq('user_id', user.id);

    // Filter out questions that have already been answered
    const answeredQuestionTexts = new Set(
      existingWisdom?.map(w => w.prompt_text) || []
    );

    const unanswered = (allQuestions || []).filter(
      q => !answeredQuestionTexts.has(q.question_text)
    );

    // Store all questions and display first 5
    const shuffled = unanswered.sort(() => Math.random() - 0.5);
    setAllQuestions(shuffled);
    setDisplayedQuestions(shuffled.slice(0, 5));
    setLoading(false);
  };

  const getCategoryStyle = (category: string) => {
    return CATEGORY_STYLES[category] || CATEGORY_STYLES.wisdom;
  };

  if (loading) {
    return (
      <div className="instant-questions-bar mb-6">
        <div className="instant-questions-header">
          <div className="instant-questions-title">
            <Sparkles size={16} className="text-[#D9C61A]" />
            <span>Instant Questions</span>
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className="flex-shrink-0 flex-1 min-w-[180px] h-[140px] rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (displayedQuestions.length === 0) return null;

  return (
    <div className="instant-questions-bar mb-6">
      {/* Header with shuffle button on left */}
      <div className="instant-questions-header flex items-center gap-3">
        {allQuestions.length > 5 && (
          <button 
            onClick={shuffleQuestions}
            className="p-2 rounded-lg bg-white/80 hover:bg-white border border-gray-200 text-gray-500 hover:text-[#406A56] transition-all"
            title="Shuffle questions"
          >
            <Shuffle size={16} />
          </button>
        )}
        <div className="instant-questions-title flex-1">
          <Sparkles size={16} className="text-[#D9C61A]" />
          <span>Instant Questions</span>
          <span className="instant-questions-xp">+100 XP each</span>
        </div>
      </div>

      {/* Cards Container - 5 questions in a row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {displayedQuestions.map((question, index) => {
              const style = getCategoryStyle(question.category);
              const Icon = style.icon;
              
              return (
                <motion.button
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onCreateWisdom(question)}
                  className="instant-question-card group"
                  style={{ 
                    background: style.bg,
                  }}
                >
                  {/* Category icon badge */}
                  <div 
                    className="instant-question-category"
                    style={{ backgroundColor: `${style.accent}15`, color: style.accent }}
                  >
                    <Icon size={14} />
                    <span>{question.category.replace(/_/g, ' ')}</span>
                  </div>

                  {/* Question text */}
                  <p className="instant-question-text">
                    {question.question_text}
                  </p>

                  {/* Answer buttons */}
                  <div className="instant-question-footer" style={{ gap: '8px' }}>
                    <span 
                      className="instant-question-btn"
                      style={{ 
                        backgroundColor: style.accent,
                        color: 'white' 
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateWisdom(question);
                      }}
                    >
                      <Plus size={14} />
                      Type
                    </span>
                    {onVoiceCapture && (
                      <span 
                        className="instant-question-btn"
                        style={{ 
                          backgroundColor: '#406A56',
                          color: 'white' 
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onVoiceCapture(question);
                        }}
                      >
                        <Mic size={14} />
                        Voice
                      </span>
                    )}
                  </div>

                  {/* Torn edge effect at bottom - uses CSS clip-path */}
                  <div className="instant-question-torn-edge" />
                </motion.button>
              );
            })}
          </AnimatePresence>
      </div>
    </div>
  );
}
