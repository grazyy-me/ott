import type { PlaybackEpisode } from '@/types/playback'
import { Play, X } from 'lucide-react'
import { tmdbImage } from '@/lib/tmdb-image'
import { episodeLabel } from './format'

/**
 * The next episode, near the end of this one. With `countdown` (after the episode ends) it plays by itself
 * when the count reaches 0, unless cancelled. Without one it is just a button (also with reduced motion).
 */
export function UpNext({
  episode,
  countdown,
  onPlay,
  onCancel,
}: {
  episode: PlaybackEpisode
  countdown: number | null
  onPlay: () => void
  onCancel: () => void
}) {
  return (
    <div
      role='region'
      aria-label='Up next'
      aria-live='polite'
      className='absolute right-4 bottom-28 z-20 flex w-[min(22rem,calc(100%-2rem))] gap-3 rounded-2xl glass-strong p-3 shadow-2xl sm:right-6'
    >
      <div className='relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-muted'>
        {episode.stillUrl && (
          <img
            src={tmdbImage(episode.stillUrl, 'w300')}
            alt=''
            className='size-full object-cover'
          />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          {countdown !== null ? `Next episode in ${countdown}` : 'Next episode'}
        </p>
        <p className='mt-1 line-clamp-2 text-sm font-medium'>
          {episodeLabel(episode)}
        </p>
        <div className='mt-2 flex items-center gap-2'>
          <button
            type='button'
            onClick={onPlay}
            className='inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Play className='size-3.5 fill-current' /> Play now
          </button>
          {countdown !== null && (
            <button
              type='button'
              onClick={onCancel}
              className='inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            >
              <X className='size-3.5' /> Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
