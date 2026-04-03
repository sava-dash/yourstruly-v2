'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, Calendar, MapPin, Heart, Briefcase, BookOpen, 
  Music, Film, Utensils, Target, Camera, Edit2, X, Loader2,
  Brain, Star, GraduationCap, ChevronLeft, Check, Upload, Quote, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/home.css'
import '@/styles/page-styles.css'
import EssenceFingerprintLoader from '@/components/profile/EssenceFingerprintLoader'
import { generateEssenceVector, hasProfileData } from '@/lib/essence'
import PersonalityQuiz from '@/components/profile/PersonalityQuiz'
import { 
  OCCUPATION_OPTIONS, INTEREST_OPTIONS, LANGUAGE_OPTIONS, 
  RELIGION_OPTIONS, EDUCATION_LEVEL_OPTIONS,
  HOBBY_OPTIONS, SKILL_OPTIONS, LIFE_GOAL_OPTIONS, PERSONALITY_TRAIT_OPTIONS,
  BOOK_SUGGESTIONS, MOVIE_SUGGESTIONS, MUSIC_SUGGESTIONS, FOOD_SUGGESTIONS,
  QuizResult
} from '@/lib/personalityQuiz'

interface Education {
  id: string
  school_name: string
  degree: string
  field_of_study: string
  start_year: number | null
  graduation_year: number | null
  is_current: boolean
}

interface Profile {
  full_name: string
  avatar_url: string
  date_of_birth: string
  gender: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  zipcode: string
  biography: string
  personal_motto: string
  personality_type: string
  personality_traits: string[]
  interests: string[]
  skills: string[]
  hobbies: string[]
  life_goals: string[]
  religions: string[]
  languages: string[]
  occupation: string
  company: string
  education_level: string
  school_name: string
  degree: string
  favorite_quote: string
  favorite_books: string[]
  favorite_movies: string[]
  favorite_music: string[]
  favorite_foods: string[]
  emergency_contact_ids: string[]
  education_history: Education[]
}

interface Contact {
  id: string
  full_name: string
  avatar_url?: string
  relationship?: string
  relationship_type?: string
  phone?: string
  email?: string
}

const PERSONALITY_TYPES = [
  'INTJ - Architect', 'INTP - Logician', 'ENTJ - Commander', 'ENTP - Debater',
  'INFJ - Advocate', 'INFP - Mediator', 'ENFJ - Protagonist', 'ENFP - Campaigner',
  'ISTJ - Logistician', 'ISFJ - Defender', 'ESTJ - Executive', 'ESFJ - Consul',
  'ISTP - Virtuoso', 'ISFP - Adventurer', 'ESTP - Entrepreneur', 'ESFP - Entertainer',
  'Not sure / Don\'t know'
]

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const emptyProfile: Profile = {
  full_name: '', avatar_url: '', date_of_birth: '', gender: '', phone: '',
  address: '', city: '', state: '', country: '', zipcode: '',
  biography: '', personal_motto: '', personality_type: '',
  personality_traits: [], interests: [], skills: [], hobbies: [], life_goals: [],
  religions: [], languages: [], occupation: '', company: '',
  education_level: '', school_name: '', degree: '',
  favorite_quote: '', favorite_books: [], favorite_movies: [], favorite_music: [], favorite_foods: [],
  emergency_contact_ids: [],
  education_history: [],
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [editProfile, setEditProfile] = useState<Profile>(emptyProfile)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [currentTagField, setCurrentTagField] = useState<keyof Profile | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadProfile(); loadContacts() }, [])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url, relationship_type, phone, email')
      .eq('user_id', user.id)
      .order('full_name')

    console.log('Loaded contacts:', data, error)
    // Map relationship_type to relationship for UI compatibility
    if (data) {
      setContacts(data.map(c => ({
        ...c,
        relationship: c.relationship_type
      })))
    }
  }

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load profile and education history in parallel
    const [{ data: profileData }, { data: educationData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('education_history').select('*').eq('user_id', user.id).order('graduation_year', { ascending: false })
    ])

    if (profileData) {
      const loaded = {
        ...emptyProfile,
        ...profileData,
        personality_traits: profileData.personality_traits || [],
        interests: profileData.interests || [],
        skills: profileData.skills || [],
        emergency_contact_ids: profileData.emergency_contact_ids || [],
        hobbies: profileData.hobbies || [],
        life_goals: profileData.life_goals || [],
        religions: profileData.religions || [],
        languages: profileData.languages || [],
        favorite_books: profileData.favorite_books || [],
        favorite_movies: profileData.favorite_movies || [],
        favorite_music: profileData.favorite_music || [],
        favorite_foods: profileData.favorite_foods || [],
        education_history: educationData || [],
      }
      setProfile(loaded)
      setEditProfile(loaded)
    }
    setLoading(false)
  }

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Explicitly list fields to save (avoid sending unknown fields)
    const updates = {
      full_name: editProfile.full_name,
      avatar_url: editProfile.avatar_url,
      date_of_birth: editProfile.date_of_birth,
      gender: editProfile.gender,
      phone: editProfile.phone,
      address: editProfile.address,
      city: editProfile.city,
      state: editProfile.state,
      country: editProfile.country,
      zipcode: editProfile.zipcode,
      biography: editProfile.biography,
      personal_motto: editProfile.personal_motto,
      personality_type: editProfile.personality_type,
      personality_traits: editProfile.personality_traits || [],
      interests: editProfile.interests || [],
      skills: editProfile.skills || [],
      hobbies: editProfile.hobbies || [],
      life_goals: editProfile.life_goals || [],
      religions: editProfile.religions || [],
      languages: editProfile.languages || [],
      occupation: editProfile.occupation,
      company: editProfile.company,
      education_level: editProfile.education_level,
      school_name: editProfile.school_name,
      degree: editProfile.degree,
      favorite_quote: editProfile.favorite_quote,
      favorite_books: editProfile.favorite_books || [],
      favorite_movies: editProfile.favorite_movies || [],
      favorite_music: editProfile.favorite_music || [],
      favorite_foods: editProfile.favorite_foods || [],
      emergency_contact_ids: editProfile.emergency_contact_ids || [],
    }

    console.log('Saving profile:', updates)
    const { error, data } = await supabase.from('profiles').update(updates).eq('id', user.id).select()

    // Check if there's an actual error (not just empty object)
    const hasError = error && (error.message || error.code || Object.keys(error).length > 0)

    // Also save education history to separate table
    if (!hasError && editProfile.education_history) {
      await saveEducationHistory(editProfile.education_history)
    }

    if (hasError) {
      console.error('Profile save error:', error)
      alert(`Failed to save: ${error.message || 'Unknown error'}`)
    } else {
      console.log('Profile saved successfully:', data)
      setProfile(editProfile)
    }
    setSaving(false)
    setShowEditModal(false)
    setEditSection(null)
  }

  // Save education history to separate table
  const saveEducationHistory = async (educationHistory: Education[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get existing education entries
    const { data: existingData } = await supabase
      .from('education_history')
      .select('id')
      .eq('user_id', user.id)

    const existingIds = new Set(existingData?.map(e => e.id) || [])
    const newIds = new Set(educationHistory.map(e => e.id).filter(Boolean))

    // Delete entries that are no longer present
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id))
    if (idsToDelete.length > 0) {
      await supabase.from('education_history').delete().in('id', idsToDelete)
    }

    // Upsert entries
    for (const edu of educationHistory) {
      const eduData = {
        user_id: user.id,
        school_name: edu.school_name,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_year: edu.start_year,
        graduation_year: edu.graduation_year,
        is_current: edu.is_current,
      }

      if (edu.id && existingIds.has(edu.id)) {
        // Update existing
        await supabase.from('education_history').update(eduData).eq('id', edu.id)
      } else {
        // Insert new
        await supabase.from('education_history').insert(eduData)
      }
    }

    // Reload to get new IDs
    await loadProfile()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setEditProfile(p => ({ ...p, avatar_url: publicUrl }))
    }
    setUploading(false)
  }

  const addTag = (field: keyof Profile) => {
    if (!tagInput.trim()) return
    const current = editProfile[field] as string[]
    if (!current.includes(tagInput.trim())) {
      setEditProfile(p => ({ ...p, [field]: [...current, tagInput.trim()] }))
    }
    setTagInput('')
  }

  const removeTag = (field: keyof Profile, tag: string) => {
    const current = editProfile[field] as string[]
    setEditProfile(p => ({ ...p, [field]: current.filter(t => t !== tag) }))
  }

  const openEdit = (section: string) => {
    setEditProfile({ ...profile })
    setEditSection(section)
    setShowEditModal(true)
  }

  const handleQuizComplete = async (result: QuizResult) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates = {
      personality_type: result.personalityType,
      personality_traits: result.traits
    }

    await supabase.from('profiles').update(updates).eq('id', user.id)
    setProfile(p => ({ ...p, ...updates }))
    setEditProfile(p => ({ ...p, ...updates }))
  }

  const formatLocation = () => {
    const parts = [profile.city, profile.state, profile.country].filter(Boolean)
    return parts.join(', ') || 'Not specified'
  }

  // Generate essence fingerprint vector from profile data
  const essenceVector = useMemo(() => {
    return generateEssenceVector({
      id: undefined, // Will use full_name as seed
      full_name: profile.full_name,
      personality_type: profile.personality_type,
      personality_traits: profile.personality_traits,
      interests: profile.interests,
      hobbies: profile.hobbies,
      occupation: profile.occupation,
      life_goals: profile.life_goals,
      biography: profile.biography,
    })
  }, [profile])

  const calculateAge = (dob: string) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  // Tag display component - Compact
  const TagList = ({ items, colorClass = 'bg-[#2D5A3D]/10 text-[#2D5A3D]' }: { items: string[], colorClass?: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.length > 0 ? items.map(item => (
        <span key={item} className={`px-2.5 py-0.5 rounded-full text-xs ${colorClass}`}>
          {item}
        </span>
      )) : (
        <span className="text-gray-400 text-xs italic">None added yet</span>
      )}
    </div>
  )

  // Glass card section component - Compact
  const ProfileCard = ({ title, icon: Icon, iconColor = 'text-[#2D5A3D]', bgColor = 'bg-[#2D5A3D]/10', section, children }: {
    title: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    iconColor?: string
    bgColor?: string
    section: string
    children: React.ReactNode
  }) => (
    <div className="relative mb-3">
      <div className="glass-card-page p-4 group relative">
        <button
          onClick={() => openEdit(section)}
          className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-all z-10"
        >
          <Edit2 size={12} />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon size={14} className={iconColor} />
          </div>
          <h3 className="font-semibold text-[#2d2d2d] text-sm">{title}</h3>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Background */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="page-header mb-8">
          <Link href="/dashboard" className="page-header-back">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="page-header-title">My Profile</h1>
            <p className="page-header-subtitle">Your personal legacy information</p>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Personality & Interests */}
          <div className="lg:col-span-3 space-y-4">
            {/* Personality */}
            <ProfileCard title="Personality" icon={Brain} section="personality">
              {profile.personality_type && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Type</span>
                  <p className="font-medium text-[#2D5A3D]">{profile.personality_type}</p>
                </div>
              )}
              <div className="mb-3">
                <span className="text-sm text-gray-500 block mb-2">Traits</span>
                <TagList items={profile.personality_traits} />
              </div>
              <button
                onClick={() => setShowQuiz(true)}
                className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-[#2D5A3D]/10 to-[#8DACAB]/10 hover:from-[#2D5A3D]/20 hover:to-[#8DACAB]/20 text-[#2D5A3D] font-medium rounded-xl flex items-center justify-center gap-2 transition-all border border-[#2D5A3D]/10"
              >
                <Sparkles size={16} />
                {profile.personality_type ? 'Retake Quiz' : 'Take Personality Quiz'}
              </button>
            </ProfileCard>

            {/* Interests */}
            <ProfileCard title="Interests" icon={Heart} iconColor="text-[#B8562E]" bgColor="bg-[#B8562E]/10" section="interests">
              <TagList items={profile.interests} colorClass="bg-[#B8562E]/10 text-[#B8562E]" />
            </ProfileCard>

            {/* Hobbies */}
            <ProfileCard title="Hobbies" icon={Sparkles} iconColor="text-[#C4A235]" bgColor="bg-[#C4A235]/10" section="hobbies">
              <TagList items={profile.hobbies} colorClass="bg-[#C4A235]/20 text-[#8B7B0A]" />
            </ProfileCard>

            {/* Skills */}
            <ProfileCard title="Skills" icon={Star} iconColor="text-[#8DACAB]" bgColor="bg-[#8DACAB]/10" section="skills">
              <TagList items={profile.skills} colorClass="bg-[#8DACAB]/20 text-[#5d8585]" />
            </ProfileCard>
          </div>

          {/* Center Column - Hero Section */}
          <div className="lg:col-span-6">
            {/* Main Profile Card - Compact */}
            <div className="glass-card-page glass-card-page-strong p-5 mb-4 group relative">
              <button
                onClick={() => openEdit('basics')}
                className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-all"
              >
                <Edit2 size={14} />
              </button>

              {/* Avatar & Essence + Name - Horizontal Layout */}
              <div className="flex items-center gap-5 mb-4">
                {/* Avatar - 100px */}
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name} 
                      className="w-[100px] h-[100px] rounded-full object-cover border-3 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center text-white text-4xl font-semibold shadow-lg border-3 border-white">
                      {profile.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                {/* Name & Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-[#2d2d2d] truncate">
                    {profile.full_name || 'Your Name'}
                  </h2>
                  {profile.occupation && (
                    <p className="text-[#2D5A3D] font-medium truncate">{profile.occupation}</p>
                  )}
                  <div className="flex items-center gap-3 text-gray-500 text-sm mt-1 flex-wrap">
                    {profile.date_of_birth && (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{calculateAge(profile.date_of_birth)} years old</span>
                      </div>
                    )}
                    {(profile.city || profile.country) && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{formatLocation()}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                  </div>
                </div>

                {/* Essence Fingerprint - 80px */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  {hasProfileData({
                    personality_type: profile.personality_type,
                    personality_traits: profile.personality_traits,
                    interests: profile.interests,
                    hobbies: profile.hobbies,
                    life_goals: profile.life_goals,
                    occupation: profile.occupation,
                    biography: profile.biography,
                  }) ? (
                    <>
                      <EssenceFingerprintLoader 
                        essenceVector={essenceVector} 
                        size={80}
                      />
                      <p className="text-[10px] text-[#2D5A3D]/60 mt-0.5">Essence</p>
                    </>
                  ) : (
                    <div className="w-[80px] h-[80px] rounded-full border-2 border-dashed border-[#2D5A3D]/20 
                                    flex flex-col items-center justify-center text-center p-2">
                      <Sparkles className="w-5 h-5 text-[#2D5A3D]/30 mb-1" />
                      <p className="text-[8px] text-[#2D5A3D]/50 leading-tight">Add profile data</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Biography - Compact */}
              <div className="border-t border-[#2D5A3D]/10 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-[#2D5A3D]" />
                  <h3 className="font-semibold text-[#2d2d2d] text-sm">About Me</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit('bio'); }}
                    className="ml-auto p-1 opacity-0 group-hover:opacity-100 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-all"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                {profile.biography ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm line-clamp-4">{profile.biography}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm">Tell your story... What makes you, you?</p>
                )}
              </div>
            </div>

            {/* Favorites Section - Compact */}
            <ProfileCard title="Favorites" icon={Star} iconColor="text-[#B8562E]" bgColor="bg-[#B8562E]/10" section="favorites">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen size={12} className="text-[#2D5A3D]" />
                    <span className="text-xs font-medium text-gray-600">Books</span>
                  </div>
                  <TagList items={profile.favorite_books} colorClass="bg-[#2D5A3D]/10 text-[#2D5A3D]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Film size={12} className="text-[#4A3552]" />
                    <span className="text-xs font-medium text-gray-600">Movies</span>
                  </div>
                  <TagList items={profile.favorite_movies} colorClass="bg-[#4A3552]/10 text-[#4A3552]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Music size={12} className="text-[#8DACAB]" />
                    <span className="text-xs font-medium text-gray-600">Music</span>
                  </div>
                  <TagList items={profile.favorite_music} colorClass="bg-[#8DACAB]/20 text-[#5d8585]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Utensils size={12} className="text-[#B8562E]" />
                    <span className="text-xs font-medium text-gray-600">Foods</span>
                  </div>
                  <TagList items={profile.favorite_foods} colorClass="bg-[#B8562E]/10 text-[#B8562E]" />
                </div>
              </div>
            </ProfileCard>

            {/* Life Philosophy & Life Goals - Split Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Life Philosophy */}
              <ProfileCard title="Life Philosophy" icon={Quote} iconColor="text-[#4A3552]" bgColor="bg-[#4A3552]/10" section="philosophy">
                {profile.personal_motto ? (
                  <p className="text-[#4A3552] italic text-sm">"{profile.personal_motto}"</p>
                ) : (
                  <p className="text-gray-400 text-sm italic">No motto set</p>
                )}
                {profile.favorite_quote && (
                  <div className="mt-3 pt-3 border-t border-[#4A3552]/10">
                    <span className="text-xs text-gray-500 block mb-1">Favorite Quote</span>
                    <p className="text-xs text-[#4A3552]/80 italic">"{profile.favorite_quote}"</p>
                  </div>
                )}
              </ProfileCard>

              {/* Life Goals */}
              <ProfileCard title="Life Goals" icon={Target} iconColor="text-[#4A3552]" bgColor="bg-[#4A3552]/10" section="goals">
                <TagList items={profile.life_goals} colorClass="bg-[#4A3552]/10 text-[#4A3552]" />
              </ProfileCard>
            </div>
          </div>

          {/* Right Column - Location & Professional */}
          <div className="lg:col-span-3 space-y-4">
            {/* Location */}
            <ProfileCard title="Location" icon={MapPin} section="location">
              <div className="space-y-2">
                {profile.address && (
                  <p className="text-gray-700">{profile.address}</p>
                )}
                <p className="text-gray-700">{formatLocation()}</p>
                {profile.zipcode && (
                  <p className="text-gray-500 text-sm">{profile.zipcode}</p>
                )}
                {!profile.city && !profile.country && !profile.address && (
                  <p className="text-gray-400 text-sm italic">No location added</p>
                )}
              </div>
            </ProfileCard>

            {/* Languages */}
            <ProfileCard title="Languages" icon={BookOpen} iconColor="text-[#2D5A3D]" bgColor="bg-[#2D5A3D]/10" section="languages">
              <TagList items={profile.languages} colorClass="bg-[#2D5A3D]/10 text-[#2D5A3D]" />
            </ProfileCard>

            {/* Religion */}
            <ProfileCard title="Faith & Beliefs" icon={Heart} iconColor="text-[#4A3552]" bgColor="bg-[#4A3552]/10" section="religion">
              <TagList items={profile.religions} colorClass="bg-[#4A3552]/10 text-[#4A3552]" />
            </ProfileCard>

            {/* Occupation */}
            <ProfileCard title="Work" icon={Briefcase} iconColor="text-[#C4A235]" bgColor="bg-[#C4A235]/10" section="work">
              {profile.occupation ? (
                <>
                  <p className="font-medium text-[#2d2d2d]">{profile.occupation}</p>
                  {profile.company && (
                    <p className="text-gray-500 text-sm mt-1">at {profile.company}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm italic">No occupation set</p>
              )}
            </ProfileCard>

            {/* Education */}
            <ProfileCard title="Education" icon={GraduationCap} iconColor="text-[#8DACAB]" bgColor="bg-[#8DACAB]/10" section="education">
              {profile.education_history && profile.education_history.length > 0 ? (
                <div className="space-y-3">
                  {profile.education_history.map((edu, index) => (
                    <div key={edu.id || index} className={index > 0 ? "pt-2 border-t border-[#8DACAB]/10" : ""}>
                      <p className="font-medium text-[#2d2d2d]">{edu.school_name}</p>
                      {edu.degree && (
                        <p className="text-gray-500 text-sm mt-0.5">{edu.degree}</p>
                      )}
                      {edu.field_of_study && (
                        <p className="text-gray-500 text-xs mt-0.5">{edu.field_of_study}</p>
                      )}
                      {(edu.start_year || edu.graduation_year) && (
                        <p className="text-gray-400 text-xs mt-1">
                          {edu.start_year || '???'} - {edu.is_current ? 'Present' : (edu.graduation_year || '???')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : profile.school_name ? (
                // Fallback to legacy single education fields
                <>
                  <p className="font-medium text-[#2d2d2d]">{profile.school_name}</p>
                  {profile.degree && (
                    <p className="text-gray-500 text-sm mt-1">{profile.degree}</p>
                  )}
                  {profile.education_level && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-[#8DACAB]/15 text-[#5d8585] rounded text-xs">
                      {profile.education_level}
                    </span>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm italic">No education added</p>
              )}
            </ProfileCard>

            {/* Emergency Contact */}
            <ProfileCard title="Emergency Contact" icon={User} section="emergency">
              <div className="space-y-3">
                {profile.emergency_contact_ids.length > 0 ? (
                  <div className="space-y-3">
                    {profile.emergency_contact_ids.map(contactId => {
                      const contact = contacts.find(c => c.id === contactId)
                      return contact ? (
                        <div key={contactId} className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center text-sm font-medium text-[#2D5A3D] flex-shrink-0">
                            {contact.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">{contact.full_name}</p>
                            {contact.relationship && (
                              <p className="text-xs text-gray-500">{contact.relationship}</p>
                            )}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-xs text-[#2D5A3D] hover:underline block mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.phone}
                              </a>
                            )}
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-xs text-[#2D5A3D] hover:underline block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.email}
                              </a>
                            )}
                          </div>
                        </div>
                      ) : null
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">No emergency contact</p>
                )}
                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  This person can verify your passing with a death certificate or obituary.
                </p>
              </div>
            </ProfileCard>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          section={editSection}
          profile={editProfile}
          setProfile={setEditProfile}
          contacts={contacts}
          onClose={() => { setShowEditModal(false); setEditSection(null) }}
          onSave={saveProfile}
          saving={saving}
          uploading={uploading}
          handlePhotoUpload={handlePhotoUpload}
          tagInput={tagInput}
          setTagInput={setTagInput}
          currentTagField={currentTagField}
          setCurrentTagField={setCurrentTagField}
          addTag={addTag}
          removeTag={removeTag}
        />
      )}

      {/* Personality Quiz */}
      <PersonalityQuiz
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onComplete={handleQuizComplete}
      />
    </div>
  )
}

// Edit Modal Component
function EditModal({
  section, profile, setProfile, contacts, onClose, onSave, saving, uploading,
  handlePhotoUpload, tagInput, setTagInput, currentTagField, setCurrentTagField, addTag, removeTag
}: {
  section: string | null
  profile: Profile
  setProfile: React.Dispatch<React.SetStateAction<Profile>>
  contacts: Contact[]
  onClose: () => void
  onSave: () => void
  saving: boolean
  uploading: boolean
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  tagInput: string
  setTagInput: (v: string) => void
  currentTagField: keyof Profile | null
  setCurrentTagField: (v: keyof Profile | null) => void
  addTag: (field: keyof Profile) => void
  removeTag: (field: keyof Profile, tag: string) => void
}) {
  const getTitle = () => {
    switch (section) {
      case 'basics': return 'Edit Basic Info'
      case 'bio': return 'Edit Biography'
      case 'personality': return 'Edit Personality'
      case 'interests': return 'Edit Interests'
      case 'hobbies': return 'Edit Hobbies'
      case 'skills': return 'Edit Skills'
      case 'philosophy': return 'Edit Life Philosophy'
      case 'goals': return 'Edit Life Goals'
      case 'location': return 'Edit Location'
      case 'languages': return 'Edit Languages'
      case 'religion': return 'Edit Faith & Beliefs'
      case 'work': return 'Edit Work'
      case 'education': return 'Edit Education'
      case 'emergency': return 'Emergency Contact'
      case 'favorites': return 'Edit Favorites'
      default: return 'Edit Profile'
    }
  }

  const TagEditor = ({ field, label, placeholder, colorClass = 'bg-[#2D5A3D]/10 text-[#2D5A3D]' }: {
    field: keyof Profile
    label: string
    placeholder: string
    colorClass?: string
  }) => (
    <div>
      <label className="block text-sm text-[#666] mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {(profile[field] as string[]).map(item => (
          <span key={item} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${colorClass}`}>
            {item}
            <button onClick={() => removeTag(field, item)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={currentTagField === field ? tagInput : ''}
          onFocus={() => setCurrentTagField(field)}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(field))}
          className="form-input flex-1"
          placeholder={placeholder}
        />
        <button onClick={() => addTag(field)} className="btn-secondary px-4">Add</button>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay-page">
      <div className="modal-content-page max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {section === 'basics' && (
            <>
              <div className="flex justify-center mb-4">
                {profile.avatar_url ? (
                  <div className="relative">
                    <img src={profile.avatar_url}
                alt="Profile photo" className="w-28 h-28 rounded-full object-cover border-4 border-[#2D5A3D]/20" />
                    <label className="absolute bottom-0 right-0 w-9 h-9 bg-[#2D5A3D] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#234A31]">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                ) : (
                  <label className="w-28 h-28 rounded-full border-4 border-dashed border-[#2D5A3D]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#2D5A3D]/50 transition-all">
                    {uploading ? <Loader2 className="w-8 h-8 text-[#2D5A3D] animate-spin" /> : (
                      <>
                        <Upload className="w-8 h-8 text-[#2D5A3D]/50" />
                        <span className="text-xs text-[#2D5A3D]/50 mt-1">Add photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Full Name</label>
                <input
                  value={profile.full_name}
                  onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                  className="form-input"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={profile.date_of_birth}
                  onChange={e => setProfile(p => ({ ...p, date_of_birth: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-2">Gender</label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, gender: g }))}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        profile.gender === g 
                          ? 'bg-[#2D5A3D] text-white' 
                          : 'bg-white/50 text-gray-600 border border-gray-200 hover:border-[#2D5A3D]/30'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="form-input"
                  placeholder="+1 (555) 123-4567"
                />
                <div className="mt-3 p-3 bg-[#2D5A3D]/5 rounded-xl border border-[#2D5A3D]/10">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to receive SMS notifications from YoursTruly when someone wants to interview me about my life story. Message and data rates may apply. Reply STOP to unsubscribe.
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}

          {section === 'bio' && (
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Biography</label>
              <textarea
                value={profile.biography}
                onChange={e => setProfile(p => ({ ...p, biography: e.target.value }))}
                className="form-textarea min-h-[200px]"
                placeholder="Tell your story..."
              />
            </div>
          )}

          {section === 'personality' && (
            <>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Personality Type</label>
                <select
                  value={profile.personality_type}
                  onChange={e => setProfile(p => ({ ...p, personality_type: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Select your personality type</option>
                  {PERSONALITY_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-2">Personality Traits</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(profile.personality_traits || []).map(trait => (
                    <span key={trait} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#2D5A3D]/10 text-[#2D5A3D]">
                      {trait}
                      <button onClick={() => removeTag('personality_traits', trait)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">Click to add traits:</p>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white/50">
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_TRAIT_OPTIONS.filter(t => !(profile.personality_traits || []).includes(t)).map(trait => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, personality_traits: [...(p.personality_traits || []), trait] }))}
                        className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-[#2D5A3D]/10 hover:text-[#2D5A3D] transition-colors"
                      >
                        + {trait}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={currentTagField === 'personality_traits' ? tagInput : ''}
                    onFocus={() => setCurrentTagField('personality_traits')}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('personality_traits'))}
                    className="form-input flex-1"
                    placeholder="Or add a custom trait..."
                  />
                  <button onClick={() => addTag('personality_traits')} className="btn-secondary px-4">Add</button>
                </div>
              </div>
            </>
          )}

          {section === 'interests' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Interests</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.interests || []).map(interest => (
                  <span key={interest} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#B8562E]/10 text-[#B8562E]">
                    {interest}
                    <button onClick={() => removeTag('interests', interest)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-2">Click to add interests:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white/50">
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.filter(i => !(profile.interests || []).includes(i)).map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, interests: [...(p.interests || []), interest] }))}
                      className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-[#B8562E]/10 hover:text-[#B8562E] transition-colors"
                    >
                      + {interest}
                    </button>
                  ))}
                </div>
              </div>
              {/* Custom input for unlisted interests */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={currentTagField === 'interests' ? tagInput : ''}
                  onFocus={() => setCurrentTagField('interests')}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('interests'))}
                  className="form-input flex-1"
                  placeholder="Or add a custom interest..."
                />
                <button onClick={() => addTag('interests')} className="btn-secondary px-4">Add</button>
              </div>
            </div>
          )}

          {section === 'hobbies' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Hobbies</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.hobbies || []).map(hobby => (
                  <span key={hobby} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#C4A235]/20 text-[#8B7B0A]">
                    {hobby}
                    <button onClick={() => removeTag('hobbies', hobby)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-2">Click to add hobbies:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white/50">
                <div className="flex flex-wrap gap-2">
                  {HOBBY_OPTIONS.filter(h => !(profile.hobbies || []).includes(h)).map(hobby => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, hobbies: [...(p.hobbies || []), hobby] }))}
                      className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-[#C4A235]/20 hover:text-[#8B7B0A] transition-colors"
                    >
                      + {hobby}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={currentTagField === 'hobbies' ? tagInput : ''}
                  onFocus={() => setCurrentTagField('hobbies')}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('hobbies'))}
                  className="form-input flex-1"
                  placeholder="Or add a custom hobby..."
                />
                <button onClick={() => addTag('hobbies')} className="btn-secondary px-4">Add</button>
              </div>
            </div>
          )}

          {section === 'skills' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.skills || []).map(skill => (
                  <span key={skill} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#8DACAB]/20 text-[#5d8585]">
                    {skill}
                    <button onClick={() => removeTag('skills', skill)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-2">Click to add skills:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white/50">
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.filter(s => !(profile.skills || []).includes(s)).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, skills: [...(p.skills || []), skill] }))}
                      className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-[#8DACAB]/20 hover:text-[#5d8585] transition-colors"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={currentTagField === 'skills' ? tagInput : ''}
                  onFocus={() => setCurrentTagField('skills')}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('skills'))}
                  className="form-input flex-1"
                  placeholder="Or add a custom skill..."
                />
                <button onClick={() => addTag('skills')} className="btn-secondary px-4">Add</button>
              </div>
            </div>
          )}

          {section === 'philosophy' && (
            <>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Personal Motto</label>
                <textarea
                  value={profile.personal_motto}
                  onChange={e => setProfile(p => ({ ...p, personal_motto: e.target.value }))}
                  className="form-textarea"
                  placeholder="What do you live by?"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Favorite Quote</label>
                <textarea
                  value={profile.favorite_quote}
                  onChange={e => setProfile(p => ({ ...p, favorite_quote: e.target.value }))}
                  className="form-textarea"
                  placeholder="A quote that inspires you..."
                  rows={3}
                />
              </div>
            </>
          )}

          {section === 'goals' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Life Goals</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.life_goals || []).map(goal => (
                  <span key={goal} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#4A3552]/10 text-[#4A3552]">
                    {goal}
                    <button onClick={() => removeTag('life_goals', goal)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-2">Click to add goals:</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white/50">
                <div className="flex flex-wrap gap-2">
                  {LIFE_GOAL_OPTIONS.filter(g => !(profile.life_goals || []).includes(g)).map(goal => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, life_goals: [...(p.life_goals || []), goal] }))}
                      className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-[#4A3552]/10 hover:text-[#4A3552] transition-colors"
                    >
                      + {goal}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={currentTagField === 'life_goals' ? tagInput : ''}
                  onFocus={() => setCurrentTagField('life_goals')}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('life_goals'))}
                  className="form-input flex-1"
                  placeholder="Or add a custom goal..."
                />
                <button onClick={() => addTag('life_goals')} className="btn-secondary px-4">Add</button>
              </div>
            </div>
          )}

          {section === 'location' && (
            <>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Street Address</label>
                <input
                  value={profile.address}
                  onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                  className="form-input"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">City</label>
                  <input
                    value={profile.city}
                    onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                    className="form-input"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">State</label>
                  <input
                    value={profile.state}
                    onChange={e => setProfile(p => ({ ...p, state: e.target.value }))}
                    className="form-input"
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">Country</label>
                  <input
                    value={profile.country}
                    onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                    className="form-input"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1.5">Zip Code</label>
                  <input
                    value={profile.zipcode}
                    onChange={e => setProfile(p => ({ ...p, zipcode: e.target.value }))}
                    className="form-input"
                    placeholder="12345"
                  />
                </div>
              </div>
            </>
          )}

          {section === 'languages' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Languages</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.languages || []).map(lang => (
                  <span key={lang} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#2D5A3D]/10 text-[#2D5A3D]">
                    {lang}
                    <button onClick={() => removeTag('languages', lang)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value
                  if (val && !(profile.languages || []).includes(val)) {
                    setProfile(p => ({ ...p, languages: [...(p.languages || []), val] }))
                  }
                }}
                className="form-select"
              >
                <option value="">Add a language...</option>
                {LANGUAGE_OPTIONS.filter(l => !(profile.languages || []).includes(l)).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          )}

          {section === 'religion' && (
            <div>
              <label className="block text-sm text-[#666] mb-2">Faith & Beliefs</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(profile.religions || []).map(rel => (
                  <span key={rel} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#4A3552]/10 text-[#4A3552]">
                    {rel}
                    <button onClick={() => removeTag('religions', rel)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value
                  if (val && !(profile.religions || []).includes(val)) {
                    setProfile(p => ({ ...p, religions: [...(p.religions || []), val] }))
                  }
                }}
                className="form-select"
              >
                <option value="">Add a belief or religion...</option>
                {RELIGION_OPTIONS.filter(r => !(profile.religions || []).includes(r)).map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
          )}

          {section === 'work' && (
            <>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Occupation</label>
                <select
                  value={OCCUPATION_OPTIONS.includes(profile.occupation) ? profile.occupation : 'Other'}
                  onChange={e => {
                    if (e.target.value !== 'Other') {
                      setProfile(p => ({ ...p, occupation: e.target.value }))
                    }
                  }}
                  className="form-select mb-2"
                >
                  <option value="">Select an occupation</option>
                  {OCCUPATION_OPTIONS.map(occ => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
                {(!OCCUPATION_OPTIONS.includes(profile.occupation) || profile.occupation === 'Other' || !profile.occupation) && (
                  <input
                    value={profile.occupation === 'Other' ? '' : profile.occupation}
                    onChange={e => setProfile(p => ({ ...p, occupation: e.target.value }))}
                    className="form-input"
                    placeholder="Enter your occupation"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Company</label>
                <input
                  value={profile.company}
                  onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                  className="form-input"
                  placeholder="Company or organization"
                />
              </div>
            </>
          )}

          {section === 'education' && (
            <>
              {/* Legacy fields (for backwards compatibility) */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm text-[#666] mb-1.5">Education Level</label>
                <select
                  value={profile.education_level}
                  onChange={e => setProfile(p => ({ ...p, education_level: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Select education level</option>
                  {EDUCATION_LEVEL_OPTIONS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Multiple Education Entries */}
              <div>
                <label className="block text-sm text-[#666] mb-2">Schools & Degrees</label>
                <div className="space-y-3">
                  {(profile.education_history || []).map((edu, index) => (
                    <div key={edu.id || index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">School #{index + 1}</span>
                        <button
                          onClick={() => {
                            const newHistory = profile.education_history.filter((_, i) => i !== index)
                            setProfile(p => ({ ...p, education_history: newHistory }))
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          value={edu.school_name}
                          onChange={e => {
                            const newHistory = [...profile.education_history]
                            newHistory[index] = { ...edu, school_name: e.target.value }
                            setProfile(p => ({ ...p, education_history: newHistory }))
                          }}
                          className="form-input text-sm"
                          placeholder="School / University name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={edu.degree}
                            onChange={e => {
                              const newHistory = [...profile.education_history]
                              newHistory[index] = { ...edu, degree: e.target.value }
                              setProfile(p => ({ ...p, education_history: newHistory }))
                            }}
                            className="form-input text-sm"
                            placeholder="Degree"
                          />
                          <input
                            value={edu.field_of_study}
                            onChange={e => {
                              const newHistory = [...profile.education_history]
                              newHistory[index] = { ...edu, field_of_study: e.target.value }
                              setProfile(p => ({ ...p, education_history: newHistory }))
                            }}
                            className="form-input text-sm"
                            placeholder="Field of Study"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <input
                            type="number"
                            value={edu.start_year || ''}
                            onChange={e => {
                              const newHistory = [...profile.education_history]
                              newHistory[index] = { ...edu, start_year: parseInt(e.target.value) || null }
                              setProfile(p => ({ ...p, education_history: newHistory }))
                            }}
                            className="form-input text-sm"
                            placeholder="Start Year"
                          />
                          <input
                            type="number"
                            value={edu.graduation_year || ''}
                            onChange={e => {
                              const newHistory = [...profile.education_history]
                              newHistory[index] = { ...edu, graduation_year: parseInt(e.target.value) || null }
                              setProfile(p => ({ ...p, education_history: newHistory }))
                            }}
                            className="form-input text-sm"
                            placeholder="Grad Year"
                          />
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={edu.is_current}
                              onChange={e => {
                                const newHistory = [...profile.education_history]
                                newHistory[index] = { ...edu, is_current: e.target.checked }
                                setProfile(p => ({ ...p, education_history: newHistory }))
                              }}
                              className="rounded border-gray-300"
                            />
                            Current
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const newHistory = [...(profile.education_history || []), {
                      id: '',
                      school_name: '',
                      degree: '',
                      field_of_study: '',
                      start_year: null,
                      graduation_year: null,
                      is_current: false
                    }]
                    setProfile(p => ({ ...p, education_history: newHistory }))
                  }}
                  className="w-full mt-3 py-2 px-4 bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20 rounded-lg text-sm font-medium transition-colors"
                >
                  + Add School
                </button>
              </div>
            </>
          )}

          {section === 'emergency' && (
            <div>
              <p className="text-sm text-gray-600 mb-4 p-3 bg-[#2D5A3D]/5 rounded-lg">
                Your emergency contact can verify your passing by providing a death certificate or obituary.
                This person will be notified and given access to manage your legacy.
              </p>
              <label className="block text-sm text-[#666] mb-2">Select Emergency Contacts</label>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {contacts.map(contact => {
                  const isSelected = (profile.emergency_contact_ids || []).includes(contact.id)
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setProfile(p => ({
                            ...p,
                            emergency_contact_ids: (p.emergency_contact_ids || []).filter(id => id !== contact.id)
                          }))
                        } else {
                          setProfile(p => ({
                            ...p,
                            emergency_contact_ids: [...(p.emergency_contact_ids || []), contact.id]
                          }))
                        }
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'border-[#2D5A3D] bg-[#2D5A3D]/10'
                          : 'border-gray-200 hover:border-[#2D5A3D]/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                        isSelected ? 'bg-[#2D5A3D] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {contact.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#2d2d2d]">{contact.full_name}</p>
                        {contact.relationship && (
                          <p className="text-xs text-gray-500">{contact.relationship}</p>
                        )}
                        {contact.phone && (
                          <p className="text-xs text-[#2D5A3D] mt-1">{contact.phone}</p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-[#2D5A3D] truncate">{contact.email}</p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#2D5A3D] flex-shrink-0 mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
              {contacts.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No contacts found. Add contacts from the People section first.
                </p>
              )}
            </div>
          )}

          {section === 'favorites' && (
            <>
              {/* Books */}
              <div>
                <label className="block text-sm text-[#666] mb-2">Favorite Books</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.favorite_books || []).map(book => (
                    <span key={book} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#2D5A3D]/10 text-[#2D5A3D]">
                      {book}
                      <button onClick={() => removeTag('favorite_books', book)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                    </span>
                  ))}
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white/50 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {BOOK_SUGGESTIONS.filter(b => !(profile.favorite_books || []).includes(b)).slice(0, 12).map(book => (
                      <button
                        key={book}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, favorite_books: [...(p.favorite_books || []), book] }))}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-[#2D5A3D]/10 hover:text-[#2D5A3D] transition-colors"
                      >
                        + {book}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTagField === 'favorite_books' ? tagInput : ''}
                    onFocus={() => setCurrentTagField('favorite_books')}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('favorite_books'))}
                    className="form-input flex-1 text-sm"
                    placeholder="Add another book..."
                  />
                  <button onClick={() => addTag('favorite_books')} className="btn-secondary px-3 text-sm">Add</button>
                </div>
              </div>

              {/* Movies */}
              <div>
                <label className="block text-sm text-[#666] mb-2">Favorite Movies</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.favorite_movies || []).map(movie => (
                    <span key={movie} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#4A3552]/10 text-[#4A3552]">
                      {movie}
                      <button onClick={() => removeTag('favorite_movies', movie)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                    </span>
                  ))}
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white/50 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {MOVIE_SUGGESTIONS.filter(m => !(profile.favorite_movies || []).includes(m)).slice(0, 12).map(movie => (
                      <button
                        key={movie}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, favorite_movies: [...(p.favorite_movies || []), movie] }))}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-[#4A3552]/10 hover:text-[#4A3552] transition-colors"
                      >
                        + {movie}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTagField === 'favorite_movies' ? tagInput : ''}
                    onFocus={() => setCurrentTagField('favorite_movies')}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('favorite_movies'))}
                    className="form-input flex-1 text-sm"
                    placeholder="Add another movie..."
                  />
                  <button onClick={() => addTag('favorite_movies')} className="btn-secondary px-3 text-sm">Add</button>
                </div>
              </div>

              {/* Music */}
              <div>
                <label className="block text-sm text-[#666] mb-2">Favorite Music</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.favorite_music || []).map(music => (
                    <span key={music} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#8DACAB]/20 text-[#5d8585]">
                      {music}
                      <button onClick={() => removeTag('favorite_music', music)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                    </span>
                  ))}
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white/50 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {MUSIC_SUGGESTIONS.filter(m => !(profile.favorite_music || []).includes(m)).slice(0, 12).map(music => (
                      <button
                        key={music}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, favorite_music: [...(p.favorite_music || []), music] }))}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-[#8DACAB]/20 hover:text-[#5d8585] transition-colors"
                      >
                        + {music}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTagField === 'favorite_music' ? tagInput : ''}
                    onFocus={() => setCurrentTagField('favorite_music')}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('favorite_music'))}
                    className="form-input flex-1 text-sm"
                    placeholder="Add another artist or genre..."
                  />
                  <button onClick={() => addTag('favorite_music')} className="btn-secondary px-3 text-sm">Add</button>
                </div>
              </div>

              {/* Foods */}
              <div>
                <label className="block text-sm text-[#666] mb-2">Favorite Foods</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.favorite_foods || []).map(food => (
                    <span key={food} className="px-3 py-1 rounded-full text-sm flex items-center gap-1 bg-[#B8562E]/10 text-[#B8562E]">
                      {food}
                      <button onClick={() => removeTag('favorite_foods', food)} className="hover:text-red-500 ml-1" aria-label="Remove"><X size={14} /></button>
                    </span>
                  ))}
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white/50 mb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {FOOD_SUGGESTIONS.filter(f => !(profile.favorite_foods || []).includes(f)).slice(0, 12).map(food => (
                      <button
                        key={food}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, favorite_foods: [...(p.favorite_foods || []), food] }))}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-[#B8562E]/10 hover:text-[#B8562E] transition-colors"
                      >
                        + {food}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTagField === 'favorite_foods' ? tagInput : ''}
                    onFocus={() => setCurrentTagField('favorite_foods')}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('favorite_foods'))}
                    className="form-input flex-1 text-sm"
                    placeholder="Add another food..."
                  />
                  <button onClick={() => addTag('favorite_foods')} className="btn-secondary px-3 text-sm">Add</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D5A3D]/10">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}
