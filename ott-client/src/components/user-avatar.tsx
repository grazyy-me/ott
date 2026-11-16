import type { User } from '@/types/api'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserAvatar({
  user,
  className,
  fallbackClassName,
}: {
  user: Pick<User, 'name' | 'avatar'> | null
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={className}>
      {user?.avatar?.url ? <AvatarImage src={user.avatar.url} alt='' /> : null}
      <AvatarFallback className={fallbackClassName}>
        {getInitials(user?.name)}
      </AvatarFallback>
    </Avatar>
  )
}
