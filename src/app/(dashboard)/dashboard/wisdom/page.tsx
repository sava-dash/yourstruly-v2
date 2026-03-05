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
  title: string;
  description: string;
  audio_url?: string;
  tags: string[];
  created_at: string;
  category?: string;
  ai_category?: string;
}

type ViewMode = 'grid' | 'list' | 'timeline';
type SortMode = 'newest' | 'oldest' | 'alphabetical';

// Categories with icons and colors
const CATEGORIES = [
  { key: 'all', label: 'All Wisdom', icon: Brain, color: '#4A3552' },
  { key: 'life_lessons', label: 'Life Lessons', icon: Lightbulb, color: '#D9C61A' },
  { key: 'relationships', label: 'Relationships', icon: Heart, color: '#C35F33' },
  { key: 'family', label: 'Family', icon: Users, color: '#406A56' },
  { key: 'career', label: 'Career', icon: Briefcase, color: '#4A3552' },
  { key: 'parenting', label: 'Parenting', icon: Baby, color: '#8DACAB' },
  { key: 'health', label: 'Health', icon: Activity, color: '#5B8A72' },
  { key: 'spirituality', label: 'Spirituality', icon: Moon, color: '#6B5B95' },
  { key: 'creativity', label: 'Creativity', icon: Palette, color: '#E07C52' },
  { key: 'values', label: 'Values', icon: Compass, color: '#3D7068' },
  { key: 'recipes', label: 'Recipes', icon: Utensils, color: '#C35F33' },
  { key: 'advice', label: 'Advice', icon: GraduationCap, color: '#D9C61A' },
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

    // Query knowledge_entries table (NOT memories with memory_type=wisdom)
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('id, title, description, audio_url, tags, created_at, category, ai_category')
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
      const cat = entry.category || entry.ai_category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [entries]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(e => 
        e.category === selectedCategory || e.ai_category === selectedCategory
      );
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
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortMode) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'alphabetical':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A3552]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#faf9f7] to-[#f5f3f0]">
      {/* Left Sidebar */}
      <aside 
        className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-white border-r border-gray-200 
                    sticky top-0 h-screen overflow-y-auto transition-all duration-300`}
      >
        <div className="p-4">
          {/* Back + Title */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </Link>
            {!sidebarCollapsed && (
              <h1 className="text-lg font-semibold text-[#4A3552]">Wisdom</h1>
            )}
          </div>

          {/* Categories */}
          <nav className="space-y-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.key] || 0;
              const isActive = selectedCategory === cat.key;
              
              if (cat.key !== 'all' && count === 0) return null;
              
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${isActive 
                      ? 'bg-[#4A3552] text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon size={18} style={{ color: isActive ? 'white' : cat.color }} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {count}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Smart Tags */}
          {!sidebarCollapsed && allTags.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
                Smart Tags
              </h3>
              <div className="flex flex-wrap gap-1.5 px-2">
                {allTags.slice(0, 12).map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-xs rounded-full transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-[#406A56] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mt-6 w-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight 
              size={18} 
              className={`mx-auto transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} 
            />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search wisdom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl
                       focus:ring-2 focus:ring-[#4A3552]/20 focus:border-[#4A3552] outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
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
                    ? 'bg-[#4A3552] text-white' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={label}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm
                     focus:ring-2 focus:ring-[#4A3552]/20 focus:border-[#4A3552] outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">A-Z</option>
          </select>

          {/* Add Wisdom Button */}
          <Link
            href="/dashboard/wisdom/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#406A56] text-white rounded-xl
                     hover:bg-[#345745] transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Add Wisdom
          </Link>
        </div>

        {/* Active Filters */}
        {(selectedCategory !== 'all' || selectedTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Filters:</span>
            {selectedCategory !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-[#4A3552]/10 text-[#4A3552] rounded-full text-sm">
                {getCategoryInfo(selectedCategory).label}
                <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-[#4A3552]/70">
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-[#406A56]/10 text-[#406A56] rounded-full text-sm">
                {tag}
                <button onClick={() => toggleTag(tag)} className="ml-1 hover:text-[#406A56]/70">
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
            <h3 className="text-lg font-medium text-gray-600 mb-2">No wisdom found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Start capturing your wisdom'}
            </p>
            <Link
              href="/dashboard/wisdom/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#406A56] text-white rounded-xl hover:bg-[#345745]"
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
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      </main>

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
  const category = entry.category || entry.ai_category || 'other';
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
              {entry.title || 'Untitled'}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {entry.description}
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
                className="p-2 rounded-full bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20 transition-colors"
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

  // Grid view
  return (
    <Link href={`/dashboard/wisdom/${entry.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 
                 hover:shadow-md transition-all cursor-pointer group h-full flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${catInfo.color}15` }}
          >
            <Icon size={16} style={{ color: catInfo.color }} />
          </div>
          {entry.audio_url && (
            <button
              onClick={(e) => { e.preventDefault(); onAudioPlay(entry.id, entry.audio_url!); }}
              className="p-1.5 rounded-full bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20 transition-colors"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}
        </div>
        <h3 className="font-medium text-gray-900 group-hover:text-[#4A3552] transition-colors line-clamp-2 mb-2">
          {entry.title || 'Untitled'}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-3 flex-1">
          {entry.description}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {new Date(entry.created_at).toLocaleDateString()}
          </span>
          {entry.tags && entry.tags.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {entry.tags[0]}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
