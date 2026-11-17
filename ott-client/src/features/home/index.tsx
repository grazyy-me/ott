import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import {
  Camera,
  Clapperboard,
  Compass,
  Drama,
  Eye,
  Fingerprint,
  Ghost,
  Heart,
  Laugh,
  Rocket,
  Sparkles,
  Swords,
  Tv,
  WandSparkles,
} from 'lucide-react'
import { tmdbImage } from '@/lib/tmdb-image'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { useMotion, useScrollProgress } from '@/components/motion'
import { EndlessCorridor } from '@/components/stream/endless-corridor'
import {
  FilmstripHero,
  type FilmstripItem,
} from '@/components/stream/filmstrip-hero'
import {
  InteractiveSelector,
  type SelectorItem,
} from '@/components/stream/interactive-selector'
import { SectionHeader } from '@/components/stream/section-header'
import { useOpenTitle } from '@/components/stream/use-title-link'
import { HeroAtmosphere } from '@/components/three/hero-atmosphere'
import { RailsView } from '@/features/browse/rails-view'
import { useGetTitlesQuery } from '@/features/catalog/catalog-api'
import { useTitleModalOpen } from '@/features/title/modal-state'
import { HOME_QUERIES } from './queries'

const TYPE_LABEL = { movie: 'Movie', series: 'Series', reality: 'Reality' }

const clip = (text: string, max: number) =>
  text.length > max ? text.slice(0, text.lastIndexOf(' ', max)) + '…' : text

const featurable = (list: TitleCard[]) =>
  list.filter((t) => t.backdropUrl && t.posterUrl)

const toHeroItem = (t: TitleCard): FilmstripItem => ({
  id: t.id,
  title: t.title,
  poster: tmdbImage(t.posterUrl, 'w500'),
  backdrop: tmdbImage(t.backdropUrl, 'w1280'),
  eyebrow: TYPE_LABEL[t.type],
  meta: [
    t.year ? String(t.year) : '',
    t.rating ? `${t.rating.toFixed(1)} ★` : '',
    t.genres[0]?.name ?? '',
  ].filter(Boolean),
  overview: clip(t.overview, 160),
  trailerKey: t.trailerKey || undefined,
})

/** An icon per genre for the mood selector; matched on the genre slug */
const GENRE_ICONS: [RegExp, ReactNode][] = [
  [/action|war/, <Swords key='a' className='size-5' />],
  [/adventure/, <Compass key='b' className='size-5' />],
  [/comedy/, <Laugh key='c' className='size-5' />],
  [/drama/, <Drama key='d' className='size-5' />],
  [/science|sci-fi/, <Rocket key='e' className='size-5' />],
  [/fantasy/, <WandSparkles key='f' className='size-5' />],
  [/crime/, <Fingerprint key='g' className='size-5' />],
  [/horror/, <Ghost key='h' className='size-5' />],
  [/thriller|mystery/, <Eye key='i' className='size-5' />],
  [/romance/, <Heart key='j' className='size-5' />],
  [/animation|family|kids/, <Sparkles key='k' className='size-5' />],
  [/reality/, <Tv key='l' className='size-5' />],
  [/documentary/, <Camera key='m' className='size-5' />],
]
const genreIcon = (slug: string) =>
  GENRE_ICONS.find(([pattern]) => pattern.test(slug))?.[1] ?? (
    <Clapperboard className='size-5' />
  )

/**
 * The five biggest genres among the titles already loaded, each shown with its most popular backdrop
 * (no extra requests). Each picture is used once.
 */
function moodsFrom(pool: TitleCard[]): SelectorItem[] {
  const byGenre = new Map<string, { name: string; titles: TitleCard[] }>()
  for (const t of pool) {
    for (const g of t.genres) {
      const entry = byGenre.get(g.slug) ?? { name: g.name, titles: [] }
      entry.titles.push(t)
      byGenre.set(g.slug, entry)
    }
  }
  const used = new Set<string>()
  const moods: SelectorItem[] = []
  for (const [slug, { name, titles }] of [...byGenre].sort(
    (a, b) => b[1].titles.length - a[1].titles.length
  )) {
    const cover = titles.find((t) => t.backdropUrl && !used.has(t.id))
    if (!cover) continue
    used.add(cover.id)
    moods.push({
      id: slug,
      title: name,
      subtitle: `Starring tonight: ${cover.title}`,
      image: tmdbImage(cover.backdropUrl, 'w1280'),
      icon: genreIcon(slug),
      href: `/movies?genre=${slug}`,
      cta: `Browse ${name.toLowerCase()}`,
    })
    if (moods.length === 5) break
  }
  return moods
}

/** A soft glow behind a band; static (no transform), so it is the same with reduced motion */
function Glow({ tone, className }: { tone: 1 | 2 | 3; className?: string }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute inset-x-0 mx-auto h-[32rem] max-w-5xl rounded-full',
        className
      )}
      style={{
        background: `radial-gradient(closest-side, color-mix(in oklch, var(--stream-glow-${tone}) 16%, transparent), transparent)`,
      }}
    />
  )
}

/** How much extra scroll the hero stays pinned for while the first band rises over it */
const PIN_EXTRA_SVH = 35

/** Home: the featured-titles hero with its Three.js atmosphere, then editorial bands. */
export function Home() {
  useDocumentTitle(null)
  const { reduced } = useMotion()
  const moviesQuery = useGetTitlesQuery(HOME_QUERIES.movies).data?.data
  const seriesQuery = useGetTitlesQuery(HOME_QUERIES.series).data?.data
  const realityQuery = useGetTitlesQuery(HOME_QUERIES.reality).data?.data
  const topRated =
    useGetTitlesQuery(HOME_QUERIES.topRated).data?.data.results ?? []
  const movies = moviesQuery?.results ?? []
  const series = seriesQuery?.results ?? []
  const reality = realityQuery?.results ?? []
  const catalogSize =
    (moviesQuery?.totalResults ?? 0) +
    (seriesQuery?.totalResults ?? 0) +
    (realityQuery?.totalResults ?? 0)

  const heroTitles = [
    ...featurable(movies).slice(0, 5),
    ...featurable(series).slice(0, 2),
    ...featurable(reality).slice(0, 1),
  ]
  const heroItems = heroTitles.map(toHeroItem)
  const openTitle = useOpenTitle()
  const modalOpen = useTitleModalOpen()
  const openHeroItem = (item: FilmstripItem, root?: HTMLElement | null) => {
    const title = heroTitles.find((t) => t.id === item.id)
    if (title) openTitle(title, root)
  }

  const pool = [...movies, ...series, ...reality, ...topRated].filter(
    (t, i, all) => all.findIndex((u) => u.id === t.id) === i
  )
  const moods = moodsFrom(pool)

  const corridor = [...topRated, ...series, ...reality]
    .filter((t) => t.posterUrl)
    .slice(0, 12)
    .map((t) => tmdbImage(t.posterUrl, 'w342'))

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)

  // while the first band rises over it, the hero recedes: scales down a little and fades.
  // Written straight to the DOM (no re-render per frame); the Three.js scene reads progressRef.
  useScrollProgress(
    wrapRef,
    (p) => {
      progressRef.current = p
      const stage = stageRef.current
      if (!stage) return
      stage.style.transform = `scale(${1 - p * 0.08})`
      stage.style.opacity = String(1 - p * 0.85)
      // it recedes like a card being set down: corners round off as it shrinks
      stage.style.borderRadius = `${(p * 28).toFixed(1)}px`
    },
    { range: 'pin', disabled: reduced }
  )

  return (
    <>
      <div
        ref={wrapRef}
        className='relative'
        style={reduced ? undefined : { height: `${100 + PIN_EXTRA_SVH}svh` }}
      >
        <div
          ref={stageRef}
          className={cn(
            'top-0 origin-[50%_30%] overflow-hidden',
            !reduced && 'sticky will-change-transform'
          )}
        >
          {heroItems.length >= 2 ? (
            <FilmstripHero
              items={heroItems}
              label='Featured titles'
              defaultIndex={1}
              parallaxTrigger={reduced ? undefined : wrapRef}
              atmosphere={<HeroAtmosphere progressRef={progressRef} />}
              // the trailer stops while a title modal is open (the modal plays its own) and restarts after
              trailers={!modalOpen}
              onOpen={openHeroItem}
              actions={(item) => (
                <button
                  type='button'
                  onClick={(e) =>
                    openHeroItem(
                      item,
                      e.currentTarget
                        .closest('section')
                        ?.querySelector<HTMLElement>('[aria-current]')
                    )
                  }
                  className='inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90'
                >
                  More info
                </button>
              )}
            />
          ) : (
            // data still loading: hold the hero's exact space so nothing shifts when it arrives
            <div
              className='h-svh min-h-[36rem] bg-background'
              aria-busy='true'
            />
          )}
        </div>
      </div>

      {/* the bands: the first rises over the pinned hero, then the page scrolls on as usual */}
      <div
        className='relative z-10'
        style={reduced ? undefined : { marginTop: `-${PIN_EXTRA_SVH}svh` }}
      >
        <div
          aria-hidden='true'
          className='h-[14svh] bg-gradient-to-b from-transparent to-background'
        />
        <div className='overflow-hidden bg-background pt-2 pb-16'>
          {/* the rails (one request), with two editorial interludes between them */}
          <RailsView
            page='home'
            interludes={{
              'most-watched': moods.length >= 3 && (
                <section
                  className='relative py-16 md:py-24'
                  aria-labelledby='band-moods'
                >
                  <Glow tone={1} className='top-10' />
                  <div id='band-moods' className='relative'>
                    <SectionHeader
                      eyebrow='Moods'
                      title='What are you in the mood for?'
                      description='Open a mood to see what is playing in it tonight.'
                    />
                  </div>
                  <div className='relative mt-10 shell'>
                    <InteractiveSelector items={moods} label='Moods' />
                  </div>
                </section>
              ),
              'award-winners': corridor.length >= 8 && (
                <EndlessCorridor
                  images={corridor}
                  title='Stories without borders'
                  caption={`${catalogSize ? `${catalogSize} titles` : 'Hundreds of titles'} from fourteen languages: films, series and reality, all in one place.`}
                  className='my-8'
                >
                  <Link
                    to='/movies'
                    className='inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90'
                  >
                    Start exploring
                  </Link>
                </EndlessCorridor>
              ),
            }}
          />
        </div>
      </div>
    </>
  )
}
