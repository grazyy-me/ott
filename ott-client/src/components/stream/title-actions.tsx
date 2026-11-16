import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { Check, ChevronDown, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWatchlistToggle } from '@/features/catalog/watchlist-api'
import { useTitleLink } from './use-title-link'

const ring =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/**
 * Play: goes to the player (/watch/:slug). Playing needs an account, so signed out the protected route
 * sends you to sign-in first and back here afterwards.
 */
export function PlayButton({
  title,
  compact = false,
  onNavigate,
  className,
}: {
  title: Pick<TitleCard, 'slug' | 'title'>
  compact?: boolean
  onNavigate?: () => void
  className?: string
}) {
  return (
    <Link
      to={`/watch/${title.slug}`}
      onClick={onNavigate}
      aria-label={compact ? `Play ${title.title}` : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]',
        compact ? 'size-10' : 'h-12 px-7 text-base',
        ring,
        className
      )}
    >
      <Play
        className={compact ? 'size-4 fill-current' : 'size-5 fill-current'}
      />
      {!compact && 'Play'}
    </Link>
  )
}

/** Add to / remove from My List; the label and icon follow the saved state */
export function MyListButton({
  title,
  compact = false,
  className,
}: {
  title: Pick<TitleCard, 'id' | 'title'>
  compact?: boolean
  className?: string
}) {
  const { inList, toggle, busy } = useWatchlistToggle(title.id, title.title)
  const label = inList ? 'Remove from My List' : 'Add to My List'
  const Icon = inList ? Check : Plus
  return (
    <button
      type='button'
      onClick={toggle}
      disabled={busy}
      aria-pressed={inList}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full glass font-semibold transition-colors hover:bg-accent disabled:opacity-60',
        compact ? 'size-10' : 'h-12 px-6 text-base',
        ring,
        className
      )}
    >
      <Icon className='size-5' />
      {!compact && (inList ? 'In My List' : 'My List')}
    </button>
  )
}

/** Opens the title's details (modal over the page), morphing from the card or preview it sits in */
export function MoreInfoButton({
  title,
  compact = false,
  onNavigate,
  className,
}: {
  title: TitleCard
  compact?: boolean
  onNavigate?: () => void
  className?: string
}) {
  const link = useTitleLink(title)
  return (
    <Link
      to={link.to}
      state={link.state}
      viewTransition={link.viewTransition}
      // the page behind the modal stays where it was
      preventScrollReset
      onClick={(e) => {
        link.markMorphSource(
          e.currentTarget.closest<HTMLElement>('[data-morph-root]')
        )
        onNavigate?.()
      }}
      aria-label={compact ? `More info about ${title.title}` : undefined}
      title={compact ? 'More info' : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full glass font-semibold transition-colors hover:bg-accent',
        compact ? 'size-10' : 'h-12 px-6 text-base',
        ring,
        className
      )}
    >
      <ChevronDown className='size-5' />
      {!compact && 'More info'}
    </Link>
  )
}
