'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { MapPin, Users, Calendar, Search, Map as MapIcon, Grid, Plus, Mic, Video, Upload, Image as ImageIcon, MessageSquare, Gift, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { InlineAudioPlayer } from '@/components/feed/InlineAudioPlayer'

const FeedMap = dynamic(() => import('@/components/feed/FeedMap'), { ssr: false })

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  thumbnail?: string
  audio_url?: string
  link: string
  metadata?: {
    location?: string
    lat?: number
    lng?: number
    tagged_people?: string[]
    recipient_name?: string
    delivery_date?: string
  }
}

type CategoryFilter = 'all' | 'memories' | 'wisdom' | 'media' | 'interviews' | 'postscripts' | 'shared'
type ViewMode = 'card' | 'map'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'memories', label: 'Memories' },
  { id: 'wisdom', label: 'Wisdom' },
  { id: 'media', label: 'Media' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'postscripts', label: 'PostScripts' },
  { id: 'shared', label: 'Shared with me' },
] as const

const QUICK_ACTIONS: Record<string, Array<{ label: string; icon: any; action: string }>> = {
  memories: [
    { label: 'Add a Memory', icon: Plus, action: 'add_memory' },
    { label: 'Upload Media', icon: Upload, action: 'upload_memory' },
    { label: 'Random Memory Question', icon: Sparkles, action: 'random_memory' },
  ],
  wisdom: [
    { label: 'Add Wisdom', icon: Plus, action: 'add_wisdom' },
    { label: 'Random Wisdom Question', icon: Sparkles, action: 'random_wisdom' },
  ],
  media: [
    { label: 'Upload Photos/Videos', icon: Upload, action: 'upload_media' },
    { label: 'Digitize Printed Photos', icon: ImageIcon, action: 'digitize_photos' },
  ],
  interviews: [
    { label: 'New Interview', icon: MessageSquare, action: 'new_interview' },
  ],
  postscripts: [
    { label: 'Add New PostScript', icon: Gift, action: 'add_postscript' },
  ],
}

// Brand gradients for cards without images
const TYPE_GRADIENTS: Record<string, string> = {
  memory: 'linear-gradient(135deg, #FF5C34 0%, #FF8A65 100%)',
  wisdom: 'linear-gradient(135deg, #3448FF 0%, #5C7CFF 100%)',
  interview: 'linear-gradient(135deg, #34D7FF 0%, #6BE7FF 100%)',
  media: 'linear-gradient(135deg, #FFB020 0%, #FFC857 100%)',
  postscript: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
  contact: 'linear-gradient(135deg, #00B87C 0%, #34D399 100%)',
  circle: 'linear-gradient(135deg, #34D7FF 0%, #6BE7FF 100%)',
}

const TYPE_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  memory_created: { label: 'Memory', color: '#FF5C34', gradient: TYPE_GRADIENTS.memory },
  memory_shared: { label: 'Shared Memory', color: '#FF5C34', gradient: TYPE_GRADIENTS.memory },
  wisdom_created: { label: 'Wisdom', color: '#3448FF', gradient: TYPE_GRADIENTS.wisdom },
  wisdom_shared: { label: 'Shared Wisdom', color: '#3448FF', gradient: TYPE_GRADIENTS.wisdom },
  interview_response: { label: 'Interview', color: '#34D7FF', gradient: TYPE_GRADIENTS.interview },
  photos_uploaded: { label: 'Media', color: '#FFB020', gradient: TYPE_GRADIENTS.media },
  postscript_created: { label: 'PostScript', color: '#A855F7', gradient: TYPE_GRADIENTS.postscript },
  contact_added: { label: 'Contact', color: '#00B87C', gradient: TYPE_GRADIENTS.contact },
  circle_content: { label: 'Circle', color: '#34D7FF', gradient: TYPE_GRADIENTS.circle },
}

function MasonryTile({ 
  activity, 
  index, 
  isDarkMode,
  playingAudio,
  onAudioToggle
}: { 
  activity: ActivityItem
  index: number
  isDarkMode: boolean
  playingAudio: string | null
  onAudioToggle: (id: string) => void
}) {
  const tileRef = useRef<HTMLAnchorElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (tileRef.current) {
      gsap.to(tileRef.current, {
        y: -8,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        duration: 0.4,
        ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (tileRef.current) {
      gsap.to(tileRef.current, {
        y: 0,
        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        duration: 0.4,
        ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
      })
    }
  }

  const getCardClass = () => {
    const patterns = [
      'large', '', '', 'medium', '', '', 'wide', '', '', '', '', 
      'medium', '', 'wide', '', ''
    ]
    return patterns[index % patterns.length]
  }

  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.memory_created

  return (
    <div className={`card-animation-layer ${getCardClass()}`}>
      <Link
        href={activity.link}
        ref={tileRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="card block relative overflow-hidden"
        style={{ 
          borderRadius: '16px',
          background: activity.thumbnail ? '#000' : config.gradient,
          border: 'none',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Card Image (60% height when present) */}
        {activity.thumbnail && (
          <div 
            style={{
              height: '60%',
              backgroundImage: `url(${activity.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Gradient overlay for text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))'
            }} />
          </div>
        )}

        {/* Card Content (40% height with image, 100% without) */}
        <div style={{
          padding: activity.thumbnail ? '20px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          gap: '12px',
          color: activity.thumbnail ? '#fff' : '#fff',
        }}>
          {/* Top Section: Category + Title + Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Category Badge */}
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: activity.thumbnail ? '#fff' : 'rgba(255,255,255,0.9)',
              opacity: 0.8,
            }}>
              {config.label}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              lineHeight: '1.3',
              margin: 0,
              color: '#fff',
            }}>
              {activity.title || 'Untitled'}
            </h3>

            {/* Description (only show for non-image cards or when large) */}
            {!activity.thumbnail && activity.description && (
              <p style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {activity.description}
              </p>
            )}

            {/* PostScript metadata */}
            {activity.type === 'postscript_created' && activity.metadata?.recipient_name && (
              <div style={{ 
                fontSize: '12px', 
                color: 'rgba(255,255,255,0.7)',
                fontWeight: '500',
              }}>
                To: {activity.metadata.recipient_name}
                {activity.metadata.delivery_date && (
                  <> • {format(new Date(activity.metadata.delivery_date), 'MMM d, yyyy')}</>
                )}
              </div>
            )}
          </div>

          {/* Audio Player (if audio exists) */}
          {activity.audio_url && (
            <InlineAudioPlayer
              audioUrl={activity.audio_url}
              isPlaying={playingAudio === activity.id}
              onToggle={() => onAudioToggle(activity.id)}
              accentColor={config.color}
            />
          )}

          {/* Bottom Section: Metadata + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
            {/* Date & Location */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: '500',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} />
                {format(new Date(activity.timestamp), 'MMM d, yyyy')}
              </div>
              {activity.metadata?.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} />
                  <span style={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {activity.metadata.location}
                  </span>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                window.location.href = activity.link
              }}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isHovered ? 1 : 0.9,
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [openSubmenu, setOpenSubmenu] = useState<CategoryFilter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [userFirstName, setUserFirstName] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [showEngagementModal, setShowEngagementModal] = useState(false)
  const [engagementPrompt, setEngagementPrompt] = useState<any>(null)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [showPostscriptModal, setShowPostscriptModal] = useState(false)
  const [showDigitizeCamera, setShowDigitizeCamera] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState<'uploading' | 'backstory' | 'done'>('uploading')
  const [uploadedMemoryId, setUploadedMemoryId] = useState<string | null>(null)
  const [memoryMetadata, setMemoryMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    location: ''
  })
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const handleAudioToggle = (activityId: string) => {
    setPlayingAudio(prev => prev === activityId ? null : activityId)
  }

  useEffect(() => {
    fetchUserName()
    fetchActivities()
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('user_id', user.id)
        .order('full_name')
      
      if (error) {
        console.error('Error fetching contacts:', error)
        return
      }

      if (data) {
        setContacts(data)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
    }
  }

  const handleCreateInterview = async () => {
    if (!selectedContact) {
      alert('Please select a contact')
      return
    }

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get contact details
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) {
        throw new Error('Contact not found')
      }
      
      // Create interview session with title
      const { data: session, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          contact_id: selectedContact,
          title: `Interview with ${selectedContactData.full_name}`,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Interview creation error:', error)
        throw error
      }

      // Navigate to journalist page to select questions
      window.location.href = `/dashboard/journalist#session-${session.id}`
    } catch (err) {
      console.error('Error creating interview:', err)
      alert('Failed to create interview: ' + (err as Error).message)
    }
  }

  const handleCreatePostscript = async () => {
    if (!selectedContact) {
      alert('Please select a contact (recipient)')
      return
    }

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get contact details
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) {
        throw new Error('Contact not found')
      }
      
      // Create postscript
      const { data: postscript, error } = await supabase
        .from('postscripts')
        .insert({
          user_id: user.id,
          recipient_contact_id: selectedContact,
          recipient_name: selectedContactData.full_name,
          title: 'New PostScript',
          message: ''
        })
        .select()
        .single()

      if (error) {
        console.error('PostScript creation error:', error)
        throw error
      }

      // Navigate to postscript edit page to set delivery time and content
      window.location.href = `/dashboard/postscripts/${postscript.id}`
    } catch (err) {
      console.error('Error creating postscript:', err)
      alert('Failed to create postscript: ' + (err as Error).message)
    }
  }

  const fetchUserName = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || ''
        const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)
        setUserFirstName(capitalized)
      }
    } catch (err) {
      console.error('Error fetching user name:', err)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity?limit=200&includePostscripts=true')
      if (res.ok) {
        const data = await res.json()
        const filtered = (data.activities || []).filter((a: ActivityItem) => a.type !== 'xp_earned')
        setActivities(filtered)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const animateIn = () => {
    // Scroll-driven animation handles the entrance effect now
    // This is just for filter transitions
    if (!gridRef.current) return
    const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
    
    layers.forEach((layer) => {
      gsap.fromTo(layer, 
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
    })
  }

  const handleCategoryClick = (categoryId: CategoryFilter) => {
    if (activeCategory === categoryId && openSubmenu === categoryId) {
      setOpenSubmenu(null)
    } else {
      setActiveCategory(categoryId)
      if (QUICK_ACTIONS[categoryId]) {
        setOpenSubmenu(categoryId)
      } else {
        setOpenSubmenu(null)
      }
    }
  }

  const handleQuickAction = async (action: string) => {
    console.log('Quick action:', action)
    
    switch(action) {
      case 'add_memory':
        // Open engagement modal with a memory prompt
        setEngagementPrompt({
          id: 'quick-add-memory',
          type: 'memory',
          promptText: 'What memory would you like to capture?',
          metadata: { category: 'moment' }
        })
        setShowEngagementModal(true)
        break
        
      case 'upload_memory':
        // Open file browser for media upload
        fileInputRef.current?.click()
        break
        
      case 'random_memory':
        // Fetch a random memory prompt from engagement cluster
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            console.log('Full engagement API response:', data)
            
            // Check all possible structures
            const allPrompts = data.prompts || data || []
            console.log('All prompts:', allPrompts)
            console.log('Sample prompt structure:', allPrompts[0])
            
            const memoryPrompts = allPrompts.filter((p: any) => 
              p.type === 'memory' || p.type === 'moment' || p.prompt_type === 'memory'
            )
            
            console.log('Memory prompts filtered:', memoryPrompts.length)
            
            // If no memory prompts found, use any prompt as a memory
            const targetPrompts = memoryPrompts.length > 0 ? memoryPrompts : allPrompts.slice(0, 10)
            console.log('Using prompts:', targetPrompts.length, 'from', memoryPrompts.length > 0 ? 'memory filter' : 'any prompts')
            
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              console.log('Selected random prompt:', randomPrompt)
              
              // Map API structure to modal expected structure
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: randomPrompt.type || randomPrompt.prompt_type || 'memory',
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What would you like to remember?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else if (allPrompts.length > 0) {
              // Fallback: use any prompt and treat it as a memory
              console.warn('No memory prompts found by filter, using any available prompt')
              const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
              
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: 'memory', // Force type to memory
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What would you like to remember?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else {
              console.error('No prompts available at all')
              alert('No prompts available')
            }
          } else {
            const errorText = await res.text()
            console.error('Failed to fetch prompts:', res.status, res.statusText, errorText)
            alert('Could not load memory prompts')
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
          alert('Could not load memory prompts')
        }
        break
        
      case 'add_wisdom':
        // Open engagement modal with wisdom prompt
        setEngagementPrompt({
          id: 'quick-add-wisdom',
          type: 'wisdom',
          promptText: 'What wisdom would you like to share?',
          metadata: { category: 'general' }
        })
        setShowEngagementModal(true)
        break
        
      case 'random_wisdom':
        // Fetch a random wisdom prompt
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            console.log('Full engagement API response:', data)
            
            const allPrompts = data.prompts || data || []
            console.log('All prompts:', allPrompts)
            
            const wisdomPrompts = allPrompts.filter((p: any) => 
              p.type === 'wisdom' || p.prompt_type === 'wisdom'
            )
            
            console.log('Wisdom prompts filtered:', wisdomPrompts.length)
            
            // If no wisdom prompts found, use any prompt as wisdom
            const targetPrompts = wisdomPrompts.length > 0 ? wisdomPrompts : allPrompts.slice(0, 10)
            console.log('Using prompts:', targetPrompts.length, 'from', wisdomPrompts.length > 0 ? 'wisdom filter' : 'any prompts')
            
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              console.log('Selected random wisdom:', randomPrompt)
              
              // Map API structure to modal expected structure
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: randomPrompt.type || randomPrompt.prompt_type || 'wisdom',
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What wisdom would you like to share?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else if (allPrompts.length > 0) {
              // Fallback: use any prompt and treat it as wisdom
              console.warn('No wisdom prompts found by filter, using any available prompt')
              const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
              
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: 'wisdom', // Force type to wisdom
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What wisdom would you like to share?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else {
              console.error('No prompts available at all')
              alert('No prompts available')
            }
          } else {
            const errorText = await res.text()
            console.error('Failed to fetch prompts:', res.status, res.statusText, errorText)
            alert('Could not load wisdom prompts')
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
          alert('Could not load wisdom prompts')
        }
        break
        
      case 'upload_media':
        // Open file browser for media upload
        fileInputRef.current?.click()
        break
        
      case 'digitize_photos':
        // Open camera for photo capture
        cameraInputRef.current?.click()
        break
        
      case 'new_interview':
        // Fetch contacts then open modal
        await fetchContacts()
        setShowInterviewModal(true)
        break
        
      case 'add_postscript':
        // Fetch contacts then open modal
        await fetchContacts()
        setShowPostscriptModal(true)
        break
        
      default:
        console.warn('Unknown action:', action)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    console.log('Files selected for upload:', fileArray.length)

    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create a memory
      setUploadProgress(10)
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: memoryMetadata.location || 'Uploaded Media',
          description: '',
          memory_date: memoryMetadata.date,
          location_name: memoryMetadata.location || null
        })
        .select()
        .single()

      if (memoryError) {
        console.error('Memory creation error:', memoryError)
        throw new Error(memoryError.message || 'Failed to create memory')
      }

      setUploadedMemoryId(memory.id)

      setUploadProgress(30)

      // Upload photos to this memory (one at a time)
      const uploadedResults = []
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/memories/${memory.id}/media`, {
          method: 'POST',
          body: formData,
        })

        const progress = 30 + ((i + 1) / fileArray.length) * 50
        setUploadProgress(Math.round(progress))

        if (response.ok) {
          const result = await response.json()
          uploadedResults.push(result)
          
          // Auto-trigger face detection for images
          if (result.file_type?.includes('image') || file.type.startsWith('image/')) {
            console.log('Running face detection on uploaded image:', result.id)
            fetch(`/api/media/${result.id}/detect-faces`, { 
              method: 'POST' 
            }).then(res => res.json()).then(faceResult => {
              if (faceResult.facesDetected > 0) {
                console.log(`Detected ${faceResult.facesDetected} face(s), auto-tagged: ${faceResult.autoTagged}`)
              }
            }).catch(err => {
              console.warn('Face detection failed:', err)
            })
          }
        } else {
          const error = await response.json()
          console.error('Upload failed for file:', file.name, error)
          throw new Error(error.error || 'Upload failed')
        }
      }

      setUploadedFiles(uploadedResults)
      setUploadProgress(100)
      
      // Move to backstory step
      setTimeout(() => {
        setUploadStep('backstory')
      }, 500)
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Upload error: ' + (err as Error).message)
      setShowUploadModal(false)
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSkipBackstory = () => {
    setShowUploadModal(false)
    setUploadedFiles([])
    setUploadProgress(0)
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    setMemoryMetadata({ date: new Date().toISOString().split('T')[0], location: '' })
    fetchActivities()
  }

  const handleAddBackstory = () => {
    if (!uploadedMemoryId) return
    
    // Open engagement modal with memory context
    setEngagementPrompt({
      id: uploadedMemoryId,
      type: 'memory',
      promptText: 'Tell us about these photos. What was happening?',
      metadata: {
        memoryId: uploadedMemoryId,
        isBackstory: true
      }
    })
    setShowEngagementModal(true)
    setShowUploadModal(false)
    
    // Reset upload state
    setUploadedFiles([])
    setUploadProgress(0)
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    setMemoryMetadata({ date: new Date().toISOString().split('T')[0], location: '' })
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    console.log('Photo captured:', file.name)

    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create a memory for the digitized photo
      setUploadProgress(10)
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: 'Digitized Photo',
          description: '',
          memory_date: memoryMetadata.date,
          location_name: memoryMetadata.location || null
        })
        .select()
        .single()

      if (memoryError) {
        console.error('Memory creation error:', memoryError)
        throw new Error(memoryError.message || 'Failed to create memory')
      }

      setUploadedMemoryId(memory.id)

      setUploadProgress(30)

      // Upload the photo
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/memories/${memory.id}/media`, {
        method: 'POST',
        body: formData
      })

      setUploadProgress(60)

      if (uploadRes.ok) {
        const uploadedFile = await uploadRes.json()
        const photoUrl = uploadedFile.url || uploadedFile.file_url
        
        console.log('Photo uploaded:', photoUrl)
        
        setUploadProgress(80)
        
        // Try to enhance it
        try {
          const enhanceRes = await fetch('/api/digitize/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: photoUrl })
          })

          if (enhanceRes.ok) {
            const { enhancedUrl } = await enhanceRes.json()
            console.log('Photo enhanced:', enhancedUrl)
            uploadedFile.enhanced = true
            uploadedFile.enhancedUrl = enhancedUrl
          }
        } catch (enhanceErr) {
          console.warn('Enhancement error:', enhanceErr)
        }
        
        // Auto-trigger face detection
        console.log('Running face detection on captured photo:', uploadedFile.id)
        fetch(`/api/media/${uploadedFile.id}/detect-faces`, { 
          method: 'POST' 
        }).then(res => res.json()).then(faceResult => {
          if (faceResult.facesDetected > 0) {
            console.log(`Detected ${faceResult.facesDetected} face(s), auto-tagged: ${faceResult.autoTagged}`)
          }
        }).catch(err => {
          console.warn('Face detection failed:', err)
        })

        setUploadedFiles([uploadedFile])
        setUploadProgress(100)
        
        setTimeout(() => {
          setUploadStep('backstory')
        }, 500)
      } else {
        const error = await uploadRes.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error capturing photo:', err)
      alert('Capture error: ' + (err as Error).message)
      setShowUploadModal(false)
    }

    // Reset the input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const filterActivities = (category: CategoryFilter) => {
    let filtered = activities

    if (category === 'interviews') {
      filtered = activities.filter(a => a.type === 'interview_response')
    } else if (category === 'memories') {
      filtered = activities.filter(a => a.type === 'memory_created' || a.type === 'memory_shared')
    } else if (category === 'wisdom') {
      filtered = activities.filter(a => a.type === 'wisdom_created' || a.type === 'wisdom_shared')
    } else if (category === 'media') {
      filtered = activities.filter(a => a.type === 'photos_uploaded')
    } else if (category === 'postscripts') {
      filtered = activities.filter(a => a.type === 'postscript_created')
    } else if (category === 'shared') {
      filtered = activities.filter(a => a.type.includes('_shared'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.metadata?.location?.toLowerCase().includes(q)
      )
    }

    if (gridRef.current && filteredActivities.length > 0) {
      const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
      gsap.to(layers, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => setFilteredActivities(filtered)
      })
    } else {
      setFilteredActivities(filtered)
    }
  }

  useEffect(() => {
    filterActivities(activeCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, activeCategory, searchQuery])

  useEffect(() => {
    if (filteredActivities.length > 0 && viewMode === 'card') {
      setTimeout(() => {
        animateIn()
        setupScrollAnimation()
      }, 50)
    }
  }, [filteredActivities, viewMode])

  const setupScrollAnimation = () => {
    if (!gridRef.current) return
    
    const layers = Array.from(gridRef.current.querySelectorAll('.card-animation-layer'))
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.fromTo(entry.target,
            {
              scale: 0.85,
              rotate: 5,
              opacity: 0.3
            },
            {
              scale: 1,
              rotate: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)'
            }
          )
          observer.unobserve(entry.target)
        }
      })
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    })
    
    layers.forEach((layer) => observer.observe(layer))
    
    return () => observer.disconnect()
  }

  return (
    <div className="feed-page" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="feed-header">
        <div className="header-content">
          <div style={{ marginTop: '200px', marginBottom: '40px' }}>
            {userFirstName && (
              <h1 className="welcome-heading">
                Hey {userFirstName}
              </h1>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
          <div className="header-controls">
            {/* Quick Actions - Horizontal Row Above Categories */}
            <AnimatePresence>
              {openSubmenu && QUICK_ACTIONS[openSubmenu] && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 300
                  }}
                  className="quick-actions-row"
                >
                  {QUICK_ACTIONS[openSubmenu].map((action, idx) => {
                    const Icon = action.icon
                    return (
                      <motion.button
                        key={action.action}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                          delay: idx * 0.05,
                          type: 'spring',
                          damping: 15,
                          stiffness: 300
                        }}
                        onClick={() => handleQuickAction(action.action)}
                        className="quick-action-btn"
                      >
                        <Icon size={18} />
                        <span>{action.label}</span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Tags + View Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
              <div className="filter-tags">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id as CategoryFilter)}
                    className={`category-tag ${activeCategory === cat.id ? 'active' : ''}`}
                  >
                    <span className="category-text-wrapper">
                      <span className="category-text category-text-top">{cat.label}</span>
                      <span className="category-text category-text-bottom">{cat.label}</span>
                    </span>
                    <span className="category-underline" />
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="view-toggle">
                <span className="view-label">View:</span>
                <button
                  onClick={() => setViewMode('card')}
                  className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
                >
                  <Grid size={16} />
                  <span>Card</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                >
                  <MapIcon size={16} />
                  <span>Map</span>
                </button>
              </div>
            </div>

            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="feed-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="empty-state">
            <p>No items found</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="map-container">
            <FeedMap activities={filteredActivities.filter(a => a.metadata?.lat && a.metadata?.lng)} />
          </div>
        ) : (
          <div ref={gridRef} className="masonry-grid">
            {filteredActivities.map((activity, index) => (
              <MasonryTile 
                key={activity.id} 
                activity={activity} 
                index={index} 
                isDarkMode={isDarkMode}
                playingAudio={playingAudio}
                onAudioToggle={handleAudioToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Hidden camera input for digitizing photos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
      />

      {/* Engagement Modal */}
      <AnimatePresence>
        {showEngagementModal && engagementPrompt && (
          <UnifiedEngagementModal
            prompt={engagementPrompt}
            onComplete={(result) => {
              console.log('Engagement completed:', result)
              setShowEngagementModal(false)
              setEngagementPrompt(null)
              // Refresh activities after submission
              fetchActivities()
            }}
            onClose={() => {
              setShowEngagementModal(false)
              setEngagementPrompt(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Interview Modal */}
      <AnimatePresence>
        {showInterviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowInterviewModal(false)
              setSelectedContact('')
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New Interview</h2>
              <p className="text-gray-600 mb-4">
                Who would you like to interview?
              </p>
              
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#406A56] text-gray-900 font-medium"
                style={{ color: '#1A1A1A' }}
              >
                <option value="" style={{ color: '#999' }}>Select a contact...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id} style={{ color: '#1A1A1A' }}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
              
              {contacts.length === 0 && (
                <p className="text-sm text-amber-600 mb-4">
                  No contacts found. Please add contacts first in the Contacts section.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreateInterview}
                  disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Interview
                </button>
                <button
                  onClick={() => {
                    setShowInterviewModal(false)
                    setSelectedContact('')
                  }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">
                {uploadStep === 'uploading' ? 'Upload Progress' : 'Add Backstory'}
              </h2>
              
              {uploadStep === 'uploading' && (
                <>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#406A56] to-[#4a7a64] h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
                  </div>

                  {/* Metadata Editing */}
                  {uploadProgress < 100 && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={memoryMetadata.date}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={memoryMetadata.location}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, location: e.target.value })}
                          placeholder="Where was this taken?"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => {
                          const fileUrl = file.enhancedUrl || file.url || file.file_url
                          const fileType = file.file_type || (file.url?.includes('image') ? 'image' : 'video')
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              {fileUrl && (
                                <img 
                                  src={fileUrl} 
                                  alt={`Upload ${idx + 1}`} 
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {fileType === 'image' ? '📸 Photo' : '🎥 Video'}
                                  {file.enhanced && ' (Enhanced)'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {memoryMetadata.date} {memoryMetadata.location && `• ${memoryMetadata.location}`}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {uploadStep === 'backstory' && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Great! Your {uploadedFiles.length} {uploadedFiles.length === 1 ? 'photo has' : 'photos have'} been uploaded.
                  </p>
                  <p className="text-gray-600 mb-6">
                    Would you like to add the story behind {uploadedFiles.length === 1 ? 'this photo' : 'these photos'}? You can share what was happening, who was there, or any special memories.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddBackstory}
                      className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors"
                    >
                      Add Backstory
                    </button>
                    <button
                      onClick={handleSkipBackstory}
                      className="flex-1 px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      Skip for Now
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PostScript Modal */}
      <AnimatePresence>
        {showPostscriptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowPostscriptModal(false)
              setSelectedContact('')
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New PostScript</h2>
              <p className="text-gray-600 mb-4">
                Who should receive this PostScript?
              </p>
              
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#406A56] text-gray-900 font-medium"
                style={{ color: '#1A1A1A' }}
              >
                <option value="" style={{ color: '#999' }}>Select a recipient...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id} style={{ color: '#1A1A1A' }}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
              
              {contacts.length === 0 && (
                <p className="text-sm text-amber-600 mb-4">
                  No contacts found. Please add contacts first in the Contacts section.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreatePostscript}
                  disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create PostScript
                </button>
                <button
                  onClick={() => {
                    setShowPostscriptModal(false)
                    setSelectedContact('')
                  }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .feed-page {
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .feed-page[data-theme="dark"] {
          background-color: #1A1A1A;
          color: #F5F5F5;
        }

        .feed-page[data-theme="light"] {
          background-color: #F8FAFC;
          color: #1A1A1A;
        }

        .feed-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
          padding: 24px 60px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .feed-header {
          background: rgba(26, 26, 26, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .feed-header {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .theme-toggle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: currentColor;
        }

        .feed-page[data-theme="light"] .theme-toggle {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .theme-toggle:hover {
          background: rgba(255, 92, 52, 0.1);
          border-color: #FF5C34;
          color: #FF5C34;
        }

        .header-content {
          max-width: 1920px;
          margin: 0 auto;
        }

        .page-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 700;
          font-size: 32px;
          margin: 0;
          letter-spacing: -0.5px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .page-title {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .page-title {
          color: #1A1A1A;
        }

        .welcome-heading {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 600;
          font-size: 4rem;
          margin: 0;
          letter-spacing: -1px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .welcome-heading {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .welcome-heading {
          color: #1A1A1A;
        }

        @media (max-width: 768px) {
          .welcome-heading {
            font-size: 3rem;
          }
        }

        .header-controls {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .quick-actions-row {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 0;
          right: 0;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 92, 52, 0.08);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .feed-page[data-theme="dark"] .quick-action-btn {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .feed-page[data-theme="light"] .quick-action-btn {
          color: #1A1A1A;
        }

        .quick-action-btn:hover {
          background: rgba(255, 92, 52, 0.15);
          transform: translateY(-1px);
        }

        .feed-page[data-theme="dark"] .quick-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .filter-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .view-label {
          font-size: 13px;
          font-weight: 500;
          opacity: 0.6;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .feed-page[data-theme="dark"] .view-btn {
          color: #aaa;
        }

        .feed-page[data-theme="light"] .view-btn {
          color: #666;
        }

        .view-btn.active {
          background: rgba(255, 92, 52, 0.1);
          color: #FF5C34;
          border-color: rgba(255, 92, 52, 0.3);
        }

        .category-tag {
          position: relative;
          padding: 8px 18px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 0;
        }

        .category-text-wrapper {
          position: relative;
          display: block;
          height: 20px;
          overflow: hidden;
        }

        .category-text {
          display: block;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          line-height: 20px;
        }

        .feed-page[data-theme="dark"] .category-text-top {
          color: #aaa;
        }

        .feed-page[data-theme="light"] .category-text-top {
          color: #666;
        }

        .category-text-bottom {
          position: absolute;
          top: 100%;
          left: 0;
          color: #C35F33;
        }

        .category-tag:hover .category-text-top {
          transform: translateY(-100%);
        }

        .category-tag:hover .category-text-bottom {
          transform: translateY(-100%);
        }

        .category-underline {
          position: absolute;
          bottom: 2px;
          left: 18px;
          right: 18px;
          height: 2px;
          background: #C35F33;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-tag:hover .category-underline {
          transform: scaleX(1);
        }

        .category-tag.active {
          font-weight: 600;
        }

        .category-tag.active::before {
          content: '';
          position: absolute;
          inset: -4px -8px;
          background-image: url('/images/nav-active-bg.svg');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          z-index: -1;
          opacity: 0.9;
        }

        .category-tag.active .category-text-top {
          color: #C35F33;
        }

        .category-tag.active .category-underline {
          transform: scaleX(1);
        }

        .feed-page[data-theme="dark"] .tag:hover:not(.active) {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .tag:hover:not(.active) {
          color: #1A1A1A;
          background: rgba(0,0,0,0.05);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 8px;
          min-width: 300px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .search-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .feed-page[data-theme="light"] .search-box {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #1A1A1A;
        }

        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          font-family: 'Inter', sans-serif;
          color: inherit;
        }

        .feed-page[data-theme="dark"] .search-box input::placeholder {
          color: #666;
        }

        .feed-page[data-theme="light"] .search-box input::placeholder {
          color: #999;
        }

        .feed-content {
          max-width: 1920px;
          margin: 0 auto;
          padding: 40px 60px;
        }

        .map-container {
          width: 100%;
          height: calc(100vh - 200px);
          min-height: 700px;
          border-radius: 16px;
          overflow: hidden;
        }

        .masonry-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          width: 100%;
          grid-auto-flow: dense;
        }

        .card-animation-layer {
          display: block;
          transform-origin: center;
          transform: scale(0.85) rotate(5deg);
          opacity: 0.3;
        }

        .card-animation-layer.large {
          grid-column: span 2;
          grid-row: span 2;
        }

        .card-animation-layer.medium {
          grid-column: span 1;
          grid-row: span 2;
        }

        .card-animation-layer.wide {
          grid-column: span 2;
        }

        .card {
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }

        .card:hover {
          z-index: 2;
        }

        .card-image {
          width: 100%;
          height: 180px;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .card-image::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8));
        }

        .card-animation-layer.large .card-image {
          height: 420px;
        }

        .card-animation-layer.medium .card-image {
          height: 400px;
        }

        .card-content {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }

        .card-meta {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          margin-bottom: 4px;
        }

        .card-title {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14px;
          line-height: 1.3;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-title {
          color: #fff;
        }

        .feed-page[data-theme="light"] .card-title {
          color: #1A1A1A;
        }

        .card-description {
          font-size: 12px;
          line-height: 1.4;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-description {
          color: #999;
        }

        .feed-page[data-theme="light"] .card-description {
          color: #666;
        }

        .card-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding-top: 8px;
          transition: border-color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-details {
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .card-details {
          border-top: 1px solid rgba(0,0,0,0.08);
        }

        .card-date,
        .card-location {
          font-size: 10px;
          font-family: 'Inter', sans-serif;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-date,
        .feed-page[data-theme="dark"] .card-location,
        .feed-page[data-theme="dark"] .card-details svg {
          color: #666;
        }

        .feed-page[data-theme="light"] .card-date,
        .feed-page[data-theme="light"] .card-location,
        .feed-page[data-theme="light"] .card-details svg {
          color: #888;
        }

        .loading-state {
          display: flex;
          justify-content: center;
          padding: 60px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 92, 52, 0.1);
          border-top-color: #FF5C34;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          font-size: 16px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .empty-state {
          color: #666;
        }

        .feed-page[data-theme="light"] .empty-state {
          color: #888;
        }

        @media (max-width: 1400px) {
          .masonry-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 1100px) {
          .masonry-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .masonry-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .card-animation-layer.wide,
          .card-animation-layer.large {
            grid-column: span 1;
          }
          .card-animation-layer.large,
          .card-animation-layer.medium {
            grid-row: span 1;
          }
          .card-animation-layer.large .card-image,
          .card-animation-layer.medium .card-image {
            height: 180px;
          }
          .feed-header,
          .feed-content {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
      `}</style>
    </div>
  )
}
