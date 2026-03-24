'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Square, Quote, Calendar, Tag, Lightbulb, Volume2, SkipForward, Sparkles, Share2, Users, X, Image as ImageIcon, ChevronDown, Check, Heart, Briefcase, Baby, Activity, Moon, Palette, Compass, Utensils, GraduationCap, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import '@/styles/home.css';
import ShareWisdomModal from '@/components/wisdom/ShareWisdomModal';
import WisdomCardModal from '@/components/wisdom/WisdomCardModal';
import WisdomComments from '@/components/wisdom/WisdomComments';

// Wisdom categories with icons and colors
const WISDOM_CATEGORIES = [
  { key: 'life_lessons', label: 'Life Lessons', icon: Lightbulb, color: '#D9C61A', bgColor: '#FDF9E3' },
  { key: 'relationships', label: 'Relationships', icon: Heart, color: '#C35F33', bgColor: '#FCEEE8' },
  { key: 'family', label: 'Family', icon: Users, color: '#406A56', bgColor: '#E8F2ED' },
  { key: 'career', label: 'Career', icon: Briefcase, color: '#4A3552', bgColor: '#EDE8F0' },
  { key: 'parenting', label: 'Parenting', icon: Baby, color: '#8DACAB', bgColor: '#EBF2F1' },
  { key: 'health', label: 'Health', icon: Activity, color: '#5B8A72', bgColor: '#E6F0EB' },
  { key: 'spirituality', label: 'Spirituality', icon: Moon, color: '#6B5B95', bgColor: '#EFEAF5' },
  { key: 'creativity', label: 'Creativity', icon: Palette, color: '#E07C52', bgColor: '#FCF0EA' },
  { key: 'values', label: 'Values', icon: Compass, color: '#3D7068', bgColor: '#E4EDEC' },
  { key: 'recipes', label: 'Recipes', icon: Utensils, color: '#C35F33', bgColor: '#FCEEE8' },
  { key: 'advice', label: 'Advice', icon: GraduationCap, color: '#D9C61A', bgColor: '#FDF9E3' },
  { key: 'other', label: 'Other', icon: HelpCircle, color: '#888888', bgColor: '#F5F5F5' },
];

const getCategoryConfig = (key: string) => {
  return WISDOM_CATEGORIES.find(c => c.key === key) || WISDOM_CATEGORIES[WISDOM_CATEGORIES.length - 1];
};

interface WisdomEntry {
  id: string;
  prompt_text: string;      // The question asked
  response_text?: string;   // The answer/wisdom
  audio_url?: string;
  tags?: string[];
  created_at: string;
  category?: string;
  subcategory?: string;
}

interface WisdomShare {
  id: string;
  contact_id: string;
  can_comment: boolean;
  contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    relationship_type?: string;
  };
}

interface ParsedExchange {
  question: string;
  answer: string;
  audioUrl?: string;
  questionAudioUrl?: string;
}

export default function WisdomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<WisdomEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [shares, setShares] = useState<WisdomShare[]>([]);
  const [showSharedList, setShowSharedList] = useState(false);
  const [userName, setUserName] = useState('Anonymous');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  
  // Category editing state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentExchangeIndex, setCurrentExchangeIndex] = useState(-1);
  const [playingPart, setPlayingPart] = useState<'question' | 'answer' | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const exchangesRef = useRef<ParsedExchange[]>([]);
  const isPlayingRef = useRef(false);  // Immediate ref guard (avoids React state race)

  const supabase = createClient();

  useEffect(() => {
    loadWisdomEntry();
    loadShares();
    return () => {
      stopPlayback();
    };
  }, [params.id]);

  // Close category picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showCategoryPicker && !target.closest('[data-category-picker]')) {
        setShowCategoryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryPicker]);

  const loadWisdomEntry = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Load user profile for card sharing
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserName(profile.full_name || user.email?.split('@')[0] || 'Anonymous');
      setUserPhoto(profile.avatar_url);
    }

    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('id, prompt_text, response_text, audio_url, tags, created_at, category, subcategory')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.error('Error loading wisdom:', error);
      router.push('/dashboard/wisdom');
      return;
    }

    setEntry(data);
    setIsLoading(false);
  };

  const loadShares = async () => {
    try {
      const res = await fetch(`/api/wisdom/${params.id}/share`);
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares || []);
      }
    } catch (err) {
      console.error('Failed to load shares:', err);
    }
  };

  const updateCategory = async (newCategory: string) => {
    if (!entry || isUpdatingCategory) return;
    
    setIsUpdatingCategory(true);
    try {
      const res = await fetch(`/api/wisdom/${entry.id}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setEntry(prev => prev ? { ...prev, category: newCategory } : null);
        setShowCategoryPicker(false);
      } else {
        console.error('Failed to update category');
      }
    } catch (err) {
      console.error('Error updating category:', err);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Parse the description to extract Q&A pairs and audio URLs
  const parseContent = (description: string) => {
    const parts = description.split('## Conversation');
    const summaryPart = parts[0]?.replace('## Summary', '').trim();
    
    const qaSection = parts[1] || '';
    const exchanges: ParsedExchange[] = [];
    
    // Split by --- separator first
    const qaPairs = qaSection.split(/\n\n---\n\n/).filter(s => s.trim());
    
    for (const pair of qaPairs) {
      // Extract question
      const qMatch = pair.match(/\*\*Q\d+:\*\*\s*(.+?)(?=\n\n\*\*A)/s);
      // Extract answer (stop at audio links or end)
      const aMatch = pair.match(/\*\*A\d+:\*\*\s*(.+?)(?=\n\n🔊|\n\n🎙️|$)/s);
      // Extract user answer audio URL
      const audioMatch = pair.match(/🎙️ \[Audio\]\((.+?)\)/);
      // Extract AI question audio URL
      const questionAudioMatch = pair.match(/🔊 \[Question Audio\]\((.+?)\)/);
      
      if (qMatch && aMatch) {
        exchanges.push({
          question: qMatch[1]?.trim() || '',
          answer: aMatch[1]?.trim() || '',
          audioUrl: audioMatch?.[1]?.trim(),
          questionAudioUrl: questionAudioMatch?.[1]?.trim(),
        });
      }
    }

    exchangesRef.current = exchanges;
    return { summary: summaryPart, exchanges };
  };

  // Stop all playback
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;  // Set ref immediately — stops any running loop
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    setIsPlaying(false);
    setCurrentExchangeIndex(-1);
    setPlayingPart(null);
    setPlaybackProgress(0);
  }, []);

  // Speak text using browser TTS
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google US English') ||
        v.name.includes('Karen') ||
        (v.lang.startsWith('en') && v.localService)
      ) || voices.find(v => v.lang.startsWith('en-US')) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // Play audio from URL
  const playAudioUrl = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        audioRef.current = null;
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  }, []);

  // Play all exchanges in sequence
  const playAllExchanges = useCallback(async () => {
    if (isPlayingRef.current) return;  // Ref guard — prevents double-play on rapid clicks
    const exchanges = exchangesRef.current;
    if (exchanges.length === 0) return;

    isPlayingRef.current = true;
    setIsPlaying(true);
    
    try {
      for (let i = 0; i < exchanges.length; i++) {
        // Check if stopped (use ref — state is stale inside async closure)
        if (!isPlayingRef.current) break;
        
        const exchange = exchanges[i];
        setCurrentExchangeIndex(i);
        setPlaybackProgress(((i) / exchanges.length) * 100);

        // Play question (real audio if available, else TTS)
        setPlayingPart('question');
        if (exchange.questionAudioUrl) {
          try {
            await playAudioUrl(exchange.questionAudioUrl);
          } catch (e) {
            console.log('Question audio failed, falling back to TTS:', e);
            try { await speakText(exchange.question); } catch {}
          }
        } else {
          try {
            await speakText(exchange.question);
          } catch (e) {
            console.log('TTS failed for question, skipping:', e);
          }
        }
        
        // Small pause between question and answer
        await new Promise(r => setTimeout(r, 400));

        // Play answer (real audio if available, else TTS)
        setPlayingPart('answer');
        if (exchange.audioUrl) {
          try {
            await playAudioUrl(exchange.audioUrl);
          } catch (e) {
            console.log('Answer audio failed, trying TTS:', e);
            try { await speakText(exchange.answer); } catch {}
          }
        } else {
          try {
            await speakText(exchange.answer);
          } catch (e) {
            console.log('TTS failed for answer, skipping:', e);
          }
        }

        // Pause between exchanges
        if (i < exchanges.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
      
      setPlaybackProgress(100);
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentExchangeIndex(-1);
      setPlayingPart(null);
    }
  }, [speakText, playAudioUrl]);

  // Toggle play/stop
  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playAllExchanges();
    }
  };

  // Skip to next exchange
  const skipToNext = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  if (isLoading) {
    return (
      <div className="pb-8 relative">
        <div className="home-background">
          <div className="home-blob home-blob-1" />
          <div className="home-blob home-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-[#4A3552] border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const { summary, exchanges } = parseContent(entry.response_text || '');
  const displayTags = (entry.tags || []).filter(t => !['conversation', 'wisdom', 'knowledge'].includes(t));

  return (
    <div className="pb-8 relative pb-24">
      {/* Warm background with blobs */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header with back link and actions */}
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard/wisdom"
              className="inline-flex items-center gap-2 text-[#4A3552] hover:text-[#6a4572] transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              <span>Back to Wisdom</span>
            </Link>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Shared indicator */}
              {shares.length > 0 && (
                <button
                  onClick={() => setShowSharedList(!showSharedList)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A3552]/10 hover:bg-[#4A3552]/20 rounded-full text-[#4A3552] text-sm transition-colors"
                >
                  <Users size={14} />
                  <span>Shared with {shares.length}</span>
                </button>
              )}
              
              {/* Share as Card button */}
              <button
                onClick={() => setShowCardModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#D9C61A] to-[#C35F33] text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
              >
                <ImageIcon size={16} />
                <span className="text-sm font-medium">Share as Card</span>
              </button>
              
              {/* Share button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4A3552] text-white rounded-xl hover:bg-[#5a4562] transition-all shadow-sm"
              >
                <Share2 size={16} />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Shared With Panel - Expandable */}
        <div className="max-w-3xl mx-auto px-6">
          <AnimatePresence>
            {showSharedList && shares.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#2d2d2d] flex items-center gap-2">
                      <Users size={16} className="text-[#4A3552]" />
                      Shared with {shares.length} {shares.length === 1 ? 'person' : 'people'}
                    </h3>
                    <button
                      onClick={() => setShowSharedList(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {shares.map(share => (
                      <div
                        key={share.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F2F1E5] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A3552] to-[#6a4572] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {getInitials(share.contact.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#2d2d2d] font-medium text-sm truncate">
                            {share.contact.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {share.contact.relationship_type && (
                              <span className="text-[#4A3552]">{share.contact.relationship_type}</span>
                            )}
                            {share.can_comment && (
                              <span className="px-1.5 py-0.5 bg-[#D9C61A]/20 text-[#8a7c08] rounded text-[10px]">
                                Can comment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-3xl mx-auto px-6">
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-start gap-4">
                {/* Category Icon */}
                {(() => {
                  const catKey = (entry.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_');
                  const catConfig = getCategoryConfig(catKey);
                  const CatIcon = catConfig.icon;
                  return (
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: catConfig.bgColor }}
                    >
                      <CatIcon size={28} style={{ color: catConfig.color }} />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-[#2d2d2d] mb-2">
                    {entry.prompt_text}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    
                    {/* Category Selector */}
                    <div className="relative" data-category-picker>
                      <button
                        onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: getCategoryConfig((entry.category || entry.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_')).bgColor,
                          color: getCategoryConfig((entry.category || entry.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_')).color,
                        }}
                      >
                        <Tag size={12} />
                        {getCategoryConfig((entry.category || entry.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_')).label}
                        <ChevronDown size={12} className={`transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Category Dropdown */}
                      <AnimatePresence>
                        {showCategoryPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-80 overflow-y-auto"
                          >
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                              Change Category
                            </div>
                            {WISDOM_CATEGORIES.map(cat => {
                              const Icon = cat.icon;
                              const isSelected = (entry.category || entry.category || 'life_lessons').toLowerCase().replace(/\s+/g, '_') === cat.key;
                              return (
                                <button
                                  key={cat.key}
                                  onClick={() => updateCategory(cat.key)}
                                  disabled={isUpdatingCategory}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                                    isSelected ? 'bg-gray-50' : ''
                                  } ${isUpdatingCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: cat.bgColor }}
                                  >
                                    <Icon size={16} style={{ color: cat.color }} />
                                  </div>
                                  <span className="flex-1 text-left text-sm text-gray-700">
                                    {cat.label}
                                  </span>
                                  {isSelected && (
                                    <Check size={16} className="text-green-500" />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {displayTags.length > 0 && (
                      <div className="flex items-center gap-2">
                        {displayTags.map(tag => (
                          <span 
                            key={tag}
                            className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Audio Player (for audio_url - shown always when available) */}
              {entry.audio_url && (
                <div className="mt-6">
                  <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#4A3552]/5 to-[#D9C61A]/5 rounded-2xl border border-[#4A3552]/10">
                    <div className="w-12 h-12 rounded-full bg-[#4A3552]/20 flex items-center justify-center flex-shrink-0">
                      <Volume2 size={20} className="text-[#4A3552]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[#2d2d2d] font-medium block mb-2">
                        {exchanges.length > 0 ? 'Full Recording' : 'Voice Recording'}
                      </span>
                      <audio 
                        controls 
                        className="w-full h-10"
                        src={entry.audio_url}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                </div>
              )}

              {/* Stitched Audio Player (for Q&A exchanges) */}
              {exchanges.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={togglePlayback}
                    className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#4A3552]/5 to-[#D9C61A]/5 hover:from-[#4A3552]/10 hover:to-[#D9C61A]/10 rounded-2xl transition-all w-full border border-[#4A3552]/10"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-[#4A3552]' : 'bg-[#4A3552]/20'}`}>
                      {isPlaying ? (
                        <Square size={18} className="text-white" fill="white" />
                      ) : (
                        <Play size={20} className="text-[#4A3552] ml-0.5" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <span className="text-[#2d2d2d] font-medium">
                        {isPlaying 
                          ? `Playing ${playingPart === 'question' ? 'Question' : 'Response'} ${currentExchangeIndex + 1}/${exchanges.length}`
                          : 'Play Full Conversation'
                        }
                      </span>
                      <p className="text-xs text-gray-500">
                        {isPlaying 
                          ? 'Tap to stop'
                          : `${exchanges.length} exchanges • AI questions + your responses`
                        }
                      </p>
                    </div>
                    {isPlaying && (
                      <button
                        onClick={(e) => { e.stopPropagation(); skipToNext(); }}
                        className="p-2 hover:bg-[#4A3552]/10 rounded-full transition-colors"
                        title="Skip to next"
                      >
                        <SkipForward size={20} className="text-[#4A3552]" />
                      </button>
                    )}
                  </button>
                  
                  {/* Progress bar */}
                  {isPlaying && (
                    <div className="mt-2 h-1 bg-[#4A3552]/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#4A3552]"
                        initial={{ width: 0 }}
                        animate={{ width: `${playbackProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Summary */}
            {summary && (
              <div className="p-8 bg-gradient-to-br from-[#D9C61A]/5 to-transparent">
                <div className="flex items-start gap-4">
                  <Quote size={24} className="text-[#D9C61A] flex-shrink-0 mt-1" />
                  <p className="text-[#2d2d2d] leading-relaxed text-lg italic">
                    {summary.length > 200 ? summary.slice(0, 200) + '...' : summary}
                  </p>
                </div>
              </div>
            )}

            {/* Q&A Exchanges */}
            {exchanges.length > 0 && (
              <div className="p-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6 flex items-center gap-2">
                  <Volume2 size={16} />
                  The Conversation
                </h2>
                
                <div className="space-y-6">
                  {exchanges.map((exchange, index) => (
                    <div 
                      key={index} 
                      className={`space-y-3 transition-all duration-300 ${
                        currentExchangeIndex === index 
                          ? 'scale-[1.02] opacity-100' 
                          : currentExchangeIndex >= 0 
                            ? 'opacity-50' 
                            : 'opacity-100'
                      }`}
                    >
                      {/* Question */}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          currentExchangeIndex === index && playingPart === 'question'
                            ? 'bg-[#406A56] text-white'
                            : 'bg-[#406A56]/10 text-[#406A56]'
                        }`}>
                          <span className="text-xs font-bold">Q</span>
                        </div>
                        <p className={`pt-1.5 font-medium transition-colors ${
                          currentExchangeIndex === index && playingPart === 'question'
                            ? 'text-[#406A56]'
                            : 'text-gray-600'
                        }`}>
                          {exchange.question}
                        </p>
                      </div>
                      
                      {/* Answer */}
                      <div className="ml-11">
                        <div className={`rounded-2xl p-5 transition-colors ${
                          currentExchangeIndex === index && playingPart === 'answer'
                            ? 'bg-[#4A3552]/10 border border-[#4A3552]/20'
                            : 'bg-[#F2F1E5]'
                        }`}>
                          <p className="text-[#2d2d2d] leading-relaxed">
                            {exchange.answer}
                          </p>
                          {/* Individual play button */}
                          {exchange.audioUrl && (
                            <button
                              onClick={() => playAudioUrl(exchange.audioUrl!)}
                              className="mt-3 flex items-center gap-2 text-sm text-[#4A3552] hover:text-[#6a4572] transition-colors"
                            >
                              <Play size={14} fill="currentColor" />
                              <span>Play this response</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback if no parsed content */}
            {!summary && exchanges.length === 0 && entry.response_text && (
              <div className="p-8">
                <p className="text-[#2d2d2d] leading-relaxed whitespace-pre-wrap">
                  {entry.response_text}
                </p>
              </div>
            )}

            {/* Comments Section */}
            <div className="p-8 border-t border-gray-100 bg-gradient-to-br from-[#F2F1E5]/50 to-transparent">
              <WisdomComments wisdomId={entry.id} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Share Wisdom Modal */}
      <ShareWisdomModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          loadShares(); // Refresh shares when modal closes
        }}
        wisdomId={entry.id}
        wisdomTitle={entry.prompt_text}
      />

      {/* Share as Card Modal */}
      <WisdomCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        wisdomText={summary || entry.response_text || ''}
        wisdomTitle={entry.prompt_text}
        userName={userName}
        userPhoto={userPhoto}
      />
    </div>
  );
}
