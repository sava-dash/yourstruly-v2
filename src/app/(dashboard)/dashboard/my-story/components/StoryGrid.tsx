'use client'

import StoryCard, { type StoryItem } from './StoryCard'

interface StoryGridProps {
  items: StoryItem[]
  onSelect?: (item: StoryItem) => void
}

export default function StoryGrid({ items, onSelect }: StoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[#94A09A] text-sm">No items match your search.</p>
      </div>
    )
  }

  // If all items are photos, use a tighter grid
  const allPhotos = items.every((item) => item.type === 'photo')

  if (allPhotos) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((item) => (
          <StoryCard key={`${item.type}-${item.id}`} item={item} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <StoryCard key={`${item.type}-${item.id}`} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}
