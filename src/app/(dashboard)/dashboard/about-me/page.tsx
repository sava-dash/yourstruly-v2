'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import {
  Star, BookOpen, Music, Film,
  Utensils, MapPin, ChevronRight, ChefHat, Clock, Plus,
  Edit2, Trash2, ExternalLink, X, Loader2, Check, Sparkles,
  Car, Shirt, Trophy, Quote,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { ListItemCard } from '@/components/home-v2/cards/ListItemCard'
import '@/styles/page-styles.css'

// ── Editorial palette per category ──
// Each tab gets one of the four editorial colors so the pills, card flags,
// and avatar tiles all stay color-keyed to the same identity.
const FAV_CATEGORIES: {
  key: string
  label: string
  icon: any
  color: string
  ink: string
  includes?: string[]
}[] = [
  { key: 'music',     label: 'MUSIC',        icon: Music,    color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
  { key: 'movies',    label: 'MOVIES & TV',  icon: Film,     color: 'var(--ed-red, #E23B2E)',    ink: '#fff', includes: ['movies', 'tv_shows'] },
  { key: 'books',     label: 'BOOKS',        icon: BookOpen, color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
  { key: 'foods',     label: 'FOOD & DRINK', icon: Utensils, color: 'var(--ed-red, #E23B2E)',    ink: '#fff', includes: ['foods'] },
  { key: 'places',    label: 'PLACES',       icon: MapPin,   color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
  { key: 'lifestyle', label: 'LIFE & STYLE', icon: Sparkles, color: 'var(--ed-ink, #111)',       ink: '#fff', includes: ['cars', 'clothes', 'hobbies', 'sports_teams', 'quotes'] },
  { key: 'recipes',   label: 'RECIPES',      icon: ChefHat,  color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
]

// Sub-category options for merged tabs
const LIFESTYLE_SUBCATEGORIES = [
  { key: 'cars',         label: 'Cars',   icon: Car },
  { key: 'clothes',      label: 'Style',  icon: Shirt },
  { key: 'hobbies',      label: 'Hobbies', icon: Sparkles },
  { key: 'sports_teams', label: 'Sports', icon: Trophy },
  { key: 'quotes',       label: 'Quotes', icon: Quote },
]

const MOVIES_SUBCATEGORIES = [
  { key: 'movies',    label: 'Movies' },
  { key: 'tv_shows',  label: 'TV Shows' },
]

// Empty state quotes
const EMPTY_QUOTES = [
  "EVERY FAMILY HAS A STORY WORTH TELLING.",
  "THE THINGS YOU LOVE SAY MORE THAN ANY BIOGRAPHY.",
  "YOUR FAVORITES ARE THE SOUNDTRACK OF YOUR LIFE.",
  "WHAT YOU LOVE DEFINES WHO YOU ARE.",
  "THE BEST STORIES START WITH 'MY FAVORITE…'",
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
    if (!confirm('Remove this favorite?')) return
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
    const tab = FAV_CATEGORIES.find(c =>
      c.key === f.category || c.includes?.includes(f.category)
    )
    const key = tab?.key || f.category
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const catsWithItems = FAV_CATEGORIES.filter(c => grouped[c.key]?.length)
  const displayCategory = activeCategory || catsWithItems[0]?.key || FAV_CATEGORIES[0].key
  const displayItems = displayCategory ? (grouped[displayCategory] || []) : []
  const displayConfig = FAV_CATEGORIES.find(c => c.key === displayCategory)
  const totalFaves = favorites.length + recipes.length

  // ──────── Loading ────────
  if (loading) {
    return (
      <div
        className="relative min-h-screen"
        style={{ background: 'var(--ed-cream, #F3ECDC)', paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid var(--ed-ink, #111)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--ed-cream, #F3ECDC)',
        paddingTop: 80,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ───── Editorial header ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-6">
          <div>
            <h1
              className="text-[var(--ed-ink,#111)] leading-[0.85] tracking-[-0.02em] flex items-start gap-4"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(56px, 9vw, 116px)',
              }}
            >
              <span>
                MY<br />FAVES
              </span>
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: 36, height: 36, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 12 }}
              />
            </h1>
            <p className="mt-4 text-[14px] text-[var(--ed-muted,#6F6B61)] max-w-md">
              The things that make you, you.
            </p>
            {totalFaves > 0 && (
              <div
                className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[11px] sm:text-[12px] tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-red, #E23B2E)', fontWeight: 700 }}>
                    {favorites.length}
                  </span>
                  <span className="text-[var(--ed-ink,#111)]">FAVORITES</span>
                </span>
                {recipes.length > 0 && (
                  <>
                    <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                    <span>
                      <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-blue, #2A5CD3)', fontWeight: 700 }}>
                        {recipes.length}
                      </span>
                      <span className="text-[var(--ed-ink,#111)]">RECIPES</span>
                    </span>
                  </>
                )}
                <span aria-hidden className="text-[var(--ed-muted,#6F6B61)]">·</span>
                <span>
                  <span className="text-[18px] sm:text-[20px] mr-1.5" style={{ color: 'var(--ed-yellow, #F2C84B)', fontWeight: 700, WebkitTextStroke: '1px var(--ed-ink, #111)' }}>
                    {catsWithItems.length}
                  </span>
                  <span className="text-[var(--ed-ink,#111)]">CATEGORIES</span>
                </span>
              </div>
            )}
          </div>

          {/* Right: Add button keyed to active category */}
          <div className="flex flex-col gap-3 lg:items-end">
            <button
              onClick={() => setAddingTo(displayCategory)}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em] self-start lg:self-end"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <Plus size={13} strokeWidth={3} />
              ADD {displayConfig?.label || 'FAVE'}
            </button>
          </div>
        </div>

        {/* ───── Color-coded category pills ───── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FAV_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = displayCategory === cat.key
            const count = grouped[cat.key]?.length || (cat.key === 'recipes' ? recipes.length : 0)
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: isActive ? cat.color : 'var(--ed-paper, #FFFBF1)',
                  color: isActive ? cat.ink : 'var(--ed-ink, #111)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 999,
                }}
              >
                <Icon size={13} />
                {cat.label}
                {count > 0 && (
                  <span
                    className="inline-flex items-center justify-center text-[9px]"
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      background: isActive ? '#fff' : 'var(--ed-ink, #111)',
                      color: isActive ? 'var(--ed-ink, #111)' : '#fff',
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ───── Content area ───── */}
        {displayCategory === 'recipes' ? (
          recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe, i) => {
                const title =
                  recipe.prompt_text?.replace(/^(share|tell|what'?s|capture).*?:/i, '').trim() ||
                  recipe.response_text?.split('\n')[0]?.slice(0, 60) ||
                  'Untitled Recipe'
                return (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative"
                    style={{
                      background: 'var(--ed-paper, #FFFBF1)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-0 left-0"
                      style={{
                        width: 32,
                        height: 32,
                        background: 'var(--ed-yellow, #F2C84B)',
                        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                        borderRight: '2px solid var(--ed-ink, #111)',
                      }}
                    />
                    <div className="flex gap-3 p-4 pt-6">
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 44,
                          height: 44,
                          background: 'var(--ed-yellow, #F2C84B)',
                          color: 'var(--ed-ink, #111)',
                          border: '2px solid var(--ed-ink, #111)',
                          borderRadius: 2,
                        }}
                      >
                        <Utensils size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-[var(--ed-ink,#111)] leading-tight truncate"
                          style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: 15 }}
                        >
                          {title.toUpperCase()}
                        </h4>
                        {recipe.response_text && (
                          <p className="text-[12px] text-[var(--ed-muted,#6F6B61)] mt-1 line-clamp-2">
                            {recipe.response_text.slice(0, 150)}
                          </p>
                        )}
                        <div
                          className="flex items-center gap-2 mt-2 text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)]"
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                        >
                          {recipe.tags?.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-1.5 py-0.5"
                              style={{
                                background: 'var(--ed-cream, #F3ECDC)',
                                border: '1.5px solid var(--ed-ink, #111)',
                                color: 'var(--ed-ink, #111)',
                                borderRadius: 2,
                              }}
                            >
                              {t.toUpperCase()}
                            </span>
                          ))}
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(recipe.created_at)
                              .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              label="recipes"
              tip="Capture family recipes with ingredients, instructions, and the story behind them."
              accent="var(--ed-yellow, #F2C84B)"
              icon={<ChefHat size={24} className="text-[var(--ed-ink,#111)]" />}
              onAdd={() => setAddingTo('recipes')}
              addLabel="ADD RECIPE"
            />
          )
        ) : displayItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map((fav, i) => (
              <motion.div
                key={fav.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="relative group"
                style={{
                  background: 'var(--ed-paper, #FFFBF1)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 left-0"
                  style={{
                    width: 32,
                    height: 32,
                    background: displayConfig?.color || 'var(--ed-red, #E23B2E)',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    borderRight: '2px solid var(--ed-ink, #111)',
                  }}
                />

                <div className="flex gap-3 p-4 pt-6">
                  {fav.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fav.image_url}
                      alt={fav.item_name}
                      className="shrink-0 object-cover"
                      style={{
                        width: 56,
                        height: 56,
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    />
                  ) : (
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 56,
                        height: 56,
                        background: displayConfig?.color || 'var(--ed-red, #E23B2E)',
                        color: displayConfig?.ink || '#fff',
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    >
                      {displayConfig && <displayConfig.icon size={22} />}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-[var(--ed-ink,#111)] leading-tight truncate"
                      style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: 15 }}
                    >
                      {fav.item_name.toUpperCase()}
                    </h4>
                    {fav.rating && (
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={11}
                            className={s <= fav.rating! ? 'text-[var(--ed-red,#E23B2E)]' : 'text-[var(--ed-muted,#6F6B61)]/30'}
                            fill={s <= fav.rating! ? 'var(--ed-red, #E23B2E)' : 'none'}
                          />
                        ))}
                      </div>
                    )}
                    {fav.story && (
                      <p
                        className="text-[12px] text-[var(--ed-muted,#6F6B61)] mt-1.5 line-clamp-2 italic"
                        style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
                      >
                        &ldquo;{fav.story}&rdquo;
                      </p>
                    )}
                    {(fav.year || fav.associated_person) && (
                      <p
                        className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] mt-1.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        {fav.year && <span>{fav.year}</span>}
                        {fav.year && fav.associated_person && <span> · </span>}
                        {fav.associated_person && <span>VIA {fav.associated_person.toUpperCase()}</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer actions row */}
                <div
                  className="flex items-center gap-1.5 px-4 py-2"
                  style={{ borderTop: '2px solid var(--ed-ink, #111)' }}
                >
                  {fav.metadata?.externalUrl && (
                    <a
                      href={fav.metadata.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-[0.14em]"
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        background: 'var(--ed-cream, #F3ECDC)',
                        color: 'var(--ed-ink, #111)',
                        border: '1.5px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    >
                      <ExternalLink size={10} />
                      {displayCategory === 'music'
                        ? 'LISTEN'
                        : displayCategory === 'movies'
                        ? 'IMDB'
                        : displayCategory === 'books'
                        ? 'PREVIEW'
                        : 'VIEW'}
                    </a>
                  )}
                  {fav.metadata?.previewUrl && (
                    <audio src={fav.metadata.previewUrl} controls className="h-6 max-w-[140px]" />
                  )}
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => setEditingFav(fav)}
                      className="p-1.5"
                      style={{
                        background: 'var(--ed-paper, #FFFBF1)',
                        color: 'var(--ed-ink, #111)',
                        border: '1.5px solid var(--ed-ink, #111)',
                        borderRadius: 999,
                      }}
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteFavorite(fav.id)}
                      className="p-1.5"
                      style={{
                        background: 'var(--ed-paper, #FFFBF1)',
                        color: 'var(--ed-red, #E23B2E)',
                        border: '1.5px solid var(--ed-ink, #111)',
                        borderRadius: 999,
                      }}
                      title="Remove"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            label={displayConfig?.label.toLowerCase() || 'items'}
            tip="Add your first one to start building your collection."
            accent={displayConfig?.color || 'var(--ed-red, #E23B2E)'}
            icon={
              displayConfig ? (
                <displayConfig.icon size={24} className="text-[var(--ed-ink,#111)]" />
              ) : (
                <Star size={24} className="text-[var(--ed-ink,#111)]" />
              )
            }
            onAdd={() => setAddingTo(displayCategory)}
            addLabel={`ADD ${displayConfig?.label || 'FAVE'}`}
          />
        )}

        {/* Empty-everything quote (no profile, no favorites, no recipes) */}
        {!profile?.personality_type &&
          !profile?.favorite_quote &&
          favorites.length === 0 &&
          recipes.length === 0 && (
          <div className="text-center py-12 mt-12">
            <p
              className="text-[11px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)] mb-3"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              ✦ A LITTLE WISDOM
            </p>
            <h2
              className="text-xl text-[var(--ed-ink,#111)] max-w-xl mx-auto leading-snug"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              {EMPTY_QUOTES[Math.floor(Math.random() * EMPTY_QUOTES.length)]}
            </h2>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/*  EDIT FAVORITE MODAL                        */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {editingFav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={() => setEditingFav(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden"
              style={{
                background: 'var(--ed-cream, #F3ECDC)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
                height: 600,
              }}
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

      {/* ══════════════════════════════════════════ */}
      {/*  ADD MODAL — recipe form / sub-cat picker / ListItemCard */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {addingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={() => {
              setAddingTo(null)
              setAddSubCategory(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto"
              style={{
                background: 'var(--ed-cream, #F3ECDC)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              {addingTo === 'recipes' ? (
                <RecipeForm
                  onSave={async (recipe) => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const { data: inserted } = await supabase
                      .from('knowledge_entries')
                      .insert({
                        user_id: user.id,
                        category: 'recipes',
                        prompt_text: recipe.name,
                        response_text: `${recipe.story ? recipe.story + '\n\n' : ''}**Ingredients:**\n${recipe.ingredients}\n\n**Instructions:**\n${recipe.instructions}${recipe.tips ? '\n\n**Tips:**\n' + recipe.tips : ''}`,
                        tags: [recipe.cuisine, recipe.difficulty].filter(Boolean),
                      })
                      .select('id, prompt_text, response_text, audio_url, tags, created_at')
                      .single()
                    if (inserted) setRecipes((prev) => [inserted, ...prev])
                    setAddingTo(null)
                  }}
                  onClose={() => setAddingTo(null)}
                />
              ) : (addingTo === 'lifestyle' || addingTo === 'movies') && !addSubCategory ? (
                <SubcategoryPicker
                  parent={addingTo}
                  options={addingTo === 'lifestyle' ? LIFESTYLE_SUBCATEGORIES : MOVIES_SUBCATEGORIES}
                  onPick={(key) => setAddSubCategory(key)}
                  onClose={() => setAddingTo(null)}
                />
              ) : (
                <div style={{ height: 600 }}>
                  <ListItemCard
                    category={addSubCategory || addingTo}
                    promptText={`Add a favorite ${
                      addSubCategory
                        ? LIFESTYLE_SUBCATEGORIES.find((s) => s.key === addSubCategory)?.label ||
                          MOVIES_SUBCATEGORIES.find((s) => s.key === addSubCategory)?.label ||
                          addSubCategory
                        : FAV_CATEGORIES.find((c) => c.key === addingTo)?.label?.toLowerCase() || 'item'
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
    </div>
  )
}

// ── Editorial empty state used by every category ──────────────────────────
function EmptyState({
  label,
  tip,
  accent,
  icon,
  onAdd,
  addLabel,
}: {
  label: string
  tip: string
  accent: string
  icon: React.ReactNode
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 px-6"
      style={{
        background: 'var(--ed-paper, #FFFBF1)',
        border: '2px solid var(--ed-ink, #111)',
        borderRadius: 2,
      }}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 56,
          height: 56,
          background: accent,
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 999,
        }}
      >
        {icon}
      </div>
      <p
        className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
        style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
      >
        NO {label.toUpperCase()} YET
      </p>
      <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-5 max-w-sm">{tip}</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-5 py-2.5 text-[10px] tracking-[0.18em]"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 700,
          background: 'var(--ed-red, #E23B2E)',
          color: '#fff',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        <Plus size={12} strokeWidth={3} />
        {addLabel}
      </button>
    </div>
  )
}

// ── Subcategory picker for lifestyle / movies ─────────────────────────────
function SubcategoryPicker({
  parent,
  options,
  onPick,
  onClose,
}: {
  parent: string
  options: { key: string; label: string }[]
  onPick: (key: string) => void
  onClose: () => void
}) {
  const parentLabel = parent === 'lifestyle' ? 'LIFE & STYLE' : 'MOVIES & TV'
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p
            className="text-[10px] tracking-[0.22em] text-[var(--ed-muted,#6F6B61)]"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
          >
            ADD TO {parentLabel}
          </p>
          <h3
            className="text-[var(--ed-ink,#111)] leading-tight"
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 24,
            }}
          >
            CHOOSE A TYPE
          </h3>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: '2px solid var(--ed-ink, #111)',
            background: 'var(--ed-paper, #FFFBF1)',
          }}
          aria-label="Close"
        >
          <X size={14} className="text-[var(--ed-ink,#111)]" />
        </button>
      </div>
      <div className="space-y-2 mt-4">
        {options.map((sub) => (
          <button
            key={sub.key}
            onClick={() => onPick(sub.key)}
            className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-[var(--ed-ink,#111)] font-semibold transition-transform hover:-translate-y-0.5"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            {sub.label}
            <ChevronRight size={14} className="text-[var(--ed-muted,#6F6B61)]" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Recipe form (editorial) ───────────────────────────────────────────────
function RecipeForm({
  onSave,
  onClose,
}: {
  onSave: (recipe: {
    name: string
    story: string
    ingredients: string
    instructions: string
    tips: string
    cuisine: string
    difficulty: string
  }) => void
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
    await onSave({
      name: name.trim(),
      story: story.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      tips: tips.trim(),
      cuisine,
      difficulty,
    })
    setSaving(false)
  }

  const labelClass =
    'block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1'
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    fontWeight: 700,
  }

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              background: 'var(--ed-yellow, #F2C84B)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <ChefHat size={14} className="text-[var(--ed-ink,#111)]" />
          </span>
          <div>
            <p
              className="text-[10px] tracking-[0.22em] text-[var(--ed-muted,#6F6B61)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              NEW RECIPE
            </p>
            <h3
              className="text-[var(--ed-ink,#111)] leading-tight"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 22,
              }}
            >
              ADD RECIPE
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: '2px solid var(--ed-ink, #111)',
            background: 'var(--ed-paper, #FFFBF1)',
          }}
          aria-label="Close"
        >
          <X size={14} className="text-[var(--ed-ink,#111)]" />
        </button>
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>RECIPE NAME *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Grandma's Sunday Sauce"
          className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
        />
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>THE STORY BEHIND IT</label>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Who made this? Why does it matter?"
          rows={2}
          className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input resize-none"
        />
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>INGREDIENTS</label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="One ingredient per line…"
          rows={4}
          className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input resize-none"
        />
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>INSTRUCTIONS</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step by step…"
          rows={4}
          className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input resize-none"
        />
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>TIPS &amp; SECRETS</label>
        <textarea
          value={tips}
          onChange={(e) => setTips(e.target.value)}
          placeholder="Any special tricks?"
          rows={2}
          className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input resize-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} style={labelStyle}>CUISINE</label>
          <input
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Italian, Mexican…"
            className="w-full px-3 py-2 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} style={labelStyle}>DIFFICULTY</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 text-sm text-[var(--ed-ink,#111)] focus:outline-none editorial-input"
          >
            <option value="">Select…</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="w-full flex items-center justify-center gap-2 py-3 text-[10px] tracking-[0.18em] disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 700,
          background: 'var(--ed-red, #E23B2E)',
          color: '#fff',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
        {saving ? 'SAVING…' : 'SAVE RECIPE'}
      </button>
    </div>
  )
}
