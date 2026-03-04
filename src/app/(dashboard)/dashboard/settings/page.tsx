'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, User, Bell, Download, Trash2, LogOut, Sparkles, Loader2, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '@/styles/page-styles.css'

interface Settings {
  email_notifications: boolean
  memory_reminders: boolean
  share_notifications: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    email_notifications: true,
    memory_reminders: true,
    share_notifications: true,
  })
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false)
  const [embeddingStats, setEmbeddingStats] = useState<{ processed: number; errors: number } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      
      if (data?.settings) {
        setSettings({ ...settings, ...data.settings })
      }
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ settings })
      .eq('id', user.id)

    if (error) {
      setMessage('Failed to save settings')
    } else {
      setMessage('Settings saved!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    if (!confirm('This will permanently delete all your memories, contacts, and data. Type "DELETE" to confirm.')) return

    alert('Account deletion requested. Please contact support to complete this process.')
  }

  const handleGenerateEmbeddings = async () => {
    setGeneratingEmbeddings(true)
    setEmbeddingStats(null)
    setMessage('Generating AI embeddings for your content...')

    try {
      const res = await fetch('/api/embeddings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (data.error) {
        setMessage(`Error: ${data.error}`)
      } else {
        setEmbeddingStats(data)
        setMessage(`AI indexing complete! Processed ${data.processed} items.`)
      }
    } catch (error) {
      setMessage('Failed to generate embeddings. Check your OpenAI API key.')
    } finally {
      setGeneratingEmbeddings(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleExportData = async () => {
    setMessage('Preparing full export... This may take a moment.')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Fetch all user data in parallel
      const [
        profileRes,
        memoriesRes,
        contactsRes,
        educationRes,
        postscriptsRes,
        postscriptAttachmentsRes,
        wisdomRes,
        circlesRes,
        circleMembershipsRes,
        petsRes,
        mediaItemsRes,
        albumsRes,
        smartAlbumsRes,
        interviewSessionsRes,
        videoResponsesRes,
        voiceClonesRes,
        voiceSamplesRes,
        ordersRes,
        notificationsRes,
        chatSessionsRes,
        chatMessagesRes,
        xpRes,
        xpTransactionsRes,
        streakRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('memories').select('*').eq('user_id', user.id),
        supabase.from('contacts').select('*').eq('user_id', user.id),
        supabase.from('education_history').select('*').eq('user_id', user.id),
        supabase.from('postscripts').select('*').eq('user_id', user.id),
        supabase.from('postscript_attachments').select('*').eq('user_id', user.id),
        supabase.from('knowledge_entries').select('*').eq('user_id', user.id),
        supabase.from('circles').select('*').eq('owner_id', user.id),
        supabase.from('circle_members').select('*').eq('user_id', user.id),
        supabase.from('pets').select('*').eq('user_id', user.id),
        supabase.from('media_items').select('*').eq('user_id', user.id),
        supabase.from('memory_albums').select('*').eq('user_id', user.id),
        supabase.from('smart_albums').select('*').eq('user_id', user.id),
        supabase.from('interview_sessions').select('*').eq('user_id', user.id),
        supabase.from('video_responses').select('*').eq('user_id', user.id),
        supabase.from('voice_clones').select('*').eq('user_id', user.id),
        supabase.from('voice_clone_samples').select('*').eq('user_id', user.id),
        supabase.from('marketplace_orders').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('chat_sessions').select('*').eq('user_id', user.id),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('user_xp').select('*').eq('user_id', user.id).single(),
        supabase.from('xp_transactions').select('*').eq('user_id', user.id),
        supabase.from('streak_log').select('*').eq('user_id', user.id),
      ])

      // Get memory IDs for related data
      const memoryIds = memoriesRes.data?.map(m => m.id) || []
      
      // Fetch memory-related data
      const [memoryMediaRes, memoryCommentsRes, memorySharesRes] = await Promise.all([
        memoryIds.length > 0 
          ? supabase.from('memory_media').select('*').in('memory_id', memoryIds)
          : { data: [] },
        memoryIds.length > 0 
          ? supabase.from('memory_comments').select('*').in('memory_id', memoryIds)
          : { data: [] },
        memoryIds.length > 0 
          ? supabase.from('memory_shares').select('*').in('memory_id', memoryIds)
          : { data: [] },
      ])

      // Get circle IDs for related data
      const circleIds = circlesRes.data?.map(c => c.id) || []
      
      // Fetch circle-related data
      const [circleContentRes, circleMessagesRes, circlePostscriptsRes] = await Promise.all([
        circleIds.length > 0
          ? supabase.from('circle_content').select('*').in('circle_id', circleIds)
          : { data: [] },
        circleIds.length > 0
          ? supabase.from('circle_messages').select('*').in('circle_id', circleIds)
          : { data: [] },
        circleIds.length > 0
          ? supabase.from('circle_postscripts').select('*').in('circle_id', circleIds)
          : { data: [] },
      ])

      const exportData = {
        _meta: {
          exported_at: new Date().toISOString(),
          version: '2.0',
          user_id: user.id,
          user_email: user.email,
        },
        profile: profileRes.data,
        education_history: educationRes.data || [],
        memories: memoriesRes.data || [],
        memory_media: memoryMediaRes.data || [],
        memory_comments: memoryCommentsRes.data || [],
        memory_shares: memorySharesRes.data || [],
        contacts: contactsRes.data || [],
        postscripts: postscriptsRes.data || [],
        postscript_attachments: postscriptAttachmentsRes.data || [],
        wisdom: wisdomRes.data || [],
        circles: circlesRes.data || [],
        circle_memberships: circleMembershipsRes.data || [],
        circle_content: circleContentRes.data || [],
        circle_messages: circleMessagesRes.data || [],
        circle_postscripts: circlePostscriptsRes.data || [],
        pets: petsRes.data || [],
        media_items: mediaItemsRes.data || [],
        albums: albumsRes.data || [],
        smart_albums: smartAlbumsRes.data || [],
        interview_sessions: interviewSessionsRes.data || [],
        video_responses: videoResponsesRes.data || [],
        voice_clones: voiceClonesRes.data || [],
        voice_clone_samples: voiceSamplesRes.data || [],
        orders: ordersRes.data || [],
        notifications: notificationsRes.data || [],
        chat_sessions: chatSessionsRes.data || [],
        chat_messages: chatMessagesRes.data || [],
        xp: xpRes.data || null,
        xp_transactions: xpTransactionsRes.data || [],
        streaks: streakRes.data || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yourstruly-full-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      const totalItems = Object.values(exportData).reduce((sum, val) => {
        if (Array.isArray(val)) return sum + val.length
        if (val && typeof val === 'object') return sum + 1
        return sum
      }, 0)

      setMessage(`Export complete! Downloaded ${totalItems} items.`)
    } catch (error) {
      console.error('Export error:', error)
      setMessage('Export failed. Please try again.')
    }
    
    setTimeout(() => setMessage(''), 5000)
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
      <div className="relative z-10 max-w-2xl">
        {/* Header */}
        <header className="page-header">
          <Link href="/dashboard" className="page-header-back">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="page-header-title">Settings</h1>
            <p className="page-header-subtitle">Manage your account and preferences</p>
          </div>
        </header>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('Failed') || message.includes('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-600' : 'bg-green-500/10 border border-green-500/20 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* Account Section */}
          <section className="glass-card-page p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#406A56]/10 flex items-center justify-center">
                <User size={20} className="text-[#406A56]" />
              </div>
              <h2 className="text-lg font-semibold text-[#2d2d2d]">Account</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="form-input bg-[#406A56]/5 cursor-not-allowed"
                />
                <p className="text-xs text-[#999] mt-1">Contact support to change email</p>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section className="glass-card-page p-6">
            <Link href="/dashboard/settings/subscription" className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D9C61A]/10 flex items-center justify-center">
                  <CreditCard size={20} className="text-[#8a7c08]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2d2d]">Subscription</h2>
                  <p className="text-sm text-[#666]">Manage your plan and billing</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#999] group-hover:text-[#406A56] transition-colors" />
            </Link>
          </section>

          {/* Notifications Section */}
          <section className="glass-card-page p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D9C61A]/10 flex items-center justify-center">
                <Bell size={20} className="text-[#8a7c08]" />
              </div>
              <h2 className="text-lg font-semibold text-[#2d2d2d]">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[#2d2d2d] font-medium">Email Notifications</p>
                  <p className="text-sm text-[#666]">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white border-[#406A56]/20 text-[#406A56] focus:ring-[#406A56]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[#2d2d2d] font-medium">Memory Reminders</p>
                  <p className="text-sm text-[#666]">&quot;On this day&quot; memories from past years</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.memory_reminders}
                  onChange={(e) => setSettings({ ...settings, memory_reminders: e.target.checked })}
                  className="w-5 h-5 rounded bg-white border-[#406A56]/20 text-[#406A56] focus:ring-[#406A56]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[#2d2d2d] font-medium">Share Notifications</p>
                  <p className="text-sm text-[#666]">When contacts interact with shared memories</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.share_notifications}
                  onChange={(e) => setSettings({ ...settings, share_notifications: e.target.checked })}
                  className="w-5 h-5 rounded bg-white border-[#406A56]/20 text-[#406A56] focus:ring-[#406A56]"
                />
              </label>
            </div>
          </section>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary w-full justify-center"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Data Section */}
          <section className="glass-card-page p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#8DACAB]/10 flex items-center justify-center">
                <Download size={20} className="text-[#5d8585]" />
              </div>
              <h2 className="text-lg font-semibold text-[#2d2d2d]">Your Data</h2>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#406A56]/5 hover:bg-[#406A56]/10 text-[#406A56] rounded-xl transition-colors font-medium"
              >
                <Download size={18} />
                Export All Data
              </button>
            </div>
          </section>

          {/* AI Features Section */}
          <section className="glass-card-page p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D9C61A]/10 flex items-center justify-center">
                <Sparkles size={20} className="text-[#8a7c08]" />
              </div>
              <h2 className="text-lg font-semibold text-[#2d2d2d]">AI Features</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-[#2d2d2d] font-medium mb-1">AI-Powered Search</p>
                <p className="text-sm text-[#666] mb-3">
                  Generate AI embeddings to enable semantic search across all your memories, contacts, and life data.
                </p>
                <button
                  onClick={handleGenerateEmbeddings}
                  disabled={generatingEmbeddings}
                  className="btn-accent"
                >
                  {generatingEmbeddings ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Index My Content for AI
                    </>
                  )}
                </button>
                {embeddingStats && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Indexed {embeddingStats.processed} items
                    {embeddingStats.errors > 0 && ` (${embeddingStats.errors} errors)`}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <div className="danger-zone">
            <h2 className="danger-zone-title">Danger Zone</h2>
            
            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#406A56]/5 hover:bg-[#406A56]/10 text-[#406A56] rounded-xl transition-colors font-medium"
              >
                <LogOut size={18} />
                Sign Out
              </button>

              <button
                onClick={handleDeleteAccount}
                className="btn-danger w-full justify-center"
              >
                <Trash2 size={18} />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
