'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  LogIn, 
  UserPlus,
  Gift
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface InviteData {
  id: string
  email: string
  status: string
  inviter: {
    full_name: string | null
    email: string
  }
}

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const checkUserAndInvite = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        // Validate invite token
        const response = await fetch(`/api/subscription/invite/validate?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite')
          return
        }

        setInvite(data.invite)

        // If already accepted, show success
        if (data.invite.status === 'active') {
          setIsAccepted(true)
        }
      } catch (err) {
        setError('Failed to validate invite')
      } finally {
        setIsLoading(false)
      }
    }

    checkUserAndInvite()
  }, [token])

  const handleAcceptInvite = async () => {
    if (!currentUser) return

    setIsAccepting(true)
    try {
      const response = await fetch('/api/subscription/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite')
      }

      setIsAccepted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#2D5A3D] mx-auto mb-4" />
          <p className="text-gray-600">Validating invite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#2d2d2d] mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#2d2d2d] mb-2">Welcome. You&apos;ve joined the circle.</h1>
          <p className="text-gray-600 mb-6">
            You now have access to all Premium features through {invite?.inviter?.full_name || invite?.inviter?.email}&apos;s subscription.
          </p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2D5A3D] to-[#4A3552] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;ve been invited</h1>
            <p className="text-white/80">
              Join {invite?.inviter?.full_name || invite?.inviter?.email}&apos;s YoursTruly family
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Benefits */}
            <div className="mb-6">
              <h2 className="font-semibold text-[#2d2d2d] mb-3">You&apos;ll get access to:</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                  AI Chat with family digital essences
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                  Create and share video memories
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                  Send interview questions to loved ones
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                  20% off all marketplace items
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                  100GB cloud storage
                </li>
              </ul>
            </div>

            {/* Invite email notice */}
            <div className="bg-[#F5F3EE] rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                This invite was sent to <strong>{invite?.email}</strong>
              </p>
            </div>

            {/* Action Buttons */}
            {currentUser ? (
              <div className="space-y-4">
                {currentUser.email?.toLowerCase() === invite?.email?.toLowerCase() ? (
                  <Button 
                    className="w-full" 
                    onClick={handleAcceptInvite}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-amber-600 text-sm mb-4">
                      You&apos;re signed in as {currentUser.email}, but this invite is for {invite?.email}.
                    </p>
                    <Link href={`/login?redirect=/invite/${token}`}>
                      <Button variant="outline" className="w-full">
                        Sign in with different account
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Link href={`/signup?email=${encodeURIComponent(invite?.email || '')}&redirect=/invite/${token}`}>
                  <Button className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                </Link>
                <Link href={`/login?redirect=/invite/${token}`}>
                  <Button variant="outline" className="w-full">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by <Link href="/" className="text-[#2D5A3D] hover:underline">YoursTruly</Link> - Preserving family stories for generations
        </p>
      </div>
    </div>
  )
}
