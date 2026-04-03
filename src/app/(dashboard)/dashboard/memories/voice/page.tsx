'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Video, VideoOff } from 'lucide-react'
import Link from 'next/link'
import { VoiceVideoChat } from '@/components/voice'
import '@/styles/page-styles.css'

export default function VoiceMemoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic') || undefined
  const contactId = searchParams.get('contact') || undefined
  const [enableVideo, setEnableVideo] = useState(false)

  const handleMemorySaved = (memoryId: string, videoUrl?: string) => {
    console.log('Memory saved:', memoryId, videoUrl ? '(with video)' : '(audio only)')
    // Redirect to the new memory
    setTimeout(() => {
      router.push(`/dashboard/memories/${memoryId}`)
    }, 1500)
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
      <div className="relative z-10">
        {/* Header */}
        <div className="page-header flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/memories" className="page-header-back">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="page-header-title">Capture Memory</h1>
              <p className="page-header-subtitle">
                Share your story through {enableVideo ? 'video & voice' : 'voice'}
              </p>
            </div>
          </div>
          
          {/* Video toggle */}
          <button
            onClick={() => setEnableVideo(!enableVideo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              enableVideo
                ? 'bg-[#2D5A3D] text-white'
                : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
            }`}
          >
            {enableVideo ? <Video size={16} /> : <VideoOff size={16} />}
            {enableVideo ? 'Video On' : 'Video Off'}
          </button>
        </div>

        {/* Voice/Video Chat */}
        <div className="max-w-2xl mx-auto">
          <VoiceVideoChat
            sessionType="memory_capture"
            topic={topic}
            contactId={contactId}
            personaName="journalist"
            enableVideo={enableVideo}
            videoQuality="medium"
            maxQuestions={5}
            onMemorySaved={handleMemorySaved}
            onComplete={(result) => {
              console.log('Session complete:', result)
            }}
            showTranscript={true}
          />

          {/* Tips */}
          <div className="mt-8 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#2D5A3D]/10">
            <h3 className="text-sm font-semibold text-[#2D5A3D] mb-3 uppercase tracking-wide">
              Tips for a Great Memory
            </h3>
            <ul className="space-y-2 text-sm text-[#2D5A3D]/70">
              <li className="flex items-start gap-2">
                <span className="text-[#C4A235]">•</span>
                Speak naturally — the AI will ask follow-up questions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C4A235]">•</span>
                Include details like names, dates, and places
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C4A235]">•</span>
                Say "save it" when you're ready to save your memory
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C4A235]">•</span>
                After ~5 exchanges, the AI will offer to save or continue
              </li>
              {enableVideo && (
                <li className="flex items-start gap-2">
                  <span className="text-[#C4A235]">•</span>
                  Your video will be saved along with your story
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
