'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Lightbulb, Heart, BookOpen, Search, X, ChevronLeft, 
  GraduationCap, Briefcase, Users, Utensils, Compass, Share2, 
  Baby, Activity, Palette, Moon, HelpCircle, Grid3X3, List, 
  Clock, Plus, Play, Pause, Tag, ChevronRight, Folder, Star
} from 'lucide-react';
import Link from 'next/link';
import '@/styles/home.css';
import '@/styles/page-styles.css';
import { QuestionPromptBar, type WisdomQuestion } from '@/components/wisdom/QuestionPromptBar';
import { VoiceWisdomCapture } from '@/components/wisdom/VoiceWisdomCapture';
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal';

interface WisdomEntry {
  id: string;
  prompt_text: string;      // The question asked
  response_text?: string;   // The answer/wisdom
  audio_url?: string;
  tags?: string[];
  created_at: string;
  category: string;
  subcategory?: string;
}

type ViewMode = 'grid' | 'list' | 'timeline';
type SortMode = 'newest' | 'oldest' | 'alphabetical';

// Categories with icons and colors
const CATEGORIES = [
  { key: 'all', label: 'All Wisdom', icon: Brain, color: '#4A3552' },
  { key: 'life_lessons', label: 'Life Lessons', icon: Lightbulb, color: '#C4A235' },
  { key: 'relationships', label: 'Relationships', icon: Heart, color: '#B8562E' },
  { key: 'family', label: 'Family', icon: Users, color: '#2D5A3D' },
  { key: 'career', label: 'Career', icon: Briefcase, color: '#4A3552' },
  { key: 'parenting', label: 'Parenting', icon: Baby, color: '#8DACAB' },
  { key: 'health', label: 'Health', icon: Activity, color: '#5B8A72' },
  { key: 'spirituality', label: 'Spirituality', icon: Moon, color: '#6B5B95' },
  { key: 'creativity', label: 'Creativity', icon: Palette, color: '#E07C52' },
  { key: 'values', label: 'Values', icon: Compass, color: '#3D7068' },
  { key: 'recipes', label: 'Recipes', icon: Utensils, color: '#B8562E' },
  { key: 'advice', label: 'Advice', icon: GraduationCap, color: '#C4A235' },
  { key: 'other', label: 'Other', icon: HelpCircle, color: '#888888' },
];

export default function WisdomPage() {
  const [entries, setEntries] = useState<WisdomEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Engagement modal for creating wisdom
  const [engagementPrompt, setEngagementPrompt] = useState<{
    id: string;
    type: string;
    promptText: string;
    metadata?: Record<string, unknown>;
  } | null>(null);
  const [voiceQuestion, setVoiceQuestion] = useState<WisdomQuestion | null>(null);

  // Load wisdom entries
  useEffect(() => {
    loadWisdom();
  }, []);

  const loadWisdom = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Query knowledge_entries table
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('id, prompt_text, response_text, audio_url, tags, created_at, category, subcategory')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading wisdom:', error);
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  // Extract unique tags with counts
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => {
        const normalized = tag.toLowerCase().trim();
        if (normalized && !['wisdom', 'conversation', 'knowledge'].includes(normalized)) {
          tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
        }
      });
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [entries]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    entries.forEach(entry => {
      const cat = entry.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [entries]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter(e =>
        selectedTags.every(tag => 
          e.tags?.some(t => t.toLowerCase().trim() === tag)
        )
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.prompt_text?.toLowerCase().includes(q) ||
        e.response_text?.toLowerCase().includes(q) ||
        (Array.isArray(e.tags) && e.tags.some(t => t?.toLowerCase().includes(q)))
      );
    }

    // Sort
    switch (sortMode) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'alphabetical':
        result.sort((a, b) => (a.prompt_text || '').localeCompare(b.prompt_text || ''));
        break;
      default: // newest
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [entries, selectedCategory, selectedTags, searchQuery, sortMode]);

  // Group by date for timeline view
  const timelineGroups = useMemo(() => {
    if (viewMode !== 'timeline') return [];
    
    const groups: { date: string; entries: WisdomEntry[] }[] = [];
    const dateMap = new Map<string, WisdomEntry[]>();
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date)!.push(entry);
    });
    
    dateMap.forEach((entries, date) => groups.push({ date, entries }));
    return groups;
  }, [filteredEntries, viewMode]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getCategoryInfo = (key: string) => 
    CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

  const handleAudioPlay = (entryId: string, audioUrl: string) => {
    if (playingAudio === entryId) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(entryId);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setPlayingAudio(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="loading-container">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A3552]" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="page-header-title">Wisdom</h1>
                <p className="page-header-subtitle">
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'insight' : 'insights'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wisdom..."
                  className="form-input !pl-10 pr-10 w-48 sm:w-64"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 hover:text-[#2D5A3D]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center glass-card-page p-1">
                {[
                  { mode: 'grid' as ViewMode, icon: Grid3X3, label: 'Grid' },
                  { mode: 'list' as ViewMode, icon: List, label: 'List' },
                  { mode: 'timeline' as ViewMode, icon: Clock, label: 'Timeline' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === mode 
                        ? 'bg-[#2D5A3D] text-white' 
                        : 'text-[#2D5A3D]/60 hover:text-[#2D5A3D]'
                    }`}
                    title={label}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="form-select w-auto"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>

          {/* Category Filters - Horizontal scroll */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.key] || 0;
              const isActive = selectedCategory === cat.key;
              
              if (cat.key !== 'all' && count === 0) return null;
              
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`filter-btn flex-shrink-0 flex items-center gap-2 ${isActive ? 'filter-btn-active' : ''}`}
                >
                  <Icon size={14} />
                  {cat.label}
                  {count > 0 && <span className="opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Smart Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {allTags.slice(0, 8).map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-[#2D5A3D] text-white'
                      : 'glass-card-page text-gray-600 hover:text-[#2D5A3D]'
                  }`}
                >
                  <Tag size={10} className="inline mr-1" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Active Filters */}
        {(selectedCategory !== 'all' || selectedTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">Active:</span>
            {selectedCategory !== 'all' && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-[#4A3552]/10 text-[#4A3552] rounded-full text-sm">
                {getCategoryInfo(selectedCategory).label}
                <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-[#4A3552]/70">
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-full text-sm">
                {tag}
                <button onClick={() => toggleTag(tag)} className="ml-1 hover:text-[#2D5A3D]/70">
                  <X size={14} />
                </button>
              </span>
            ))}
            <button 
              onClick={() => { setSelectedCategory('all'); setSelectedTags([]); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Question Prompt Bar */}
        <QuestionPromptBar 
          onCreateWisdom={(question: WisdomQuestion) => {
            setEngagementPrompt({
              id: question.id,
              type: 'knowledge',
              promptText: question.question_text,
              metadata: {
                question_text: question.question_text,
                source: 'instant_question',
                category: question.category,
              },
            });
          }}
          onVoiceCapture={(question: WisdomQuestion) => {
            setVoiceQuestion(question);
          }}
        />

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </p>

        {/* Content */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16">
            <Brain size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">What would you tell your future self?</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Start capturing what you know.'}
            </p>
            <Link
              href="/dashboard/wisdom/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#234A31]"
            >
              <Plus size={18} />
              Add Your First Wisdom
            </Link>
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="space-y-8">
            {timelineGroups.map(group => (
              <div key={group.date}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-0 bg-gradient-to-br from-[#faf9f7] to-[#f5f3f0] py-2">
                  {group.date}
                </h3>
                <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                  {group.entries.map(entry => (
                    <WisdomCard 
                      key={entry.id} 
                      entry={entry} 
                      viewMode="list"
                      playingAudio={playingAudio}
                      onAudioPlay={handleAudioPlay}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <WisdomCard 
                key={entry.id} 
                entry={entry} 
                viewMode="list"
                playingAudio={playingAudio}
                onAudioPlay={handleAudioPlay}
              />
            ))}
          </div>
        ) : (
          /* Grid View - Square tiles */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredEntries.map(entry => (
              <WisdomCard 
                key={entry.id} 
                entry={entry} 
                viewMode="grid"
                playingAudio={playingAudio}
                onAudioPlay={handleAudioPlay}
              />
            ))}
          </div>
        )}
      </div>

      {/* Engagement Modal */}
      {engagementPrompt && (
        <UnifiedEngagementModal
          onClose={() => setEngagementPrompt(null)}
          prompt={engagementPrompt}
          onComplete={(result) => {
            setEngagementPrompt(null);
            loadWisdom();
          }}
        />
      )}

      {/* Voice Capture Modal */}
      {voiceQuestion && (
        <VoiceWisdomCapture
          question={voiceQuestion.question_text}
          category={voiceQuestion.category}
          onClose={() => setVoiceQuestion(null)}
          onSaved={() => {
            setVoiceQuestion(null);
            loadWisdom();
          }}
        />
      )}
    </div>
  );
}

// Wisdom Card Component
function WisdomCard({ 
  entry, 
  viewMode,
  playingAudio,
  onAudioPlay 
}: { 
  entry: WisdomEntry; 
  viewMode: ViewMode;
  playingAudio: string | null;
  onAudioPlay: (id: string, url: string) => void;
}) {
  const category = entry.category || 'other';
  const catInfo = CATEGORIES.find(c => c.key === category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = catInfo.icon;
  const isPlaying = playingAudio === entry.id;

  if (viewMode === 'list') {
    return (
      <Link href={`/dashboard/wisdom/${entry.id}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 
                   hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${catInfo.color}15` }}
          >
            <Icon size={20} style={{ color: catInfo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 group-hover:text-[#4A3552] transition-colors truncate">
              {entry.prompt_text || 'Untitled'}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {entry.response_text}
            </p>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.audio_url && (
              <button
                onClick={(e) => { e.preventDefault(); onAudioPlay(entry.id, entry.audio_url!); }}
                className="p-2 rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20 transition-colors"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}
            <span className="text-xs text-gray-400">
              {new Date(entry.created_at).toLocaleDateString()}
            </span>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Grid view - square cards with torn tape header
  return (
    <Link href={`/dashboard/wisdom/${entry.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 
                 hover:shadow-md transition-all cursor-pointer group aspect-square flex flex-col overflow-hidden relative"
      >
        {/* Torn Tape Header with Category */}
        <div 
          className="relative px-3 py-2 flex items-center gap-2"
          style={{ 
            backgroundColor: `${catInfo.color}15`,
            borderBottom: `2px solid ${catInfo.color}30`,
          }}
        >
          {/* Torn edge effect */}
          <svg 
            className="absolute bottom-0 left-0 right-0 translate-y-full" 
            viewBox="0 0 100 6" 
            preserveAspectRatio="none"
            style={{ height: '6px', width: '100%' }}
          >
            <path 
              d="M0 0 Q 5 6, 10 0 T 20 0 T 30 0 T 40 0 T 50 0 T 60 0 T 70 0 T 80 0 T 90 0 T 100 0 L 100 6 L 0 6 Z" 
              fill={`${catInfo.color}15`}
            />
          </svg>
          <Icon size={14} style={{ color: catInfo.color }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: catInfo.color }}>
            {catInfo.label}
          </span>
          {entry.audio_url && (
            <button
              onClick={(e) => { e.preventDefault(); onAudioPlay(entry.id, entry.audio_url!); }}
              className="ml-auto p-1 rounded-full hover:bg-white/50 transition-colors"
              style={{ color: catInfo.color }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-3 pt-4 flex-1 flex flex-col">
          <h3 className="font-medium text-gray-900 group-hover:text-[#4A3552] transition-colors line-clamp-2 mb-2 text-sm">
            {entry.prompt_text || 'Untitled'}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-4 flex-1">
            {entry.response_text}
          </p>
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-50">
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {entry.tags[0]}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
