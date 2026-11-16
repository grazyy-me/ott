import { useState } from 'react'
import type { Season } from '@/types/catalog'
import { formatRuntime } from '@/lib/title-format'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { GlassSelect } from '@/components/stream/glass-select'
import { useGetEpisodesQuery } from '@/features/catalog/catalog-api'

const MAX_TABS = 6

/**
 * Seasons and their episodes: tabs (a dropdown past six seasons), then the season's episodes with a still,
 * number, name, length and overview. Each season loads when it is first opened.
 */
export function SeasonEpisodes({
  titleId,
  seasons,
  inset,
}: {
  titleId: string
  seasons: Season[]
  inset: boolean
}) {
  const [seasonNumber, setSeasonNumber] = useState(seasons[0].seasonNumber)
  const { data, isFetching, isError } = useGetEpisodesQuery({
    titleId,
    seasonNumber,
  })
  const episodes =
    data?.data.season.seasonNumber === seasonNumber ? data.data.episodes : []
  const pad = inset ? 'px-6 md:px-10' : 'shell'

  return (
    <section className='py-8' aria-labelledby='episodes-heading'>
      <div
        className={cn('flex flex-wrap items-center justify-between gap-4', pad)}
      >
        <h3
          id='episodes-heading'
          className='font-display text-display-3 font-semibold'
        >
          Episodes
        </h3>
        {seasons.length > MAX_TABS ? (
          <GlassSelect
            label='Season'
            anyLabel={null}
            value={String(seasonNumber)}
            options={seasons.map((s) => ({
              value: String(s.seasonNumber),
              label: s.name || `Season ${s.seasonNumber}`,
              hint: `${s.episodeCount}`,
            }))}
            onChange={(v) => v && setSeasonNumber(Number(v))}
          />
        ) : (
          seasons.length > 1 && (
            <div
              role='tablist'
              aria-label='Seasons'
              className='flex flex-wrap gap-1 rounded-full glass p-1'
            >
              {seasons.map((s) => (
                <button
                  key={s.id}
                  type='button'
                  role='tab'
                  aria-selected={s.seasonNumber === seasonNumber}
                  aria-controls='episode-list'
                  onClick={() => setSeasonNumber(s.seasonNumber)}
                  className={cn(
                    'h-8 rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    s.seasonNumber === seasonNumber
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Season {s.seasonNumber}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <ol
        id='episode-list'
        aria-busy={isFetching}
        className={cn('mt-6 grid gap-3', pad)}
      >
        {isError && (
          <li className='py-6 text-foreground/70'>
            This season’s episodes didn’t load.
          </li>
        )}
        {!isError && episodes.length === 0
          ? Array.from({ length: 3 }, (_, i) => (
              <li
                key={i}
                aria-hidden='true'
                className='flex gap-4 rounded-2xl p-3'
              >
                <div className='aspect-video w-36 shrink-0 skeleton rounded-xl sm:w-48' />
                <div className='flex-1 space-y-2 pt-1'>
                  <div className='h-4 w-1/2 skeleton rounded' />
                  <div className='h-3 w-5/6 skeleton rounded' />
                </div>
              </li>
            ))
          : episodes.map((e) => (
              <li
                key={e.id}
                className='flex gap-4 rounded-2xl p-3 transition-colors hover:bg-accent/50'
              >
                <div className='relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-48'>
                  {e.stillUrl && (
                    <img
                      src={tmdbImage(e.stillUrl, 'w300')}
                      alt=''
                      width={300}
                      height={169}
                      loading='lazy'
                      decoding='async'
                      className='size-full object-cover'
                    />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='flex flex-wrap items-baseline gap-x-2'>
                    <span className='text-sm text-muted-foreground tabular-nums'>
                      {e.episodeNumber}.
                    </span>
                    <span className='font-medium'>
                      {e.name || `Episode ${e.episodeNumber}`}
                    </span>
                    {e.runtime ? (
                      <span className='text-sm text-muted-foreground'>
                        {formatRuntime(e.runtime)}
                      </span>
                    ) : null}
                  </p>
                  {e.overview && (
                    <p className='mt-1 line-clamp-2 text-sm text-foreground/70'>
                      {e.overview}
                    </p>
                  )}
                </div>
              </li>
            ))}
      </ol>
    </section>
  )
}
