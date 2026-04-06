'use client'

interface Member {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface MemberAvatarStackProps {
  members: Member[]
  totalCount: number
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm'
}

const overlapClasses = {
  sm: '-ml-2',
  md: '-ml-2.5',
  lg: '-ml-3'
}

export default function MemberAvatarStack({ 
  members, 
  totalCount, 
  maxDisplay = 4,
  size = 'sm' 
}: MemberAvatarStackProps) {
  const displayMembers = members.slice(0, maxDisplay)
  const overflow = totalCount - displayMembers.length

  if (totalCount === 0) {
    return null
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Generate a consistent color based on the name
  const getAvatarColor = (name: string | null) => {
    const colors = [
      'from-[#2D5A3D] to-[#5a8a70]',
      'from-[#C4A235] to-[#e8d84a]',
      'from-[#B8562E] to-[#d87a55]',
      'from-[#2D5A3D] to-[#3a7a52]',
      'from-[#8DACAB] to-[#a8c4c3]',
    ]
    const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <div className="flex items-center">
      {displayMembers.map((member, index) => (
        <div
          key={member.id}
          className={`
            ${sizeClasses[size]} 
            ${index > 0 ? overlapClasses[size] : ''} 
            rounded-full border-2 border-white shadow-sm
            flex items-center justify-center overflow-hidden
            relative z-[${10 - index}]
          `}
          style={{ zIndex: 10 - index }}
          title={member.full_name || 'Member'}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.full_name || 'Member'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(member.full_name)} flex items-center justify-center text-white font-medium`}>
              {getInitials(member.full_name)}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`
            ${sizeClasses[size]} 
            ${overlapClasses[size]}
            rounded-full border-2 border-white shadow-sm
            bg-[#f0f0f0] flex items-center justify-center
            text-[#5A6660] font-medium
          `}
          style={{ zIndex: 0 }}
          title={`+${overflow} more member${overflow > 1 ? 's' : ''}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
