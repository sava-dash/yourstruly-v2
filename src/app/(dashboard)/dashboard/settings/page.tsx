'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, User, Bell, Download, Upload, Trash2, LogOut, Sparkles, Loader2, CreditCard, ChevronRight, AlertTriangle } from 'lucide-react'
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
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importPreview, setImportPreview] = useState<{ data: any; counts: Record<string, number>; isZip?: boolean } | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleDeleteAccount = () => {
    router.push('/dashboard/settings/delete-account')
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
        supabase.from('circles').select('*').eq('created_by', user.id),
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

  const handleFullExport = async () => {
    setExporting(true)
    setMessage('Preparing full backup with media... This may take several minutes.')

    try {
      const response = await fetch('/api/export/full', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Download the ZIP file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yourstruly-full-backup-${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)

      setMessage('Full backup downloaded!')
    } catch (error) {
      console.error('Full export error:', error)
      setMessage('Export failed. Please try again.')
    } finally {
      setExporting(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isZip = file.name.endsWith('.zip') || file.type === 'application/zip'

    try {
      let data: any

      if (isZip) {
        // For ZIP files, we need to extract and read data.json
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(file)
        const dataFile = zip.file('data.json')
        
        if (!dataFile) {
          setMessage('Invalid backup ZIP. Missing data.json file.')
          return
        }

        const text = await dataFile.async('text')
        data = JSON.parse(text)
        data._zipFile = file // Store reference for import
      } else {
        const text = await file.text()
        data = JSON.parse(text)
      }

      // Validate it's a YoursTruly export
      if (!data._meta?.version && !data.profile) {
        setMessage('Invalid backup file. Please select a YoursTruly export file.')
        return
      }

      // Count items for preview
      const counts: Record<string, number> = {}
      const countableKeys = [
        'memories', 'contacts', 'postscripts', 'wisdom', 'circles', 
        'pets', 'media_items', 'albums', 'interview_sessions', 
        'video_responses', 'voice_clones', 'education_history',
        'chat_sessions', 'xp_transactions'
      ]
      
      for (const key of countableKeys) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          counts[key] = data[key].length
        }
      }

      // Add media file count for ZIP
      if (data._meta?.total_media_files) {
        counts['media_files'] = data._meta.total_media_files
      }

      setImportPreview({ data, counts, isZip })
      setShowImportModal(true)
    } catch (error) {
      console.error('Parse error:', error)
      setMessage('Failed to read backup file. Make sure it\'s a valid JSON or ZIP file.')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview?.data) return

    setImporting(true)
    
    const backup = importPreview.data
    const isZipImport = importPreview.isZip && backup._zipFile

    if (isZipImport) {
      // Use server-side import for ZIP files with media
      setMessage('Importing your data and uploading media... This may take several minutes.')

      try {
        const formData = new FormData()
        formData.append('file', backup._zipFile)

        const response = await fetch('/api/import/full', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Import failed')
        }

        setMessage(
          `Import complete! Restored ${result.imported} items, uploaded ${result.uploadedFiles} files.` +
          (result.errors > 0 ? ` (${result.errors} items skipped)` : '') +
          (result.uploadErrors > 0 ? ` (${result.uploadErrors} files failed)` : '')
        )
      } catch (error) {
        console.error('Import error:', error)
        setMessage('Import failed. Some data may have been partially restored.')
      } finally {
        setImporting(false)
        setShowImportModal(false)
        setImportPreview(null)
        setTimeout(() => setMessage(''), 10000)
      }
      return
    }

    // JSON-only import (client-side)
    setMessage('Importing your data... This may take a moment.')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('Not authenticated. Please log in again.')
      setImporting(false)
      return
    }

    let imported = 0
    let errors = 0

    try {
      // Helper to import array data with user_id override
      const importTable = async (table: string, items: any[], userIdField = 'user_id') => {
        if (!items || items.length === 0) return

        for (const item of items) {
          // Remove id to let DB generate new ones, override user_id
          const { id, ...rest } = item
          const newItem = { ...rest, [userIdField]: user.id }
          
          const { error } = await supabase.from(table).insert(newItem)
          if (error) {
            console.error(`Error importing to ${table}:`, error)
            errors++
          } else {
            imported++
          }
        }
      }

      // Import profile data (merge with existing)
      if (backup.profile) {
        const { id, email, created_at, updated_at, ...profileData } = backup.profile
        await supabase.from('profiles').update(profileData).eq('id', user.id)
        imported++
      }

      // Import education history
      await importTable('education_history', backup.education_history)

      // Import contacts
      await importTable('contacts', backup.contacts)

      // Import memories
      await importTable('memories', backup.memories)

      // Import pets
      await importTable('pets', backup.pets)

      // Import wisdom/knowledge entries
      await importTable('knowledge_entries', backup.wisdom)

      // Import postscripts
      await importTable('postscripts', backup.postscripts)

      // Import circles (owner_id instead of user_id)
      await importTable('circles', backup.circles, 'owner_id')

      // Import media items
      await importTable('media_items', backup.media_items)

      // Import albums
      await importTable('memory_albums', backup.albums)

      // Import smart albums
      await importTable('smart_albums', backup.smart_albums)

      // Import interview sessions
      await importTable('interview_sessions', backup.interview_sessions)

      // Import video responses
      await importTable('video_responses', backup.video_responses)

      // Import voice clones
      await importTable('voice_clones', backup.voice_clones)

      // Import chat sessions
      await importTable('chat_sessions', backup.chat_sessions)

      setMessage(`Import complete! Restored ${imported} items.${errors > 0 ? ` (${errors} items skipped due to conflicts)` : ''}`)
    } catch (error) {
      console.error('Import error:', error)
      setMessage('Import failed. Some data may have been partially restored.')
    } finally {
      setImporting(false)
      setShowImportModal(false)
      setImportPreview(null)
      setTimeout(() => setMessage(''), 8000)
    }
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
                Export Data (JSON)
              </button>
              
              <button
                onClick={handleFullExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#406A56] hover:bg-[#355a48] text-white rounded-xl transition-colors font-medium"
              >
                {exporting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Full Backup (with Media)
                  </>
                )}
              </button>
              <p className="text-xs text-[#999] text-center">
                Includes all photos, videos, and files in a ZIP archive
              </p>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#8DACAB]/5 hover:bg-[#8DACAB]/10 text-[#5d8585] rounded-xl transition-colors font-medium"
                >
                  <Upload size={18} />
                  Import Backup
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-[#999] text-center mt-2">
                  Restore from JSON or ZIP backup file
                </p>
              </div>
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

      {/* Import Confirmation Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D9C61A]/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-[#8a7c08]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2d2d2d]">Confirm Import</h3>
            </div>

            <p className="text-[#666] mb-4">
              This will restore data from your backup file. Existing data will not be deleted, but duplicates may be created.
              {importPreview.isZip && (
                <span className="block mt-2 text-[#406A56] font-medium">
                  📦 Full backup with media files detected
                </span>
              )}
            </p>

            {importPreview.data._meta && (
              <div className="bg-[#406A56]/5 rounded-xl p-3 mb-4 text-sm">
                <p className="text-[#666]">
                  <span className="font-medium">Exported:</span>{' '}
                  {new Date(importPreview.data._meta.exported_at).toLocaleDateString()}
                </p>
                {importPreview.data._meta.user_email && (
                  <p className="text-[#666]">
                    <span className="font-medium">From:</span>{' '}
                    {importPreview.data._meta.user_email}
                  </p>
                )}
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm font-medium text-[#2d2d2d] mb-2">Items to restore:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(importPreview.counts).map(([key, count]) => (
                  <div key={key} className="flex justify-between bg-[#f5f5f5] rounded-lg px-3 py-1.5">
                    <span className="text-[#666] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-[#2d2d2d]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportPreview(null)
                }}
                disabled={importing}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#666] rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing}
                className="flex-1 py-2.5 px-4 bg-[#406A56] hover:bg-[#355a48] text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
