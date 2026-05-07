import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Medal } from 'lucide-react'

interface MedalAvatarProps {
  displayName: string
  rank: number
}

const MEDAL_STYLES = {
  1: {
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    border: 'border-yellow-500',
    shadow: 'shadow-lg shadow-yellow-500/50',
    icon: 'text-yellow-600',
  },
  2: {
    bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
    border: 'border-gray-400',
    shadow: 'shadow-lg shadow-gray-400/50',
    icon: 'text-gray-500',
  },
  3: {
    bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    border: 'border-orange-500',
    shadow: 'shadow-lg shadow-orange-500/50',
    icon: 'text-orange-600',
  },
}

export function MedalAvatar({ displayName, rank }: MedalAvatarProps) {
  const style = MEDAL_STYLES[rank as 1 | 2 | 3]
  const initial = displayName?.charAt(0)?.toUpperCase() || '?'

  if (!style) {
    return (
      <Avatar className="h-10 w-10">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className="relative">
      <Avatar className={cn('h-10 w-10 border-2', style.border, style.shadow)}>
        <AvatarFallback className={style.bg}>{initial}</AvatarFallback>
      </Avatar>
      <div className="absolute -top-1 -right-1">
        <Medal className={cn('h-4 w-4', style.icon)} fill="currentColor" />
      </div>
    </div>
  )
}
