import type { TitleCard } from '@/types/catalog'
import { tmdbImage } from '@/lib/tmdb-image'
import { Reveal, Stagger } from '@/components/motion'

const SKELETON = Array.from({ length: 8 }, () => null)

/**
 * A horizontal row of posters with a heading; posters arrive one after another the first time the row
 * scrolls into view. A rail, not a grid: it scrolls sideways (snap) and keeps the first poster on the gutter.
 */
export function PosterRail({
  title,
  titles,
}: {
  title: string
  titles: TitleCard[]
}) {
  const posters = titles.filter((t) => t.posterUrl)

  return (
    <section className='py-6' aria-label={title}>
      <div className='shell'>
        <Reveal y={24}>
          <h2 className='font-display text-display-3 font-semibold'>{title}</h2>
        </Reveal>
      </div>
      <Stagger
        key={posters.length}
        as='ul'
        className='mt-5 no-scrollbar flex shell snap-x scroll-px-[clamp(1.25rem,4vw,3rem)] gap-3 overflow-x-auto pb-2 sm:gap-4'
        step={45}
        y={24}
      >
        {(posters.length ? posters : SKELETON).map((t, i) => (
          <li
            key={t?.id ?? i}
            className='w-32 shrink-0 snap-start sm:w-40 lg:w-44'
          >
            <div className='aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted'>
              {t && (
                <img
                  src={tmdbImage(t.posterUrl, 'w342')}
                  alt=''
                  width={342}
                  height={513}
                  loading='lazy'
                  decoding='async'
                  className='size-full object-cover'
                />
              )}
            </div>
            <p className='mt-2 truncate text-sm text-foreground/90'>
              {t?.title ?? ' '}
            </p>
            <p className='truncate text-xs text-muted-foreground'>
              {t
                ? [t.year, t.rating ? `${t.rating.toFixed(1)} ★` : null]
                    .filter(Boolean)
                    .join(' · ')
                : ' '}
            </p>
          </li>
        ))}
      </Stagger>
    </section>
  )
}
