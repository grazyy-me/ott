import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { Check, ChevronDown, Lock, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntitlement } from '@/features/billing/billing-api'
import { useWatchlistToggle } from '@/features/catalog/watchlist-api'
import { useTitleLink } from './use-title-link'

const ring =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/**
 * Play: goes to the player (/watch/:slug). Free titles play for anyone. On a Premium title without a
 * subscription it reads "Subscribe to watch" with a lock, and the player opens the paywall with checkout.
 */
export function PlayButton({
  title,
  compact = false,
  onNavigate,
  className,
}: {
  title: Pick<TitleCard, 'slug' | 'title' | 'isFree'>
  compact?: boolean
  onNavigate?: () => void
  className?: string
}) {
  const { entitled, loading } = useEntitlement()
  const locked = !title.isFree && !entitled && !loading
  const Icon = locked ? Lock : Play
  const label = locked ? 'Subscribe to watch' : 'Play'
  return (
    <Link
      to={`/watch/${title.slug}`}
      onClick={onNavigate}
      aria-label={compact ? `${label} ${title.title}` : undefined}
      title={compact ? label : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]',
        compact ? 'size-10' : 'h-12 px-7 text-base',
        ring,
        className
      )}
    >
      <Icon
        className={cn(compact ? 'size-4' : 'size-5', !locked && 'fill-current')}
      />
      {!compact && label}
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
