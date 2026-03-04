'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronLeft, AlertTriangle, Trash2, Users, Mail, 
  Image, Heart, Calendar, Loader2, CreditCard, Building2,
  UserMinus, UserPlus, Download, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '@/styles/page-styles.css'

interface AccountStats {
  memories: number
  contacts: number
  postscripts: number
  postscriptCreditsValue: number
  mediaItems: number
  circles: number
  wisdom: number
  interviews: number
}

interface Postscript {
  id: string
  title: string
  recipient_name: string
  scheduled_date: string | null
  status: string
}

interface FamilyMember {
  id: string
  user_id: string
  email: string
  full_name: string
  role: string
}

interface SubscriptionInfo {
  isAdmin: boolean
  planName: string
  memberCount: number
  members: FamilyMember[]
}

type PostscriptAction = 'keep' | 'cancel'
type RefundMethod = 'original' | 'check' | 'other'

export default function DeleteAccountPage() {
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [postscripts, setPostscripts] = useState<Postscript[]>([])
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  
  // User choices
  const [postscriptAction, setPostscriptAction] = useState<PostscriptAction>('keep')
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original')
  const [refundDetails, setRefundDetails] = useState('')
  const [newAdminId, setNewAdminId] = useState<string>('')
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [hasExported, setHasExported] = useState(false)
  
  // Steps
  const [step, setStep] = useState(1)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadAccountData()
  }, [])

  const loadAccountData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load all stats in parallel
    const [
      memoriesRes,
      contactsRes,
      postscriptsRes,
      mediaRes,
      circlesRes,
      wisdomRes,
      interviewsRes,
      creditsRes,
      subscriptionRes,
      seatsRes,
    ] = await Promise.all([
      supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('postscripts').select('id, title, status, scheduled_date, recipients').eq('user_id', user.id),
      supabase.from('media_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('circles').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('knowledge_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('interview_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('postscript_credits').select('*').eq('user_id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
      supabase.from('subscription_seats').select('*, profiles(id, full_name, email)').eq('subscription_id', user.id),
    ])

    // Process postscripts (draft and scheduled are not yet sent)
    const pendingPostscripts = (postscriptsRes.data || [])
      .filter(p => p.status === 'draft' || p.status === 'scheduled')
      .map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        recipient_name: p.recipients?.[0]?.name || 'Unknown',
        scheduled_date: p.scheduled_date,
        status: p.status,
      }))

    setPostscripts(pendingPostscripts)

    // Calculate credits value (assuming $5 per credit for now)
    const creditsValue = (creditsRes.data?.balance || 0) * 5

    setStats({
      memories: memoriesRes.count || 0,
      contacts: contactsRes.count || 0,
      postscripts: pendingPostscripts.length,
      postscriptCreditsValue: creditsValue,
      mediaItems: mediaRes.count || 0,
      circles: circlesRes.count || 0,
      wisdom: wisdomRes.count || 0,
      interviews: interviewsRes.count || 0,
    })

    // Process subscription info
    if (subscriptionRes.data) {
      const members = (seatsRes.data || []).map((seat: any) => ({
        id: seat.id,
        user_id: seat.user_id,
        email: seat.profiles?.email || seat.invited_email,
        full_name: seat.profiles?.full_name || 'Pending',
        role: seat.role || 'member',
      }))

      setSubscription({
        isAdmin: true, // If they have a subscription record, they're the admin
        planName: subscriptionRes.data.plan_name || 'Premium',
        memberCount: members.length,
        members: members.filter((m: FamilyMember) => m.user_id !== user.id),
      })
    }

    setLoading(false)
  }

  const handleExportFirst = () => {
    // Redirect to settings with export flag
    router.push('/dashboard/settings?action=export')
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return

    setDeleting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Create deletion request record
      const { error: requestError } = await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        postscript_action: postscriptAction,
        refund_method: postscriptAction === 'cancel' ? refundMethod : null,
        refund_details: postscriptAction === 'cancel' ? refundDetails : null,
        new_admin_id: subscription?.isAdmin ? newAdminId : null,
        notify_members: subscription?.isAdmin ? notifyMembers : null,
        status: 'pending',
      })

      if (requestError) {
        console.error('Failed to create deletion request:', requestError)
        alert('Failed to process deletion request. Please try again.')
        setDeleting(false)
        return
      }

      // If keeping postscripts, mark them as orphaned but keep scheduled
      if (postscriptAction === 'keep' && postscripts.length > 0) {
        await supabase
          .from('postscripts')
          .update({ orphaned: true, orphaned_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['draft', 'scheduled'])
      }

      // If admin and transferring, update subscription ownership
      if (subscription?.isAdmin && newAdminId) {
        await supabase
          .from('subscriptions')
          .update({ user_id: newAdminId, transferred_at: new Date().toISOString() })
          .eq('user_id', user.id)
      }

      // Notify family members if requested
      if (subscription?.isAdmin && notifyMembers) {
        // This would trigger email notifications via edge function
        await supabase.functions.invoke('notify-family-deletion', {
          body: { 
            adminId: user.id, 
            newAdminId,
            members: subscription.members 
          }
        })
      }

      // Soft delete the account (mark as deleted, don't actually remove yet)
      await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString(),
          deletion_reason: 'user_requested',
        })
        .eq('id', user.id)

      // Sign out
      await supabase.auth.signOut()

      // Redirect to goodbye page
      router.push('/account-deleted')

    } catch (error) {
      console.error('Deletion error:', error)
      alert('Something went wrong. Please contact support.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" style={{ background: 'rgba(220, 38, 38, 0.1)' }} />
        <div className="page-blob page-blob-2" style={{ background: 'rgba(220, 38, 38, 0.05)' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <header className="page-header">
          <Link href="/dashboard/settings" className="page-header-back">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="page-header-title text-red-600">Delete Account</h1>
            <p className="page-header-subtitle">This action cannot be undone</p>
          </div>
        </header>

        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">You&apos;re about to delete your YoursTruly account</p>
            <p className="text-sm text-red-600 mt-1">
              Please review what will happen and make your choices below.
            </p>
          </div>
        </div>

        {/* Step 1: Account Summary */}
        {step >= 1 && (
          <section className="glass-card-page p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">1</span>
              Your Account Summary
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <Image size={20} className="text-[#406A56]" />
                <div>
                  <p className="text-sm text-gray-500">Memories</p>
                  <p className="font-semibold">{stats?.memories || 0}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <Heart size={20} className="text-[#C35F33]" />
                <div>
                  <p className="text-sm text-gray-500">Contacts</p>
                  <p className="font-semibold">{stats?.contacts || 0}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <Mail size={20} className="text-[#4A3552]" />
                <div>
                  <p className="text-sm text-gray-500">Postscripts</p>
                  <p className="font-semibold">{stats?.postscripts || 0}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <Users size={20} className="text-[#8DACAB]" />
                <div>
                  <p className="text-sm text-gray-500">Circles</p>
                  <p className="font-semibold">{stats?.circles || 0}</p>
                </div>
              </div>
            </div>

            {/* Export reminder */}
            {!hasExported && (
              <div className="bg-[#406A56]/5 border border-[#406A56]/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-[#406A56] mb-3">
                  <strong>Recommended:</strong> Download a backup of your data before deleting.
                </p>
                <button
                  onClick={() => {
                    handleExportFirst()
                    setHasExported(true)
                  }}
                  className="btn-secondary text-sm"
                >
                  <Download size={16} />
                  Export My Data First
                </button>
              </div>
            )}

            {hasExported && (
              <div className="flex items-center gap-2 text-green-600 text-sm mb-4">
                <CheckCircle2 size={16} />
                Data export initiated
              </div>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Continue
              </button>
            )}
          </section>
        )}

        {/* Step 2: Postscripts */}
        {step >= 2 && stats && stats.postscripts > 0 && (
          <section className="glass-card-page p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">2</span>
              Your Scheduled Postscripts
            </h2>

            <p className="text-gray-600 mb-4">
              You have <strong>{stats.postscripts} scheduled postscript{stats.postscripts > 1 ? 's' : ''}</strong> that 
              {stats.postscripts > 1 ? ' are ' : ' is '} 
              waiting to be delivered to your loved ones.
            </p>

            {/* Postscript list */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {postscripts.map(ps => (
                <div key={ps.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{ps.title}</p>
                    <p className="text-xs text-gray-500">To: {ps.recipient_name}</p>
                  </div>
                  <span className="text-xs bg-[#4A3552]/10 text-[#4A3552] px-2 py-1 rounded-full">
                    {ps.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-[#406A56]/30"
                style={{ borderColor: postscriptAction === 'keep' ? '#406A56' : '#e5e7eb' }}
                onClick={() => setPostscriptAction('keep')}
              >
                <input
                  type="radio"
                  name="postscriptAction"
                  checked={postscriptAction === 'keep'}
                  onChange={() => setPostscriptAction('keep')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-[#2d2d2d]">Keep them scheduled</p>
                  <p className="text-sm text-gray-500">
                    Your messages will still be delivered to recipients when the time comes.
                    Your account data will be deleted, but postscripts will remain.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-red-300"
                style={{ borderColor: postscriptAction === 'cancel' ? '#dc2626' : '#e5e7eb' }}
                onClick={() => setPostscriptAction('cancel')}
              >
                <input
                  type="radio"
                  name="postscriptAction"
                  checked={postscriptAction === 'cancel'}
                  onChange={() => setPostscriptAction('cancel')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-[#2d2d2d]">Cancel everything</p>
                  <p className="text-sm text-gray-500">
                    All postscripts will be permanently deleted. No messages will be sent.
                  </p>
                </div>
              </label>
            </div>

            {/* Refund section if cancelling */}
            {postscriptAction === 'cancel' && stats.postscriptCreditsValue > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <CreditCard size={18} />
                  Refund for Cancelled Postscripts
                </p>
                <p className="text-sm text-yellow-700 mb-3">
                  You may be eligible for a refund of approximately <strong>${stats.postscriptCreditsValue}</strong>.
                  How would you like to receive it?
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="refundMethod"
                      checked={refundMethod === 'original'}
                      onChange={() => setRefundMethod('original')}
                    />
                    <span>Refund to original payment method</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="refundMethod"
                      checked={refundMethod === 'check'}
                      onChange={() => setRefundMethod('check')}
                    />
                    <span>Mail a check</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="refundMethod"
                      checked={refundMethod === 'other'}
                      onChange={() => setRefundMethod('other')}
                    />
                    <span>Other (specify below)</span>
                  </label>
                </div>

                {(refundMethod === 'check' || refundMethod === 'other') && (
                  <textarea
                    value={refundDetails}
                    onChange={(e) => setRefundDetails(e.target.value)}
                    placeholder={refundMethod === 'check' ? 'Enter mailing address for check...' : 'Describe your preferred refund method...'}
                    className="mt-3 w-full p-3 rounded-lg border border-yellow-300 text-sm"
                    rows={3}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(subscription?.isAdmin ? 3 : 4)}
                className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Continue
              </button>
            )}
          </section>
        )}

        {/* Step 2 alt: No postscripts */}
        {step >= 2 && stats && stats.postscripts === 0 && step === 2 && (
          <section className="glass-card-page p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">✓</span>
              No Scheduled Postscripts
            </h2>
            <p className="text-gray-600 mb-4">
              You don&apos;t have any pending postscripts, so there&apos;s nothing to worry about there.
            </p>
            <button
              onClick={() => setStep(subscription?.isAdmin ? 3 : 4)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Continue
            </button>
          </section>
        )}

        {/* Step 3: Family Plan (if admin) */}
        {step >= 3 && subscription?.isAdmin && (
          <section className="glass-card-page p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#2d2d2d] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">3</span>
              Your Family Plan
            </h2>

            <div className="bg-[#406A56]/5 border border-[#406A56]/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-[#406A56] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#406A56]">You&apos;re the admin of a {subscription.planName} plan</p>
                <p className="text-sm text-[#406A56]/80">
                  {subscription.memberCount} other member{subscription.memberCount !== 1 ? 's' : ''} will be affected
                </p>
              </div>
            </div>

            {subscription.members.length > 0 && (
              <>
                <p className="text-gray-600 mb-3">
                  These members are on your plan:
                </p>
                <div className="space-y-2 mb-4">
                  {subscription.members.map(member => (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="font-medium text-[#2d2d2d] mb-3">What should happen to your family members?</p>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-[#406A56]/30"
                    style={{ borderColor: newAdminId ? '#406A56' : '#e5e7eb' }}
                  >
                    <UserPlus size={20} className="text-[#406A56] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-[#2d2d2d]">Transfer plan to another member</p>
                      <p className="text-sm text-gray-500 mb-2">
                        They will become the new admin and billing will continue.
                      </p>
                      <select
                        value={newAdminId}
                        onChange={(e) => setNewAdminId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="">Select new admin...</option>
                        {subscription.members.map(member => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.full_name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-red-300"
                    style={{ borderColor: !newAdminId ? '#dc2626' : '#e5e7eb' }}
                    onClick={() => setNewAdminId('')}
                  >
                    <UserMinus size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#2d2d2d]">Cancel the entire plan</p>
                      <p className="text-sm text-gray-500">
                        All members will lose access. They&apos;ll be notified and can export their data.
                      </p>
                    </div>
                  </label>
                </div>

                <label className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={notifyMembers}
                    onChange={(e) => setNotifyMembers(e.target.checked)}
                    className="rounded"
                  />
                  Notify members by email about this change
                </label>
              </>
            )}

            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Continue
              </button>
            )}
          </section>
        )}

        {/* Step 4: Final Confirmation */}
        {step >= 4 && (
          <section className="glass-card-page p-6 mb-6 border-2 border-red-200">
            <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">!</span>
              Final Confirmation
            </h2>

            <div className="bg-red-50 rounded-xl p-4 mb-4">
              <p className="text-red-800 font-medium mb-2">This will permanently:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Delete all your memories, contacts, and personal data</li>
                <li>Remove your profile and account access</li>
                {postscriptAction === 'cancel' && <li>Cancel all scheduled postscripts</li>}
                {subscription?.isAdmin && !newAdminId && <li>Cancel your family plan for all members</li>}
              </ul>
              {postscriptAction === 'keep' && stats && stats.postscripts > 0 && (
                <p className="text-green-700 mt-2 text-sm">
                  ✓ Your {stats.postscripts} postscript{stats.postscripts > 1 ? 's' : ''} will remain scheduled for delivery.
                </p>
              )}
              {subscription?.isAdmin && newAdminId && (
                <p className="text-green-700 mt-2 text-sm">
                  ✓ Plan will be transferred to the selected member.
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="w-full p-3 rounded-xl border border-gray-200 text-center text-lg font-mono tracking-widest"
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting Account...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete My Account
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Changed your mind?{' '}
              <Link href="/dashboard/settings" className="text-[#406A56] hover:underline">
                Go back to settings
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
