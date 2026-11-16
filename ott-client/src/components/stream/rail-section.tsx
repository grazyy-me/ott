import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Rail, TitleType } from '@/types/catalog'
import { ArrowRight } from 'lucide-react'
import { tmdbImage, youtubeWatchUrl } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { Reveal, Stagger } from '@/components/motion'
import { CoverflowCarousel } from './coverflow-carousel'
import { RAIL_LAYOUT, showAllHref, type RailLayout } from './rail-layout'
import { LandscapeTile, PosterTile } from './title-tiles'
import { TopTenRail } from './top-ten-rail'

const ROW =
  'shell no-scrollbar mt-6 flex snap-x scroll-px-[clamp(1.25rem,4vw,3rem)] overflow-x-auto pb-4'

/** Heading row of a rail: title, how many titles, and the "Show all" pill */
export function RailHeader({
  title,
  total,
  href,
}: {
  title: string
  total?: number
  href?: string
}) {
  return (
    <div className='flex shell items-end justify-between gap-6'>
      <Reveal y={20}>
        <h2 className='font-display text-display-3 font-semibold text-balance'>
          {title}
        </h2>
      </Reveal>
      {href && (
        <Reveal y={20} delay={80} className='shrink-0'>
          <Link
            to={href}
            className='group inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground'
          >
            Show all
            {total ? (
              <span className='text-muted-foreground tabular-nums'>
                {total}
              </span>
            ) : null}
            <ArrowRight
              aria-hidden='true'
              className='size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none'
            />
          </Link>
        </Reveal>
      )}
    </div>
  )
}

function Row({
  children,
  label,
  gap = 'gap-3 sm:gap-4',
}: {
  children: ReactNode
  label: string
  gap?: string
}) {
  return (
    <Stagger
      as='ul'
      aria-label={label}
      className={cn(ROW, gap)}
      step={45}
      y={24}
    >
      {children}
    </Stagger>
  )
}

/** One rail: header + its layout. `type` scopes the "Show all" link on Movies / Series / Reality pages. */
export function RailSection({
  rail,
  type,
  layout,
}: {
  rail: Rail
  type?: TitleType
  layout?: RailLayout
}) {
  const kind = layout ?? RAIL_LAYOUT[rail.key]
  // personal rails have no "Show all" beyond what they show; the others open the infinite grid
  const href =
    rail.key === 'continue-watching' ? undefined : showAllHref(rail.key, type)

  return (
    <section className='relative py-8 md:py-10' aria-label={rail.title}>
      <RailHeader title={rail.title} total={rail.total} href={href} />

      {kind === 'coverflow' && (
        <CoverflowCarousel
          label={rail.title}
          initialIndex={Math.min(2, rail.items.length - 1)}
          className='mt-2'
          style={{ height: '70svh', minHeight: 480, maxHeight: 760 }}
          items={rail.items
            .filter((t) => t.posterUrl)
            .slice(0, 12)
            .map((t) => ({
              id: t.id,
              title: t.title,
              subtitle: [
                t.year,
                t.rating ? `${t.rating.toFixed(1)} ★` : null,
                t.genres[0]?.name,
              ]
                .filter(Boolean)
                .join(' · '),
              image: tmdbImage(t.posterUrl, 'w500'),
              description: t.overview,
              trailerUrl: youtubeWatchUrl(t.trailerKey),
            }))}
        />
      )}

      {kind === 'top10' && (
        <TopTenRail titles={rail.items} label={rail.title} />
      )}

      {kind === 'poster' && (
        <Row label={rail.title}>
          {rail.items.map((t) => (
            <li key={t.id} className='w-32 shrink-0 snap-start sm:w-40 lg:w-44'>
              <PosterTile title={t} />
            </li>
          ))}
        </Row>
      )}

      {(kind === 'landscape' || kind === 'continue' || kind === 'coming') && (
        <Row label={rail.title} gap='gap-4'>
          {rail.items.map((t) => (
            <li
              key={t.id}
              className='w-[78vw] shrink-0 snap-start sm:w-[22rem] lg:w-[26rem]'
            >
              <LandscapeTile
                title={t}
                variant={
                  kind === 'continue'
                    ? 'continue'
                    : kind === 'coming'
                      ? 'coming'
                      : 'default'
                }
              />
            </li>
          ))}
        </Row>
      )}
    </section>
  )
}

/** Loading placeholder for a rail; shimmer stops with reduced motion */
export function RailSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className='py-8 md:py-10' aria-hidden='true'>
      <div className='shell'>
        <div className='h-8 w-56 skeleton rounded-lg' />
      </div>
      <div className={cn(ROW, 'gap-4 overflow-hidden')}>
        {Array.from({ length: wide ? 4 : 7 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'shrink-0 skeleton rounded-xl',
              wide
                ? 'aspect-video w-[78vw] sm:w-[22rem] lg:w-[26rem]'
                : 'aspect-[2/3] w-32 sm:w-40 lg:w-44'
            )}
          />
        ))}
      </div>
    </div>
  )
}
