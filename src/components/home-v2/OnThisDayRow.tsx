'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ImageIcon } from 'lucide-react'

interface OnThisDayMemory {
  id: string
  title: string
  memory_date: string
  years_ago: number
  memory_media?: { file_url: string; file_type: string; is_cover: boolean }[]
}

export default function OnThisDayRow() {
  const [memories, setMemories] = useState<OnThisDayMemory[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/memories/on-this-day')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMemories(d.memories || []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded || memories.length === 0) return null

  return (
    <section className="px-6 pb-4">
      <div className="rounded-2xl p-4" style={{ background: '#FAFAF7' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-[#2D5A3D]" />
          <h2 className="text-[#1A1F1C] font-semibold text-base">On This Day</h2>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {memories.map(m => {
            const cover = m.memory_media?.find(p => p.is_cover) || m.memory_media?.[0]
            const imgUrl = cover?.file_type?.startsWith('image') ? cover.file_url : null

            return (
              <Link
                key={m.id}
                href={`/dashboard/memories/${m.id}`}
                className="flex-shrink-0 w-[160px] bg-white rounded-xl shadow-sm border border-[#DDE3DF] overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-[100px] w-full rounded-t-lg overflow-hidden bg-gradient-to-br from-[#C4A235]/15 to-[#2D5A3D]/15 flex items-center justify-center">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={m.title || ''}
                      width={160}
                      height={100}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon size={24} className="text-[#2D5A3D]/30" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[#2D5A3D] text-sm font-medium mb-1">
                    {m.years_ago === 1 ? '1 year ago' : `${m.years_ago} years ago`}
                  </p>
                  <p className="text-[#1A1F1C] text-sm font-medium line-clamp-2 leading-snug">
                    {m.title || 'Untitled memory'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
