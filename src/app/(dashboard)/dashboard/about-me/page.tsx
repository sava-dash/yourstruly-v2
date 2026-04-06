'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import {
  Star, Sparkles, BookOpen, Music, Film,
  Utensils, MapPin, ChevronRight, ChefHat, Clock, Plus,
  Edit2, Trash2, ExternalLink, X, Loader2, Check,
} from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { ListItemCard } from '@/components/home-v2/cards/ListItemCard'
import '@/styles/page-styles.css'

// ── Category config for favorites ──
const FAV_CATEGORIES: {
  key: string; label: string; icon: any; color: string; bg: string; includes?: string[]
}[] = [
  { key: 'music', label: 'Music', icon: Music, color: '#6B5B95', bg: '#EFEAF5' },
  { key: 'movies', label: 'Movies & TV', icon: Film, color: '#B8562E', bg: '#FBF0EB', includes: ['movies', 'tv_shows'] },
  { key: 'books', label: 'Books', icon: BookOpen, color: '#2D5A3D', bg: '#E6F0EA' },
  { key: 'foods', label: 'Food & Drink', icon: Utensils, color: '#B8562E', bg: '#FBF0EB', includes: ['foods'] },
  { key: 'places', label: 'Places', icon: MapPin, color: '#2D5A3D', bg: '#E6F0EA' },
  { key: 'lifestyle', label: 'Life & Style', icon: Sparkles, color: '#C4A235', bg: '#FAF5E4', includes: ['cars', 'clothes', 'hobbies', 'sports_teams', 'quotes'] },
  { key: 'recipes', label: 'Recipes', icon: ChefHat, color: '#B8562E', bg: '#FBF0EB' },
]

// Sub-category options for merged tabs
const LIFESTYLE_SUBCATEGORIES = [
  { key: 'cars', label: 'Cars' },
  { key: 'clothes', label: 'Style' },
  { key: 'hobbies', label: 'Hobbies' },
  { key: 'sports_teams', label: 'Sports' },
  { key: 'quotes', label: 'Quotes' },
]

const MOVIES_SUBCATEGORIES = [
  { key: 'movies', label: 'Movies' },
  { key: 'tv_shows', label: 'TV Shows' },
]

// Empty state quotes
const EMPTY_QUOTES = [
  "Every family has a story worth telling.",
  "The things you love say more about you than any biography.",
  "Your favorites are the soundtrack of your life.",
  "What you love defines who you are.",
  "The best stories start with 'my favorite...'",
]

interface Favorite {
  id: string
  category: string
  item_name: string
  story: string | null
  image_url: string | null
  year: string | null
  associated_person: string | null
  rating: number | null
  metadata?: { previewUrl?: string; externalUrl?: string }
}

interface Recipe {
  id: string
  prompt_text: string
  response_text: string | null
  audio_url: string | null
  tags: string[]
  created_at: string
}

interface Profile {
  personality_type: string | null
  personality_traits: string[]
  interests: string[]
  hobbies: string[]
  skills: string[]
  life_goals: string[]
  religions: string[]
  favorite_quote: string | null
  personal_motto: string | null
}

export default function AboutMePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingFav, setEditingFav] = useState<Favorite | null>(null)
  const [addSubCategory, setAddSubCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const handleAddFavorite = async (category: string, data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[Favorites] No user — cannot save')
      return
    }

    console.log('[Favorites] Attempting to save:', { category, item: data.item, userId: user.id })

    const { data: inserted, error } = await supabase.from('favorites').insert({
      user_id: user.id,
      category,
      item_name: data.item,
      story: data.story || null,
      image_url: data.imageUrl || null,
      year: data.year || null,
      associated_person: data.person || null,
      rating: data.rating || null,
      metadata: data.metadata || {},
    }).select().single()

    if (error) {
      console.error('[Favorites] DB save failed:', error.message, error.details, error.hint, error.code)
      alert(`Failed to save favorite: ${error.message}\n\nDetails: ${error.details || 'none'}\nCheck browser console for more info.`)
      // Fallback: add to local state even if DB fails (migration may not be applied)
      setFavorites(prev => [...prev, {
        id: `local-${Date.now()}`,
        category,
        item_name: data.item,
        story: data.story || null,
        image_url: data.imageUrl || null,
        year: data.year || null,
        associated_person: data.person || null,
        rating: data.rating || null,
        metadata: data.metadata || {},
      } as any])
    } else if (inserted) {
      setFavorites(prev => [...prev, inserted])
    }
    setAddingTo(null)
  }

  const handleEditFavorite = async (favId: string, data: any) => {
    const { error } = await supabase.from('favorites').update({
      item_name: data.item,
      story: data.story || null,
      image_url: data.imageUrl || null,
      year: data.year || null,
      associated_person: data.person || null,
      rating: data.rating || null,
      metadata: data.metadata || {},
    }).eq('id', favId)

    if (!error) {
      setFavorites(prev => prev.map(f => f.id === favId ? {
        ...f, item_name: data.item, story: data.story, image_url: data.imageUrl,
        year: data.year, associated_person: data.person, rating: data.rating,
      } : f))
    }
    setEditingFav(null)
  }

  const handleDeleteFavorite = async (favId: string) => {
    await supabase.from('favorites').delete().eq('id', favId)
    setFavorites(prev => prev.filter(f => f.id !== favId))
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, favRes, recipeRes] = await Promise.all([
        supabase.from('profiles').select('personality_type, personality_traits, interests, hobbies, skills, life_goals, religions, favorite_quote, personal_motto').eq('id', user.id).single(),
        supabase.from('favorites').select('*').eq('user_id', user.id).order('category').order('sort_order'),
        // Filter client-side since 'recipes' may not be in the knowledge_category enum yet
        supabase.from('knowledge_entries').select('id, prompt_text, response_text, audio_url, tags, created_at, category').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      ])

      console.log('[Favorites] Loaded:', {
        favCount: favRes.data?.length || 0,
        favError: favRes.error?.message,
        userId: user.id,
      })
      if (profileRes.data) setProfile(profileRes.data)
      if (favRes.data) setFavorites(favRes.data)
      if (favRes.error) console.error('[Favorites] Load error:', favRes.error)
      // Client-side filter to only keep recipe-category entries
      if (recipeRes.data) {
        const recipesOnly = recipeRes.data.filter((r: any) =>
          r.category === 'recipes' || r.category === 'practical' ||
          /recipe|cook|bake|ingredient/i.test(r.prompt_text || '') ||
          /recipe|cook|bake|ingredient/i.test(r.response_text || '')
        )
        setRecipes(recipesOnly)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Group favorites by category, mapping sub-categories to their parent tab
  const grouped = favorites.reduce<Record<string, Favorite[]>>((acc, f) => {
    // Find which tab this favorite belongs to
    const tab = FAV_CATEGORIES.find(c =>
      c.key === f.category || c.includes?.includes(f.category)
    )
    const key = tab?.key || f.category
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  // Show all categories — active tab defaults to first with items, or first overall
  const catsWithItems = FAV_CATEGORIES.filter(c => grouped[c.key]?.length)
  const displayCategory = activeCategory || catsWithItems[0]?.key || FAV_CATEGORIES[0].key
  const displayItems = displayCategory ? (grouped[displayCategory] || []) : []
  const displayConfig = FAV_CATEGORIES.find(c => c.key === displayCategory)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#1A1F1C]" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
          My Faves
        </h1>
        <p className="text-[#94A09A] text-sm mt-1">The things that make you, you.</p>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/*  MY FAVORITES                               */}
      {/* ══════════════════════════════════════════ */}
      <section className="mb-10">
        <SectionHeader icon={Star} label="My Favorites" color="#B8562E" />

        {/* Category tabs — horizontal scroll, ALL categories shown */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4" style={{ scrollbarWidth: 'none' }}>
          {FAV_CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isActive = displayCategory === cat.key
            const count = grouped[cat.key]?.length || 0
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-[#FAFAF7] text-[#5A6660] hover:bg-[#F0F0EC] border border-[#E8E2D8]'
                }`}
                style={isActive ? { background: cat.color } : undefined}
              >
                <Icon size={14} />
                {cat.label}
                {count > 0 && (
                  <span className={`text-xs ${isActive ? 'text-white/70' : 'text-[#94A09A]'}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Add button for active category */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setAddingTo(displayCategory)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#234A31] active:scale-[0.96] transition-all"
          >
            <Plus size={14} /> Add {displayConfig?.label}
          </button>
        </div>

        {/* Content — recipes tab shows recipe cards, others show favorites */}
        {displayCategory === 'recipes' ? (
          recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recipes.map((recipe, i) => {
                const title = recipe.prompt_text?.replace(/^(share|tell|what'?s|capture).*?:/i, '').trim()
                  || recipe.response_text?.split('\n')[0]?.slice(0, 60) || 'Untitled Recipe'
                return (
                  <motion.div key={recipe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-[#E8E2D8] bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-3 p-4">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FBF0EB]">
                        <Utensils size={20} className="text-[#B8562E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#1A1F1C] text-sm">{title}</h4>
                        {recipe.response_text && <p className="text-xs text-[#5A6660] mt-1 line-clamp-2">{recipe.response_text.slice(0, 150)}</p>}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A09A]">
                          {recipe.tags?.slice(0, 2).map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-[#B8562E]/10 text-[#B8562E]">{t}</span>)}
                          <Clock size={10} /> {new Date(recipe.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-[#E8E2D8]">
              <Utensils size={22} className="text-[#B8562E]/30 mx-auto mb-2" />
              <p className="text-sm text-[#5A6660] font-medium mb-1">No recipes added yet</p>
              <p className="text-xs text-[#94A09A] mb-4">Capture family recipes with ingredients, instructions, and the story behind them</p>
              <button onClick={() => setAddingTo('recipes')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#234A31] active:scale-[0.96] transition-all">
                <Plus size={14} /> Add Recipe
              </button>
            </div>
          )
        ) : displayItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayItems.map((fav, i) => (
              <motion.div
                key={fav.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-[#E8E2D8] overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3 p-4">
                  {fav.image_url ? (
                    <img src={fav.image_url} alt={fav.item_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: displayConfig?.bg }}>
                      {displayConfig && <displayConfig.icon size={20} style={{ color: displayConfig.color }} />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[#1A1F1C] text-sm truncate">{fav.item_name}</h4>
                    {fav.rating && (
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={10} className={s <= fav.rating! ? 'text-[#C4A235]' : 'text-[#E8E2D8]'} fill={s <= fav.rating! ? '#C4A235' : 'none'} />
                        ))}
                      </div>
                    )}
                    {fav.story && (
                      <p className="text-xs text-[#5A6660] mt-1 line-clamp-2 italic">&ldquo;{fav.story}&rdquo;</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A09A]">
                      {fav.year && <span>{fav.year}</span>}
                      {fav.associated_person && <><span>·</span><span>via {fav.associated_person}</span></>}
                    </div>
                    {/* Actions row */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E8E2D8]">
                      {fav.metadata?.externalUrl && (
                        <a
                          href={fav.metadata.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                        >
                          <ExternalLink size={10} />
                          {displayCategory === 'music' ? 'Listen' : displayCategory === 'movies' || displayCategory === 'tv_shows' ? 'IMDB' : displayCategory === 'books' ? 'Preview' : 'View'}
                        </a>
                      )}
                      {fav.metadata?.previewUrl && (
                        <audio src={fav.metadata.previewUrl} controls className="h-6 flex-1 max-w-[120px]" />
                      )}
                      <div className="ml-auto flex gap-0.5">
                        <button
                          onClick={() => setEditingFav(fav)}
                          className="p-1.5 text-[#94A09A] hover:text-[#2D5A3D] hover:bg-[#E6F0EA] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteFavorite(fav.id)}
                          className="p-1.5 text-[#94A09A] hover:text-[#B8562E] hover:bg-[#FBF0EB] rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-[#E8E2D8]">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: displayConfig?.bg }}>
              {displayConfig && <displayConfig.icon size={22} style={{ color: displayConfig.color }} />}
            </div>
            <p className="text-sm text-[#5A6660] font-medium mb-1">No {displayConfig?.label?.toLowerCase()} added yet</p>
            <p className="text-xs text-[#94A09A] mb-4">Add your first one to start building your collection</p>
            <button
              onClick={() => setAddingTo(displayCategory)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#234A31] active:scale-[0.96] transition-all"
            >
              <Plus size={14} /> Add {displayConfig?.label}
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════ */}
      {/*  ADD FAVORITE MODAL                         */}
      {/* ══════════════════════════════════════════ */}
      {/* Edit modal */}
      <AnimatePresence>
        {editingFav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingFav(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              style={{ height: '600px' }}
            >
              <ListItemCard
                category={editingFav.category}
                promptText={`Edit ${editingFav.item_name}`}
                data={{
                  item: editingFav.item_name,
                  story: editingFav.story || '',
                  imageUrl: editingFav.image_url || '',
                  year: editingFav.year || '',
                  person: editingFav.associated_person || '',
                  rating: editingFav.rating || 0,
                  metadata: editingFav.metadata,
                }}
                onSave={(data) => handleEditFavorite(editingFav.id, data)}
                saved={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal — recipe form or ListItemCard */}
      <AnimatePresence>
        {addingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => { setAddingTo(null); setAddSubCategory(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {addingTo === 'recipes' ? (
                <RecipeForm onSave={async (recipe) => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  const { data: inserted } = await supabase.from('knowledge_entries').insert({
                    user_id: user.id,
                    category: 'recipes',
                    prompt_text: recipe.name,
                    response_text: `${recipe.story ? recipe.story + '\n\n' : ''}**Ingredients:**\n${recipe.ingredients}\n\n**Instructions:**\n${recipe.instructions}${recipe.tips ? '\n\n**Tips:**\n' + recipe.tips : ''}`,
                    tags: [recipe.cuisine, recipe.difficulty].filter(Boolean),
                  }).select('id, prompt_text, response_text, audio_url, tags, created_at').single()
                  if (inserted) setRecipes(prev => [inserted, ...prev])
                  setAddingTo(null)
                }} onClose={() => setAddingTo(null)} />
              ) : (addingTo === 'lifestyle' || addingTo === 'movies') && !addSubCategory ? (
                /* Sub-category selector for merged tabs */
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#1A1F1C]">
                      Add to {FAV_CATEGORIES.find(c => c.key === addingTo)?.label}
                    </h3>
                    <button onClick={() => setAddingTo(null)} className="p-1 text-[#94A09A] hover:text-[#5A6660]">
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-[#94A09A]">Choose a sub-category:</p>
                  <div className="space-y-2">
                    {(addingTo === 'lifestyle' ? LIFESTYLE_SUBCATEGORIES : MOVIES_SUBCATEGORIES).map(sub => (
                      <button
                        key={sub.key}
                        onClick={() => setAddSubCategory(sub.key)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-[#E8E2D8] hover:bg-[#FAFAF7] text-sm font-medium text-[#1A1F1C] transition-colors flex items-center justify-between"
                      >
                        {sub.label}
                        <ChevronRight size={14} className="text-[#94A09A]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '600px' }}>
                  <ListItemCard
                    category={addSubCategory || addingTo}
                    promptText={`Add a favorite ${
                      addSubCategory
                        ? (LIFESTYLE_SUBCATEGORIES.find(s => s.key === addSubCategory)?.label
                          || MOVIES_SUBCATEGORIES.find(s => s.key === addSubCategory)?.label
                          || addSubCategory)
                        : (FAV_CATEGORIES.find(c => c.key === addingTo)?.label?.toLowerCase() || 'item')
                    }`}
                    data={{}}
                    onSave={(data) => {
                      handleAddFavorite(addSubCategory || addingTo, data)
                      setAddSubCategory(null)
                    }}
                    saved={false}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════ */}


      {/* Empty state */}
      {!profile?.personality_type && !profile?.favorite_quote && favorites.length === 0 && recipes.length === 0 && (
        <div className="text-center py-16">
          <Sparkles size={40} className="text-[#DDE3DF] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#1A1F1C] mb-2" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)', fontStyle: 'italic' }}>
            &ldquo;{EMPTY_QUOTES[Math.floor(Math.random() * EMPTY_QUOTES.length)]}&rdquo;
          </h2>
          <p className="text-sm text-[#94A09A] max-w-md mx-auto">
            Answer engagement prompts on the Home screen to fill in your personality, interests, and favorites. Over time, this page becomes a rich portrait of who you are.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Section header ──
function SectionHeader({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <h2 className="text-lg font-bold text-[#1A1F1C]">{label}</h2>
    </div>
  )
}

// ── Recipe form ──
function RecipeForm({ onSave, onClose }: {
  onSave: (recipe: { name: string; story: string; ingredients: string; instructions: string; tips: string; cuisine: string; difficulty: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [story, setStory] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tips, setTips] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), story: story.trim(), ingredients: ingredients.trim(), instructions: instructions.trim(), tips: tips.trim(), cuisine, difficulty })
    setSaving(false)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FBF0EB] flex items-center justify-center">
            <ChefHat size={16} className="text-[#B8562E]" />
          </div>
          <h3 className="font-semibold text-[#1A1F1C]">Add Recipe</h3>
        </div>
        <button onClick={onClose} className="p-1 text-[#94A09A] hover:text-[#5A6660]">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Recipe Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Grandma's Sunday Sauce" className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]" />
      </div>

      <div>
        <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">The Story Behind It</label>
        <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Who made this? Why does it matter?" rows={2} className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none" />
      </div>

      <div>
        <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Ingredients</label>
        <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="One ingredient per line..." rows={4} className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none" />
      </div>

      <div>
        <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Instructions</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Step by step..." rows={4} className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none" />
      </div>

      <div>
        <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Tips & Secrets</label>
        <textarea value={tips} onChange={e => setTips(e.target.value)} placeholder="Any special tricks?" rows={2} className="w-full px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Cuisine</label>
          <input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian, Mexican..." className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-xs focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]" />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-[#94A09A] uppercase tracking-wider font-semibold mb-1">Difficulty</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-xs focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 text-[#1A1F1C]">
            <option value="">Select...</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <button onClick={handleSave} disabled={!name.trim() || saving} className="w-full py-3 rounded-xl text-sm font-medium bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save Recipe</>}
      </button>
    </div>
  )
}
