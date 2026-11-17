import { Link } from 'react-router'
import type { RailItem } from '@/types/catalog'
import { Play, X } from 'lucide-react'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { useRemoveFromContinueWatching } from '@/features/watch/playback-api'

const timeLeft = (p: NonNullable<RailItem['progress']>) => {
  const min = Math.max(1, Math.round((p.durationSec - p.positionSec) / 60))
  return min >= 60
    ? `${Math.floor(min / 60)} h ${min % 60} min left`
    : `${min} min left`
}

/**
 * A Continue Watching card: clicking resumes playback (the right episode for a series), the bar shows how
 * far you got, and ✕ removes it from the row (with Undo). After a finished episode it offers the next one.
 * The ✕ sits beside the link, not inside it (a button inside a link is invalid and unreachable).
 */
export function ContinueTile({
  title: t,
  className,
}: {
  title: RailItem
  className?: string
}) {
  const remove = useRemoveFromContinueWatching()
  const progress = t.progress
  const episode = progress?.episode
  const href = episode ? `/watch/${t.slug}/${episode.id}` : `/watch/${t.slug}`
  const episodeText = episode
    ? `${progress?.upNext ? 'Up next · ' : ''}S${episode.seasonNumber} · E${episode.episodeNumber}`
    : (t.genres[0]?.name ?? '')

  return (
    <div className={cn('group relative rounded-2xl', className)}>
      <Link
        to={href}
        aria-label={`Resume ${t.title}${episode ? `, ${episodeText}` : ''}`}
        className='block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <div className='relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted'>
          {t.backdropUrl && (
            <img
              src={tmdbImage(t.backdropUrl, 'w780')}
              alt=''
              width={780}
              height={439}
              loading='lazy'
              decoding='async'
              className='size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105 motion-reduce:transition-none'
            />
          )}
          <div
            aria-hidden='true'
            className='absolute inset-0 bg-gradient-to-t from-background from-10% via-background/80 via-50% to-transparent'
          />
          <span
            aria-hidden='true'
            className='absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full glass-strong opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'
          >
            <Play className='size-6 translate-x-0.5 fill-current' />
          </span>
          <div className='absolute inset-x-0 bottom-0 p-4 md:p-5'>
            <p className='text-eyebrow font-semibold text-foreground/70 uppercase'>
              {episodeText}
            </p>
            <p className='mt-1.5 truncate font-display text-lg font-bold md:text-xl'>
              {t.title}
            </p>
            <p className='mt-0.5 truncate text-sm text-foreground/70'>
              {progress?.upNext
                ? (episode?.name ?? 'Next episode')
                : progress
                  ? timeLeft(progress)
                  : ''}
            </p>
          </div>
          {progress && !progress.upNext && (
            <div
              className='absolute inset-x-0 bottom-0 h-1 bg-foreground/15'
              role='progressbar'
              aria-label={`${progress.percent}% watched`}
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className='h-full bg-stream-gradient'
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      </Link>
      <button
        type='button'
        onClick={() => remove(t.id, t.title)}
        aria-label={`Remove ${t.title} from Continue Watching`}
        title='Remove from Continue Watching'
        // always visible on touch screens; on hover or focus with a mouse
        className='absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-full glass transition-opacity outline-none hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100'
      >
        <X className='size-4' />
      </button>
    </div>
  )
}
