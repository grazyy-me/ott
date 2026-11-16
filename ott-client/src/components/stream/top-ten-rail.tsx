import type { TitleCard } from '@/types/catalog'
import { tmdbImage } from '@/lib/tmdb-image'
import { Stagger } from '@/components/motion'
import { TitleLink } from './title-link'

/**
 * Top 10: posters standing in front of giant outlined rank numerals. A sideways rail with snap,
 * the numerals are decorative (the rank is also in each poster's accessible name).
 */
export function TopTenRail({
  titles,
  label,
}: {
  titles: TitleCard[]
  label: string
}) {
  const top = titles.filter((t) => t.posterUrl).slice(0, 10)
  if (top.length === 0) return <div className='h-72' aria-hidden='true' />

  return (
    <Stagger
      key={top.length}
      as='ol'
      aria-label={label}
      className='shell mt-10 no-scrollbar flex snap-x scroll-px-[clamp(1.25rem,4vw,3rem)] gap-4 overflow-x-auto pb-4'
      step={60}
      y={32}
    >
      {top.map((t, i) => (
        <li key={t.id} className='shrink-0 snap-start'>
          <TitleLink title={t} className='group flex items-end rounded-xl'>
            <span
              aria-hidden='true'
              className='-mr-3 font-display text-[clamp(8.5rem,15vw,13.5rem)] leading-[0.74] font-extrabold tracking-tighter text-transparent select-none [-webkit-text-stroke:3px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:-mr-4'
            >
              {i + 1}
            </span>
            <div
              data-title-media
              className='relative w-32 overflow-hidden rounded-xl border border-border bg-muted shadow-[0_18px_40px_-18px_oklch(0_0_0/80%)] sm:w-40 lg:w-44'
            >
              <div className='aspect-[2/3]'>
                <img
                  src={tmdbImage(t.posterUrl, 'w342')}
                  alt={`${i + 1}. ${t.title}`}
                  width={342}
                  height={513}
                  loading='lazy'
                  decoding='async'
                  className='size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105 motion-reduce:transition-none'
                />
              </div>
            </div>
          </TitleLink>
        </li>
      ))}
    </Stagger>
  )
}
