import Link from 'next/link'
import { Heart } from 'lucide-react'

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-[#2D5A3D]" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Your account has been deleted
        </h1>
        
        <p className="text-gray-600 mb-6">
          We&apos;re sorry to see you go. If you had any scheduled postscripts set to be kept, 
          they will still be delivered to your loved ones when the time comes.
        </p>

        <p className="text-gray-600 mb-8">
          If you ever want to return, you&apos;re always welcome to create a new account 
          and start documenting your legacy again.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 bg-[#2D5A3D] hover:bg-[#355a48] text-white rounded-xl font-medium transition-colors"
          >
            Return to Homepage
          </Link>
          
          <p className="text-sm text-gray-500">
            Questions? Contact{' '}
            <a href="mailto:support@yourstruly.love" className="text-[#2D5A3D] hover:underline">
              support@yourstruly.love
            </a>
          </p>
        </div>

        <p className="mt-12 text-xs text-gray-400">
          Thank you for being part of the YoursTruly community.
        </p>
      </div>
    </div>
  )
}
