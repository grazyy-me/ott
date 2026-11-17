import type { TitleCard } from '@/types/catalog'
import { tmdbImage } from '@/lib/tmdb-image'
import { Stagger } from '@/components/motion'

/**
 * Wide cinematic cards (backdrops, 16:9) with the title set over the picture: for editorial rows such as
 * reality shows, where the scene sells it better than the poster.
 */
export function LandscapeRail({
  titles,
  label,
}: {
  titles: TitleCard[]
  label: string
}) {
  const cards = titles.filter((t) => t.backdropUrl).slice(0, 10)
  if (cards.length === 0) return <div className='h-64' aria-hidden='true' />

  return (
    <Stagger
      key={cards.length}
      as='ul'
      aria-label={label}
      className='mt-10 no-scrollbar flex shell snap-x scroll-px-[clamp(1.25rem,4vw,3rem)] gap-4 overflow-x-auto pb-4'
      step={70}
      y={32}
    >
      {cards.map((t) => (
        <li
          key={t.id}
          className='group w-[80vw] shrink-0 snap-start sm:w-[24rem] lg:w-[28rem]'
        >
          <div className='relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted'>
            <img
              src={tmdbImage(t.backdropUrl, 'w780')}
              alt=''
              width={780}
              height={439}
              loading='lazy'
              decoding='async'
              className='size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105 motion-reduce:transition-none'
            />
            <div
              aria-hidden='true'
              className='absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent'
            />
            <div className='absolute inset-x-0 bottom-0 p-5'>
              {t.genres[0] && (
                <p className='text-eyebrow font-semibold text-foreground/70 uppercase'>
                  {t.genres[0].name}
                </p>
              )}
              <p className='mt-2 truncate font-display text-xl font-bold md:text-2xl'>
                {t.title}
              </p>
              <p className='mt-1 text-sm text-foreground/70'>
                {[
                  t.year,
                  t.numberOfSeasons
                    ? `${t.numberOfSeasons} season${t.numberOfSeasons > 1 ? 's' : ''}`
                    : null,
                  t.rating ? `${t.rating.toFixed(1)} ★` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
        </li>
      ))}
    </Stagger>
  )
}
