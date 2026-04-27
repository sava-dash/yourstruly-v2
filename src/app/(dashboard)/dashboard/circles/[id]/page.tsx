'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, Users, Settings, FileText, UserPlus,
  Crown, Shield, User, Edit2, Trash2, LogOut, Vote,
  Image as ImageIcon, BookOpen, Clock, MessageCircle,
  Calendar, BarChart3, Bell, X, Save
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
interface TabConfig {
  id: TabType
  label: string
  icon: React.ReactNode
  /** Editorial accent shown when this tab is active. */
  bg: string
  ink: string
  adminOnly?: boolean
}

const TABS: TabConfig[] = [
  { id: 'content',  label: 'CONTENT',  icon: <FileText size={13} />,     bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
  { id: 'messages', label: 'MESSAGES', icon: <MessageCircle size={13} />, bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
  { id: 'schedule', label: 'SCHEDULE', icon: <Calendar size={13} />,      bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
  { id: 'polls',    label: 'POLLS',    icon: <BarChart3 size={13} />,     bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
  { id: 'members',  label: 'MEMBERS',  icon: <Users size={13} />,         bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
  { id: 'settings', label: 'SETTINGS', icon: <Settings size={13} />,      bg: 'var(--ed-ink, #111)',       ink: '#fff', adminOnly: true },
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

  if (error || !circle) {
    return (
      <div
        className="relative min-h-screen"
        style={{ background: 'var(--ed-cream, #F3ECDC)', paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <p
            className="text-[11px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)] mb-3"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
          >
            {error ? 'COULD NOT LOAD CIRCLE' : 'CIRCLE NOT FOUND'}
          </p>
          {error && <p className="text-[14px] text-[var(--ed-muted,#6F6B61)] mb-5">{error}</p>}
          <Link
            href="/dashboard/circles"
            className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              background: 'var(--ed-paper, #FFFBF1)',
              color: 'var(--ed-ink, #111)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            ← BACK TO CIRCLES
          </Link>
        </div>
      </div>
    )
  }

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || isAdmin)

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
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/circles"
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: '2px solid var(--ed-ink, #111)',
              background: 'var(--ed-paper, #FFFBF1)',
            }}
            aria-label="Back to circles"
          >
            <ChevronLeft size={16} className="text-[var(--ed-ink,#111)]" />
          </Link>
          <span
            aria-hidden
            className="flex items-center justify-center shrink-0"
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              color: 'var(--ed-ink, #111)',
            }}
          >
            <Users size={26} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[var(--ed-ink,#111)] leading-tight truncate"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(28px, 5vw, 56px)',
              }}
            >
              {circle.name.toUpperCase()}
            </h1>
            <p
              className="text-[11px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mt-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              {members.length} {members.length === 1 ? 'MEMBER' : 'MEMBERS'}
              {circle.description && (
                <span> · {circle.description.toUpperCase()}</span>
              )}
            </p>
          </div>
        </div>

        {/* Active Votes Banner — editorial frame, same data + behaviour. */}
        {votes.filter((v) => v.status === 'active').length > 0 && (
          <div
            className="mb-6 p-4"
            style={{
              background: 'var(--ed-yellow, #F2C84B)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Vote size={14} className="text-[var(--ed-ink,#111)]" />
              <span
                className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                ACTIVE VOTES
              </span>
            </div>
            <div className="space-y-2">
              {votes.filter((v) => v.status === 'active').map((vote) => (
                <button
                  key={vote.id}
                  onClick={() => setSelectedVote(vote)}
                  className="w-full flex items-center justify-between p-3 text-left"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--ed-ink,#111)]">
                      {vote.vote_type === 'promote' ? 'Promote' : 'Demote'} {vote.target_member_name}
                    </p>
                    <p
                      className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] mt-0.5"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      {vote.yes_votes}/{vote.required_votes} VOTES NEEDED
                    </p>
                  </div>
                  {vote.has_voted ? (
                    <span
                      className="text-[10px] tracking-[0.18em] text-[var(--ed-blue,#2A5CD3)]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      VOTED ✓
                    </span>
                  ) : isAdmin ? (
                    <span
                      className="text-[10px] tracking-[0.18em] text-[var(--ed-red,#E23B2E)]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      VOTE NOW →
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity Sidebar (on larger screens) */}
        <div className="lg:grid lg:grid-cols-[1fr,280px] lg:gap-6">
          <div>
            {/* Editorial pill tabs — color-coded active state matches mock. */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em] whitespace-nowrap transition-transform hover:-translate-y-0.5"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: isActive ? tab.bg : 'var(--ed-paper, #FFFBF1)',
                      color: isActive ? tab.ink : 'var(--ed-ink, #111)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 999,
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.id === 'schedule' && activeEventsCount > 0 && (
                      <span
                        className="ml-1 inline-flex items-center justify-center text-[9px]"
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 4px',
                          background: 'var(--ed-ink, #111)',
                          color: '#fff',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          borderRadius: 999,
                        }}
                      >
                        {activeEventsCount}
                      </span>
                    )}
                    {tab.id === 'polls' && activePollsCount > 0 && (
                      <span
                        className="ml-1 inline-flex items-center justify-center text-[9px]"
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 4px',
                          background: 'var(--ed-ink, #111)',
                          color: '#fff',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          borderRadius: 999,
                        }}
                      >
                        {activePollsCount}
                      </span>
                    )}
                    {tab.id === 'members' && members.length > 0 && (
                      <span
                        className="ml-1 inline-flex items-center justify-center text-[9px]"
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 4px',
                          background: isActive ? '#fff' : 'var(--ed-ink, #111)',
                          color: isActive ? 'var(--ed-ink, #111)' : '#fff',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          borderRadius: 999,
                        }}
                      >
                        {members.length}
                      </span>
                    )}
                  </button>
                )
              })}
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
                {/* Editorial section header — count + invite button */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block rounded-full"
                      style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }}
                    />
                    <span
                      className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      MEMBERS ({members.length})
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em]"
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        background: 'var(--ed-red, #E23B2E)',
                        color: '#fff',
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    >
                      <UserPlus size={12} /> INVITE
                    </button>
                  )}
                </div>

                {/* Editorial member rows. Avatar square color cycles through
                    the palette so the list reads as a graphic block (mock).
                    The existing CircleMemberCard handlers are still wired
                    via Remove / Promote / Demote buttons inside each row. */}
                <div className="flex flex-col gap-2">
                  {members.map((m, idx) => {
                    const palette = [
                      { bg: 'var(--ed-red, #E23B2E)',    fg: '#fff' },
                      { bg: 'var(--ed-yellow, #F2C84B)', fg: 'var(--ed-ink, #111)' },
                      { bg: 'var(--ed-blue, #2A5CD3)',   fg: '#fff' },
                      { bg: 'var(--ed-ink, #111)',       fg: '#fff' },
                    ]
                    const colors = palette[idx % palette.length]
                    const isMe = m.user_id === currentUserId
                    const canManage = isAdmin && !isMe && m.role !== 'owner'
                    const roleColor =
                      m.role === 'owner'
                        ? { bg: 'var(--ed-yellow, #F2C84B)', fg: 'var(--ed-ink, #111)' }
                        : m.role === 'admin'
                        ? { bg: 'var(--ed-blue, #2A5CD3)', fg: '#fff' }
                        : { bg: 'var(--ed-red, #E23B2E)', fg: '#fff' }
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-3"
                        style={{
                          background: 'var(--ed-paper, #FFFBF1)',
                          border: '2px solid var(--ed-ink, #111)',
                          borderRadius: 2,
                        }}
                      >
                        <span
                          className="flex items-center justify-center text-[14px] font-bold shrink-0"
                          style={{
                            width: 40,
                            height: 40,
                            background: colors.bg,
                            color: colors.fg,
                            border: '2px solid var(--ed-ink, #111)',
                            borderRadius: 2,
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {(m.full_name || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-[var(--ed-ink,#111)] font-semibold truncate">
                            {(m.full_name || 'Unknown').toUpperCase()}
                            {isMe && <span className="ml-1 text-[10px] text-[var(--ed-muted,#6F6B61)]">(you)</span>}
                          </p>
                          <p
                            className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            JOINED {formatDate(m.joined_at).toUpperCase()}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 text-[9px] tracking-[0.16em] shrink-0"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: roleColor.bg,
                            color: roleColor.fg,
                            border: '1.5px solid var(--ed-ink, #111)',
                            borderRadius: 999,
                          }}
                        >
                          {m.role === 'owner' ? <Crown size={10} /> : m.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                          {m.role.toUpperCase()}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            {m.role === 'member' && (
                              <button
                                onClick={() => handleInitiateVote(m.id, 'promote')}
                                className="px-2 py-1 text-[9px] tracking-[0.16em]"
                                style={{
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontWeight: 700,
                                  background: 'var(--ed-paper, #FFFBF1)',
                                  color: 'var(--ed-ink, #111)',
                                  border: '1.5px solid var(--ed-ink, #111)',
                                  borderRadius: 2,
                                }}
                                title="Propose promotion to admin"
                              >
                                PROMOTE
                              </button>
                            )}
                            {m.role === 'admin' && (
                              <button
                                onClick={() => handleInitiateVote(m.id, 'demote')}
                                className="px-2 py-1 text-[9px] tracking-[0.16em]"
                                style={{
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontWeight: 700,
                                  background: 'var(--ed-paper, #FFFBF1)',
                                  color: 'var(--ed-ink, #111)',
                                  border: '1.5px solid var(--ed-ink, #111)',
                                  borderRadius: 2,
                                }}
                                title="Propose demotion"
                              >
                                DEMOTE
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5"
                              style={{
                                background: 'var(--ed-paper, #FFFBF1)',
                                color: 'var(--ed-red, #E23B2E)',
                                border: '1.5px solid var(--ed-ink, #111)',
                                borderRadius: 999,
                              }}
                              title="Remove member"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'settings' && isAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* CIRCLE DETAILS panel */}
                <section
                  className="p-5"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }} />
                      <h3
                        className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        CIRCLE DETAILS
                      </h3>
                    </div>
                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-1.5"
                        style={{
                          background: 'var(--ed-paper, #FFFBF1)',
                          color: 'var(--ed-ink, #111)',
                          border: '1.5px solid var(--ed-ink, #111)',
                          borderRadius: 999,
                        }}
                        title="Edit details"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <label
                          className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1"
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                        >
                          CIRCLE NAME
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)]"
                          style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1"
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                        >
                          DESCRIPTION
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          rows={3}
                          className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] resize-none"
                          style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setEditForm({ name: circle.name, description: circle.description || '' })
                          }}
                          className="px-3 py-1.5 text-[10px] tracking-[0.18em]"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: 'transparent',
                            color: 'var(--ed-ink, #111)',
                            border: '2px solid var(--ed-ink, #111)',
                            borderRadius: 2,
                          }}
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleSaveSettings}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.18em]"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: 'var(--ed-red, #E23B2E)',
                            color: '#fff',
                            border: '2px solid var(--ed-ink, #111)',
                            borderRadius: 2,
                          }}
                        >
                          <Save size={11} /> SAVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p
                          className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-0.5"
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                        >
                          NAME
                        </p>
                        <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold">{circle.name}</p>
                      </div>
                      <div>
                        <p
                          className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-0.5"
                          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                        >
                          DESCRIPTION
                        </p>
                        <p className="text-[14px] text-[var(--ed-ink,#111)]">{circle.description || 'No description'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p
                            className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-0.5"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            CREATED
                          </p>
                          <p className="text-[13px] text-[var(--ed-ink,#111)]">{formatDate(circle.created_at)}</p>
                        </div>
                        <div>
                          <p
                            className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-0.5"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            MEMBERS
                          </p>
                          <p className="text-[13px] text-[var(--ed-ink,#111)]">{members.length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* VOTING SETTINGS panel */}
                <section
                  className="p-5"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-blue, #2A5CD3)' }} />
                    <h3
                      className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      VOTING SETTINGS
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div
                      className="flex items-center justify-between p-3"
                      style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--ed-ink,#111)]">Promotion votes required</p>
                        <p className="text-[12px] text-[var(--ed-muted,#6F6B61)]">Majority of admins must approve</p>
                      </div>
                      <span
                        className="text-[10px] tracking-[0.18em] text-[var(--ed-blue,#2A5CD3)]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        50%+
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between p-3"
                      style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--ed-ink,#111)]">Vote duration</p>
                        <p className="text-[12px] text-[var(--ed-muted,#6F6B61)]">Time before vote expires</p>
                      </div>
                      <span
                        className="text-[10px] tracking-[0.18em] text-[var(--ed-blue,#2A5CD3)]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                      >
                        7 DAYS
                      </span>
                    </div>
                  </div>
                </section>

                {/* DANGER ZONE — leave/delete row spanning full width */}
                <section
                  className="lg:col-span-2 p-5"
                  style={{
                    background: 'rgba(226,59,46,0.08)',
                    border: '2px solid var(--ed-red, #E23B2E)',
                    borderRadius: 2,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }} />
                    <h3
                      className="text-[11px] tracking-[0.22em] text-[var(--ed-red,#E23B2E)]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      DANGER ZONE
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isOwner && (
                      <button
                        onClick={handleLeaveCircle}
                        className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em]"
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          background: 'var(--ed-yellow, #F2C84B)',
                          color: 'var(--ed-ink, #111)',
                          border: '2px solid var(--ed-ink, #111)',
                          borderRadius: 2,
                        }}
                      >
                        <LogOut size={12} /> LEAVE CIRCLE
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={handleDeleteCircle}
                        className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em]"
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          background: 'var(--ed-red, #E23B2E)',
                          color: '#fff',
                          border: '2px solid var(--ed-ink, #111)',
                          borderRadius: 2,
                        }}
                      >
                        <Trash2 size={12} /> DELETE CIRCLE
                      </button>
                    )}
                  </div>
                </section>
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
