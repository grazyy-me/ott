import type { CastMember } from '@/types/catalog'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

/** Top-billed cast as a sideways row of round photos (initials when TMDB has no photo) */
export function CastRow({
  cast,
  inset,
}: {
  cast: CastMember[]
  inset: boolean
}) {
  return (
    <section className='py-8' aria-labelledby='cast-heading'>
      <h3
        id='cast-heading'
        className={cn(
          'font-display text-display-3 font-semibold',
          inset ? 'px-6 md:px-10' : 'shell'
        )}
      >
        Cast
      </h3>
      <ul
        data-lenis-prevent
        className={cn(
          'mt-5 no-scrollbar flex snap-x gap-5 overflow-x-auto pb-2',
          inset ? 'scroll-px-6 px-6 md:scroll-px-10 md:px-10' : 'shell'
        )}
      >
        {cast.map(({ person, character }) => (
          <li
            key={person.id}
            className='w-24 shrink-0 snap-start text-center sm:w-28'
          >
            <div className='mx-auto aspect-square w-20 overflow-hidden rounded-full border border-border bg-muted sm:w-24'>
              {person.profileUrl ? (
                <img
                  src={tmdbImage(person.profileUrl, 'w185')}
                  alt=''
                  width={185}
                  height={278}
                  loading='lazy'
                  decoding='async'
                  className='size-full object-cover'
                />
              ) : (
                <span
                  aria-hidden='true'
                  className='flex size-full items-center justify-center font-display text-xl font-semibold text-muted-foreground'
                >
                  {initials(person.name)}
                </span>
              )}
            </div>
            <p className='mt-2 line-clamp-2 text-sm font-medium'>
              {person.name}
            </p>
            {character && (
              <p className='line-clamp-2 text-xs text-muted-foreground'>
                {character}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
