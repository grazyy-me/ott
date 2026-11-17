import type { ReactNode } from 'react'
import type { RailItem } from '@/types/catalog'
import { lengthLabel } from '@/lib/title-format'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { ContinueTile } from './continue-tile'
import { TitleLink } from './title-link'

const metaLine = (t: RailItem) =>
  [t.year, t.rating ? `${t.rating.toFixed(1)} ★` : null, t.genres[0]?.name]
    .filter(Boolean)
    .join(' · ')

const releaseLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date to be announced'

/** Small glass label on a tile, e.g. "Free" or a release date */
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className='absolute top-2.5 left-2.5 rounded-full glass px-2.5 py-1 text-[11px] font-semibold tracking-wide'>
      {children}
    </span>
  )
}

/** Portrait poster card */
export function PosterTile({
  title: t,
  className,
}: {
  title: RailItem
  className?: string
}) {
  return (
    <TitleLink title={t} className={cn('group block rounded-xl', className)}>
      <div
        data-title-media
        className='relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted'
      >
        {t.posterUrl && (
          <img
            src={tmdbImage(t.posterUrl, 'w342')}
            alt=''
            width={342}
            height={513}
            loading='lazy'
            decoding='async'
            className='size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105 motion-reduce:transition-none'
          />
        )}
        {t.isFree && <Badge>Free</Badge>}
      </div>
      <p className='mt-2 truncate text-sm font-medium text-foreground/90'>
        {t.title}
      </p>
      <p className='truncate text-xs text-muted-foreground'>{metaLine(t)}</p>
    </TitleLink>
  )
}

/** Wide 16:9 backdrop card with the title over the picture; `variant` adds the Continue / Coming Soon details */
export function LandscapeTile({
  title: t,
  variant = 'default',
  className,
}: {
  title: RailItem
  variant?: 'default' | 'continue' | 'coming'
  className?: string
}) {
  // Continue Watching resumes playback and can be removed: its own card
  if (variant === 'continue')
    return <ContinueTile title={t} className={className} />
  return (
    <TitleLink title={t} className={cn('group block rounded-2xl', className)}>
      <div
        data-title-media
        className='relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted'
      >
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
        {variant === 'coming' && <Badge>{releaseLabel(t.releaseDate)}</Badge>}
        {variant === 'default' && t.awards?.[0] && <Badge>{t.awards[0]}</Badge>}
        {variant === 'default' && !t.awards?.[0] && t.isFree && (
          <Badge>Free</Badge>
        )}
        <div className='absolute inset-x-0 bottom-0 p-4 md:p-5'>
          <p className='text-eyebrow font-semibold text-foreground/70 uppercase'>
            {t.genres[0]?.name ?? ''}
          </p>
          <p className='mt-1.5 truncate font-display text-lg font-bold md:text-xl'>
            {t.title}
          </p>
          <p className='mt-0.5 truncate text-sm text-foreground/70'>
            {[
              t.year,
              t.type === 'movie' ? null : lengthLabel(t),
              t.rating ? `${t.rating.toFixed(1)} ★` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
    </TitleLink>
  )
}
