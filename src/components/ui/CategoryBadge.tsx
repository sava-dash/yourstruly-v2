'use client'

import { 
  Camera, Plane, Cake, Users, Heart, Palmtree, 
  Dog, Baby, Sparkles, Music, Utensils, Home,
  GraduationCap, Briefcase, PartyPopper
} from 'lucide-react'

interface CategoryBadgeProps {
  category: string
  count: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'overlay' | 'standalone'
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  travel: { icon: Plane, color: 'text-sky-600', bg: 'bg-sky-500/20' },
  family: { icon: Users, color: 'text-amber-600', bg: 'bg-amber-500/20' },
  celebration: { icon: PartyPopper, color: 'text-pink-600', bg: 'bg-pink-500/20' },
  birthday: { icon: Cake, color: 'text-purple-600', bg: 'bg-purple-500/20' },
  wedding: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/20' },
  vacation: { icon: Palmtree, color: 'text-emerald-600', bg: 'bg-emerald-500/20' },
  pets: { icon: Dog, color: 'text-orange-600', bg: 'bg-orange-500/20' },
  kids: { icon: Baby, color: 'text-blue-600', bg: 'bg-blue-500/20' },
  food: { icon: Utensils, color: 'text-red-600', bg: 'bg-red-500/20' },
  music: { icon: Music, color: 'text-violet-600', bg: 'bg-violet-500/20' },
  home: { icon: Home, color: 'text-teal-600', bg: 'bg-teal-500/20' },
  graduation: { icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-500/20' },
  work: { icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-500/20' },
  photos: { icon: Camera, color: 'text-[#2D5A3D]', bg: 'bg-[#2D5A3D]/20' },
  default: { icon: Sparkles, color: 'text-[#2D5A3D]', bg: 'bg-[#2D5A3D]/20' },
}

export default function CategoryBadge({ 
  category, 
  count, 
  size = 'md',
  variant = 'overlay'
}: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category.toLowerCase()] || CATEGORY_CONFIG.default
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 10,
    md: 14,
    lg: 16,
  }

  if (variant === 'overlay') {
    return (
      <div className={`
        inline-flex items-center rounded-full
        bg-black/50 backdrop-blur-sm text-white
        ${sizeClasses[size]}
      `}>
        <Icon size={iconSizes[size]} />
        <span className="capitalize">{category}</span>
        <span className="opacity-70">({count})</span>
      </div>
    )
  }

  return (
    <div className={`
      inline-flex items-center rounded-full
      ${config.bg} ${config.color}
      ${sizeClasses[size]}
    `}>
      <Icon size={iconSizes[size]} />
      <span className="capitalize font-medium">{category}</span>
      <span className="opacity-70">({count})</span>
    </div>
  )
}

// Grid of category badges for album covers
export function CategoryGrid({ 
  categories 
}: { 
  categories: Array<{ name: string; count: number; coverUrl?: string }> 
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {categories.map((cat) => (
        <div
          key={cat.name}
          className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
        >
          {/* Background image or gradient */}
          {cat.coverUrl ? (
            <img 
              src={cat.coverUrl} 
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30" />
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badge */}
          <div className="absolute bottom-3 left-3">
            <CategoryBadge category={cat.name} count={cat.count} size="md" variant="overlay" />
          </div>
        </div>
      ))}
    </div>
  )
}
