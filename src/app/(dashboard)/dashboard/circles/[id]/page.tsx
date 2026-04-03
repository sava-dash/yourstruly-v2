'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronLeft, Users, Settings, FileText, UserPlus, 
  Crown, Shield, User, Edit2, Trash2, LogOut, Vote,
  Image as ImageIcon, BookOpen, Clock, MessageCircle,
  Calendar, BarChart3, Bell
} from 'lucide-react'
import Link from 'next/link'
import CircleMemberCard, { CircleRole } from '@/components/circles/CircleMemberCard'
import InviteMemberModal from '@/components/circles/InviteMemberModal'
import CircleVoteModal, { VoteType, VoteStatus } from '@/components/circles/CircleVoteModal'
import CircleMessages, { CircleMessage } from '@/components/circles/CircleMessages'
import CircleScheduling, { ScheduledEvent } from '@/components/circles/CircleScheduling'
import CirclePolling, { Poll } from '@/components/circles/CirclePolling'
import CircleActivity, { Activity } from '@/components/circles/CircleActivity'
import CircleContentFeed, { SharedContent } from '@/components/circles/CircleContentFeed'
import '@/styles/page-styles.css'

// ============================================
// TYPES
// ============================================
interface Circle {
  id: string
  name: string
  description?: string
  created_at: string
  my_role?: CircleRole
}

interface CircleMember {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url?: string
  role: CircleRole
  joined_at: string
}

interface ActiveVote {
  id: string
  vote_type: VoteType
  target_member_name?: string
  target_member_id?: string
  description?: string
  status: VoteStatus
  yes_votes: number
  no_votes: number
  required_votes: number
  created_by_name: string
  created_at: string
  expires_at: string
  has_voted?: boolean
  my_vote?: 'yes' | 'no' | null
}

interface PendingInvite {
  id: string
  email?: string
  invite_link?: string
  invitee_name?: string  // Name of contact this invite is for
  created_at: string
  expires_at: string
}

type TabType = 'content' | 'messages' | 'schedule' | 'polls' | 'members' | 'settings'

// ============================================
// TAB CONFIG
// ============================================
const TABS: { id: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'content', label: 'Content', icon: <FileText size={14} /> },
  { id: 'messages', label: 'Messages', icon: <MessageCircle size={14} /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={14} /> },
  { id: 'polls', label: 'Polls', icon: <BarChart3 size={14} /> },
  { id: 'members', label: 'Members', icon: <Users size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} />, adminOnly: true },
]

// ============================================
// MAIN PAGE
// ============================================
export default function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<CircleMember[]>([])
  const [votes, setVotes] = useState<ActiveVote[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedVote, setSelectedVote] = useState<ActiveVote | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  
  // State for group features
  const [messages, setMessages] = useState<CircleMessage[]>([])
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [content, setContent] = useState<SharedContent[]>([])
  
  // Current user info
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const myMember = members.find(m => m.user_id === currentUserId)
  const myRole = circle?.my_role || myMember?.role || 'member'
  const isAdmin = myRole === 'owner' || myRole === 'admin'
  const isOwner = myRole === 'owner'

  useEffect(() => {
    loadCircle()
  }, [id])

  const loadCircle = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      
      // Get current user first (required for auth)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to view this circle')
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)
      
      // Fetch all data in parallel for better performance
      const [circleRes, membersRes, messagesRes, contentRes, votesRes, pendingRes] = await Promise.all([
        fetch(`/api/circles/${id}`),
        fetch(`/api/circles/${id}/members`),
        fetch(`/api/circles/${id}/messages?limit=50`),
        fetch(`/api/circles/${id}/content?limit=50`),
        fetch(`/api/circles/${id}/votes?status=active`),
        fetch(`/api/circles/${id}/members?status=pending`)
      ])

      // Process circle (required - throw if failed)
      if (!circleRes.ok) {
        const err = await circleRes.json()
        throw new Error(err.error || 'Failed to load circle')
      }
      const { circle: circleData } = await circleRes.json()
      setCircle(circleData)
      setEditForm({ name: circleData.name, description: circleData.description || '' })

      // Process members
      if (membersRes.ok) {
        const { members: membersData } = await membersRes.json()
        const transformedMembers: CircleMember[] = membersData.map((m: any) => ({
          id: m.id,
          user_id: m.user?.id || '',
          full_name: m.user?.full_name || 'Unknown',
          email: m.user?.email || '',
          avatar_url: m.user?.avatar_url,
          role: m.role,
          joined_at: m.joined_at || m.created_at
        }))
        setMembers(transformedMembers)
      }

      // Process messages
      if (messagesRes.ok) {
        const { messages: messagesData } = await messagesRes.json()
        const transformedMessages: CircleMessage[] = messagesData.map((m: any) => ({
          id: m.id,
          senderId: m.sender?.id || '',
          senderName: m.sender?.full_name || 'Unknown',
          senderAvatar: m.sender?.avatar_url,
          content: m.content || '',
          timestamp: new Date(m.created_at),
          type: m.media_type === 'image' ? 'image' : m.media_type === 'voice' ? 'voice' : 'text',
          imageUrl: m.media_type === 'image' ? m.media_url : undefined,
          isOwn: m.sender?.id === user.id,
          status: 'delivered' as const
        }))
        setMessages(transformedMessages)
      }

      // Process content
      if (contentRes.ok) {
        const { content: contentData } = await contentRes.json()
        const transformedContent: SharedContent[] = contentData.map((c: any) => {
          const isMemory = c.content_type === 'memory'
          const contentDetails = c.content || {}
          const coverMedia = contentDetails.memory_media?.find((m: any) => m.is_cover) || contentDetails.memory_media?.[0]
          
          return {
            id: c.id,
            type: isMemory ? 'memory' : 'wisdom',
            title: contentDetails.title || contentDetails.prompt_text?.slice(0, 50) || 'Untitled',
            description: contentDetails.description || contentDetails.response_text?.slice(0, 100),
            previewImage: coverMedia?.file_url,
            sharedById: c.sharer?.id || '',
            sharedByName: c.sharer?.full_name || 'Unknown',
            sharedByAvatar: c.sharer?.avatar_url,
            sharedAt: new Date(c.created_at),
            originalCreatedAt: contentDetails.memory_date ? new Date(contentDetails.memory_date) : undefined,
            likes: 0,
            comments: 0,
            hasLiked: false,
            tags: []
          }
        })
        setContent(transformedContent)
      }

      // Process votes (need members for required_votes calculation)
      if (votesRes.ok) {
        const { votes: votesData } = await votesRes.json()
        const transformedVotes: ActiveVote[] = votesData.map((v: any) => ({
          id: v.id,
          vote_type: v.vote_type.replace('_admin', '').replace('remove_member', 'remove') as VoteType,
          target_member_name: v.target?.full_name,
          target_member_id: v.target_user_id,
          description: v.description,
          status: v.status,
          yes_votes: v.yes_count || 0,
          no_votes: v.no_count || 0,
          required_votes: v.required_votes || 2, // Default fallback since members processed async
          created_by_name: v.initiator?.full_name || 'Unknown',
          created_at: v.created_at,
          expires_at: v.expires_at,
          has_voted: v.my_vote !== null,
          my_vote: v.my_vote
        }))
        setVotes(transformedVotes)
      }

      // Process pending invites
      if (pendingRes.ok) {
        const { members: pendingData } = await pendingRes.json()
        const transformedInvites: PendingInvite[] = pendingData.map((m: any) => ({
          id: m.id,
          email: m.user?.email,
          created_at: m.created_at,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }))
        setPendingInvites(transformedInvites)
      }

      // TODO: Events, polls, and activities would need their own API endpoints
      setEvents([])
      setPolls([])
      setActivities([])

    } catch (err: any) {
      console.error('Error loading circle:', err)
      setError(err.message || 'Failed to load circle')
    } finally {
      setLoading(false)
    }
  }

  // Member management handlers
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the circle?')) return
    
    try {
      const res = await fetch(`/api/circles/${id}/members/${memberId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to remove member')
      }
      setMembers(members.filter(m => m.id !== memberId))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleInitiateVote = async (memberId: string, voteType: 'promote' | 'demote') => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    try {
      const apiVoteType = voteType === 'promote' ? 'promote_admin' : 'demote_admin'
      const res = await fetch(`/api/circles/${id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: apiVoteType,
          target_user_id: member.user_id
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to initiate vote')
      }
      
      const { vote } = await res.json()
      
      const newVote: ActiveVote = {
        id: vote.id,
        vote_type: voteType,
        target_member_name: member.full_name,
        target_member_id: member.id,
        status: 'active',
        yes_votes: 0,
        no_votes: 0,
        required_votes: Math.ceil(members.filter(m => ['owner', 'admin'].includes(m.role)).length / 2),
        created_by_name: 'You',
        created_at: vote.created_at,
        expires_at: vote.expires_at,
        has_voted: false,
        my_vote: null
      }
      setVotes([newVote, ...votes])
      setSelectedVote(newVote)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleVote = async (voteId: string, decision: 'yes' | 'no') => {
    try {
      const res = await fetch(`/api/circles/${id}/votes/${voteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: decision })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cast vote')
      }
      
      setVotes(votes.map(v => {
        if (v.id === voteId) {
          return {
            ...v,
            yes_votes: decision === 'yes' ? v.yes_votes + 1 : v.yes_votes,
            no_votes: decision === 'no' ? v.no_votes + 1 : v.no_votes,
            has_voted: true,
            my_vote: decision
          }
        }
        return v
      }))
      setSelectedVote(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Invite handlers
  const handleInviteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/circles/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to invite user')
      }
      
      alert('Invitation sent!')
      // Refresh pending invites
      loadCircle()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleGenerateLink = async (forContact?: { name: string; email?: string }) => {
    try {
      const res = await fetch(`/api/circles/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_link: true })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate invite link')
      }
      
      const { invite } = await res.json()
      
      const newInvite: PendingInvite = {
        id: invite.id,
        invite_link: `${window.location.origin}/circles/invite/${invite.token}`,
        invitee_name: forContact?.name,
        email: forContact?.email,
        created_at: invite.created_at,
        expires_at: invite.expires_at
      }
      setPendingInvites([newInvite, ...pendingInvites])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/circles/${id}/members/${inviteId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel invite')
      }
      
      setPendingInvites(pendingInvites.filter(i => i.id !== inviteId))
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Settings handlers
  const handleSaveSettings = async () => {
    if (!editForm.name.trim()) return
    
    try {
      const res = await fetch(`/api/circles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update circle')
      }
      
      const { circle: updated } = await res.json()
      setCircle(circle ? { ...circle, ...updated } : null)
      setEditMode(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleLeaveCircle = async () => {
    if (!confirm('Are you sure you want to leave this circle?')) return
    
    try {
      const myMemberRecord = members.find(m => m.user_id === currentUserId)
      if (!myMemberRecord) return
      
      const res = await fetch(`/api/circles/${id}/members/${myMemberRecord.id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to leave circle')
      }
      
      window.location.href = '/dashboard/circles'
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteCircle = async () => {
    if (!confirm('Delete this circle? This action cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/circles/${id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const err = await res.json()
        if (err.require_vote) {
          alert('Multiple admins exist. A vote is required to delete this circle.')
          return
        }
        throw new Error(err.error || 'Failed to delete circle')
      }
      
      window.location.href = '/dashboard/circles'
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Message handlers
  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'voice') => {
    try {
      const res = await fetch(`/api/circles/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          media_type: type !== 'text' ? type : undefined
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send message')
      }
      
      const { message } = await res.json()
      
      const newMessage: CircleMessage = {
        id: message.id,
        senderId: currentUserId,
        senderName: 'You',
        content: message.content,
        timestamp: new Date(message.created_at),
        type,
        isOwn: true,
        status: 'sent'
      }
      setMessages([...messages, newMessage])
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Scheduling handlers (local state for now - TODO: API endpoints)
  const handleCreateEvent = (event: Omit<ScheduledEvent, 'id' | 'createdAt' | 'responses' | 'status'>) => {
    const newEvent: ScheduledEvent = {
      ...event,
      id: Date.now().toString(),
      status: 'voting',
      responses: [{
        memberId: currentUserId,
        memberName: 'You',
        votes: event.proposedSlots.map((_, i) => ({ slotIndex: i, available: true }))
      }],
      createdAt: new Date()
    }
    setEvents([newEvent, ...events])
  }

  const handleVoteOnEvent = (eventId: string, slotIndex: number, available: boolean) => {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e
      
      const existingResponse = e.responses.find(r => r.memberId === currentUserId)
      if (existingResponse) {
        const existingVote = existingResponse.votes.find(v => v.slotIndex === slotIndex)
        if (existingVote) {
          existingVote.available = available
        } else {
          existingResponse.votes.push({ slotIndex, available })
        }
      } else {
        e.responses.push({
          memberId: currentUserId,
          memberName: 'You',
          votes: [{ slotIndex, available }]
        })
      }
      return { ...e }
    }))
  }

  const handleConfirmEvent = (eventId: string, slotIndex: number) => {
    setEvents(events.map(e => {
      if (e.id !== eventId) return e
      return {
        ...e,
        status: 'confirmed' as const,
        finalSlot: e.proposedSlots[slotIndex]
      }
    }))
  }

  // Polling handlers (local state for now - TODO: API endpoints)
  const handleCreatePoll = (poll: Omit<Poll, 'id' | 'createdAt' | 'totalVoters' | 'status'>) => {
    const newPoll: Poll = {
      ...poll,
      id: Date.now().toString(),
      status: 'active',
      totalVoters: members.length,
      createdAt: new Date()
    }
    setPolls([newPoll, ...polls])
  }

  const handleVoteOnPoll = (pollId: string, optionId: string) => {
    setPolls(polls.map(p => {
      if (p.id !== pollId) return p
      
      return {
        ...p,
        options: p.options.map(opt => {
          if (p.isMultipleChoice) {
            // Multiple choice: toggle vote
            if (opt.id === optionId) {
              if (opt.votes.includes(currentUserId)) {
                return { ...opt, votes: opt.votes.filter(v => v !== currentUserId) }
              } else {
                return { ...opt, votes: [...opt.votes, currentUserId] }
              }
            }
          } else {
            // Single choice: remove from others, add to selected
            if (opt.id === optionId) {
              if (!opt.votes.includes(currentUserId)) {
                return { ...opt, votes: [...opt.votes, currentUserId] }
              }
            } else {
              return { ...opt, votes: opt.votes.filter(v => v !== currentUserId) }
            }
          }
          return opt
        })
      }
    }))
  }

  const handleClosePoll = (pollId: string) => {
    setPolls(polls.map(p => p.id === pollId ? { ...p, status: 'closed' as const } : p))
  }

  const handleDeletePoll = (pollId: string) => {
    if (confirm('Delete this poll?')) {
      setPolls(polls.filter(p => p.id !== pollId))
    }
  }

  // Content handlers
  const handleViewContent = (contentId: string) => {
    // TODO: Navigate to content detail page
    console.log('View content:', contentId)
  }

  const handleLikeContent = (contentId: string) => {
    // TODO: Implement like API
    setContent(content.map(c => {
      if (c.id !== contentId) return c
      return {
        ...c,
        hasLiked: !c.hasLiked,
        likes: c.hasLiked ? c.likes - 1 : c.likes + 1
      }
    }))
  }

  const handleCommentContent = (contentId: string) => {
    // TODO: Implement comment UI
    console.log('Comment on content:', contentId)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Count unread/active items for badges
  const activeVotesCount = votes.filter(v => v.status === 'active' && !v.has_voted).length
  const activeEventsCount = events.filter(e => e.status === 'voting').length
  const activePollsCount = polls.filter(p => p.status === 'active').length

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto animate-pulse">
          {/* Header skeleton */}
          <header className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#2D5A3D]/10" />
                <div>
                  <div className="h-6 w-48 bg-[#2D5A3D]/10 rounded mb-2" />
                  <div className="h-4 w-24 bg-[#2D5A3D]/10 rounded" />
                </div>
              </div>
            </div>
          </header>
          
          {/* Tabs skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 w-24 bg-[#2D5A3D]/10 rounded-full" />
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 border border-[#2D5A3D]/10">
                <div className="h-5 w-3/4 bg-[#2D5A3D]/10 rounded mb-3" />
                <div className="h-4 w-1/2 bg-[#2D5A3D]/10 rounded mb-2" />
                <div className="h-4 w-2/3 bg-[#2D5A3D]/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !circle) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-[#666] mb-4">{error || 'Circle not found'}</p>
          <Link href="/dashboard/circles" className="text-[#2D5A3D] hover:underline">
            Back to circles
          </Link>
        </div>
      </div>
    )
  }

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || isAdmin)

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/circles" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
                  <Users size={28} className="text-[#2D5A3D]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#2d2d2d]">{circle.name}</h1>
                  <p className="text-[#666] text-sm">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
          {circle.description && (
            <p className="text-[#666] mt-4 ml-[72px]">{circle.description}</p>
          )}
        </header>

        {/* Active Votes Banner */}
        {votes.filter(v => v.status === 'active').length > 0 && (
          <div className="mb-6 p-4 bg-[#C4A235]/10 border border-[#C4A235]/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Vote size={18} className="text-[#8a7c08]" />
              <span className="font-medium text-[#8a7c08]">Active Votes</span>
            </div>
            <div className="space-y-2">
              {votes.filter(v => v.status === 'active').map(vote => (
                <button
                  key={vote.id}
                  onClick={() => setSelectedVote(vote)}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-[#C4A235]/5 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-[#2d2d2d]">
                      {vote.vote_type === 'promote' ? 'Promote' : 'Demote'} {vote.target_member_name}
                    </p>
                    <p className="text-xs text-[#666]">
                      {vote.yes_votes}/{vote.required_votes} votes needed
                    </p>
                  </div>
                  {vote.has_voted ? (
                    <span className="text-xs text-[#2D5A3D]">Voted ✓</span>
                  ) : isAdmin ? (
                    <span className="text-xs text-[#B8562E] font-medium">Vote Now →</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity Sidebar (on larger screens) */}
        <div className="lg:grid lg:grid-cols-[1fr,280px] lg:gap-6">
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`filter-btn flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id ? 'filter-btn-active' : ''
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {/* Badges */}
                  {tab.id === 'schedule' && activeEventsCount > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-[#C4A235] text-[10px] font-bold flex items-center justify-center text-[#2d2d2d]">
                      {activeEventsCount}
                    </span>
                  )}
                  {tab.id === 'polls' && activePollsCount > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-[#4A3552] text-[10px] font-bold flex items-center justify-center text-white">
                      {activePollsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'content' && (
              <CircleContentFeed
                content={content}
                currentUserId={currentUserId}
                onViewContent={handleViewContent}
                onLikeContent={handleLikeContent}
                onCommentContent={handleCommentContent}
              />
            )}

            {activeTab === 'messages' && (
              <CircleMessages
                circleName={circle.name}
                memberCount={members.length}
                currentUserId={currentUserId}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            )}

            {activeTab === 'schedule' && (
              <CircleScheduling
                circleId={id}
                currentUserId={currentUserId}
                members={members.map(m => ({ id: m.user_id, name: m.full_name }))}
                events={events}
                onCreateEvent={handleCreateEvent}
                onVote={handleVoteOnEvent}
                onConfirmEvent={handleConfirmEvent}
              />
            )}

            {activeTab === 'polls' && (
              <CirclePolling
                circleId={id}
                currentUserId={currentUserId}
                memberCount={members.length}
                polls={polls}
                onCreatePoll={handleCreatePoll}
                onVote={handleVoteOnPoll}
                onClosePoll={handleClosePoll}
                onDeletePoll={handleDeletePoll}
              />
            )}

            {activeTab === 'members' && (
              <div>
                <div className="section-header">
                  <div className="section-title">
                    <div className="section-title-icon bg-[#2D5A3D]/10">
                      <Users size={18} className="text-[#2D5A3D]" />
                    </div>
                    <span>Members ({members.length})</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="btn-primary"
                    >
                      <UserPlus size={16} />
                      Invite
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {members.map(member => (
                    <CircleMemberCard
                      key={member.id}
                      member={member}
                      currentUserRole={myRole}
                      currentUserId={currentUserId}
                      onRemove={handleRemoveMember}
                      onInitiateVote={handleInitiateVote}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && isAdmin && (
              <div className="space-y-6">
                {/* Circle Info */}
                <div className="content-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#2d2d2d]">Circle Information</h3>
                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#666] mb-1.5">Circle Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666] mb-1.5">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="form-textarea"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setEditForm({ name: circle.name, description: circle.description || '' })
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button onClick={handleSaveSettings} className="btn-primary">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-[#666]">Name</p>
                        <p className="text-[#2d2d2d] font-medium">{circle.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#666]">Description</p>
                        <p className="text-[#2d2d2d]">{circle.description || 'No description'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#666]">Created</p>
                        <p className="text-[#2d2d2d]">{formatDate(circle.created_at)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voting Settings */}
                <div className="content-card">
                  <h3 className="text-lg font-semibold text-[#2d2d2d] mb-4">Voting</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#2D5A3D]/5 rounded-xl">
                      <div>
                        <p className="font-medium text-[#2d2d2d]">Promotion Votes Required</p>
                        <p className="text-sm text-[#666]">Majority of admins must approve</p>
                      </div>
                      <span className="text-[#2D5A3D] font-medium">50%+</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#2D5A3D]/5 rounded-xl">
                      <div>
                        <p className="font-medium text-[#2d2d2d]">Vote Duration</p>
                        <p className="text-sm text-[#666]">Time before vote expires</p>
                      </div>
                      <span className="text-[#2D5A3D] font-medium">7 days</span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="danger-zone">
                  <h3 className="danger-zone-title">Danger Zone</h3>
                  <div className="space-y-3">
                    {!isOwner && (
                      <button onClick={handleLeaveCircle} className="btn-danger">
                        <LogOut size={16} />
                        Leave Circle
                      </button>
                    )}
                    {isOwner && (
                      <button onClick={handleDeleteCircle} className="btn-danger">
                        <Trash2 size={16} />
                        Delete Circle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Sidebar (desktop) */}
          <div className="hidden lg:block">
            <CircleActivity
              activities={activities}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        {/* Activity (mobile - shown at bottom) */}
        <div className="lg:hidden mt-6">
          <CircleActivity
            activities={activities}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMemberModal
          circleName={circle.name}
          pendingInvites={pendingInvites}
          onClose={() => setShowInviteModal(false)}
          onInviteUser={handleInviteUser}
          onGenerateLink={handleGenerateLink}
          onCancelInvite={handleCancelInvite}
        />
      )}

      {/* Vote Modal */}
      {selectedVote && (
        <CircleVoteModal
          vote={selectedVote}
          isAdmin={isAdmin}
          onClose={() => setSelectedVote(null)}
          onVote={handleVote}
        />
      )}
    </div>
  )
}
