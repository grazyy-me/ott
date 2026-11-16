import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { Credit, TitleCard, TitleDetail as Detail } from '@/types/catalog'
import { Clapperboard, X } from 'lucide-react'
import { countryName, languageName } from '@/lib/locale-names'
import { formatRuntime, lengthLabel, ratingLabel } from '@/lib/title-format'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { Reveal, useMotion } from '@/components/motion'
import { MyListButton, PlayButton } from '@/components/stream/title-actions'
import { YouTubeTrailer } from '@/components/stream/trailer/youtube-trailer'
import { useGetTitleQuery } from '@/features/catalog/catalog-api'
import { CastRow } from './cast-row'
import { MORPH_NAME } from './modal-state'
import { MoreLikeThis } from './more-like-this'
import { SeasonEpisodes } from './season-episodes'

const TYPE_LABEL = { movie: 'Film', series: 'Series', reality: 'Reality' }

/** The tagline, or the overview's first sentence when there is none */
const loglineOf = (t: Pick<TitleCard, 'tagline' | 'overview'>) => {
  if (t.tagline) return t.tagline
  const first = t.overview.match(/^.+?[.!?](\s|$)/)?.[0]?.trim()
  // a fragment like "1815." says nothing on its own
  return first && first.length >= 30 && first.length < t.overview.length
    ? first
    : ''
}

const names = (people: Credit[]) => people.map((p) => p.name).join(', ')

/**
 * Everything about one title: backdrop hero with Play / My List / Trailer, facts, description, seasons and
 * episodes (series, reality), cast, crew and More Like This. Shared by the modal and the full page.
 * `seed` (the card that was clicked) paints the hero before the details arrive.
 */
export function TitleDetail({
  slug,
  seed,
  variant,
  morph = false,
  scrollContainer,
  headingId,
}: {
  slug: string
  seed?: TitleCard
  variant: 'modal' | 'page'
  /** Name the backdrop for the card-to-modal morph, just while it runs */
  morph?: boolean
  scrollContainer?: RefObject<HTMLElement | null>
  headingId?: string
}) {
  const { data, isError, refetch } = useGetTitleQuery(slug)
  const detail: Detail | undefined = data?.data.title
  const t: TitleCard | undefined =
    detail ?? (seed?.slug === slug ? seed : undefined)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [morphing, setMorphing] = useState(morph)
  const backdrop = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()
  // the hero (and its backdrop) only exists once there is something to show
  const heroReady = Boolean(t)

  // the backdrop moves slower than the content as you scroll (the modal's own scroller, or the page);
  // the transform is written straight from the scroll event. Off with reduced motion.
  useEffect(() => {
    const el = backdrop.current
    if (!el || reduced) return
    const scroller: HTMLElement | Window = scrollContainer?.current ?? window
    const read = () =>
      scroller instanceof Window ? scroller.scrollY : scroller.scrollTop
    const onScroll = () => {
      const y = Math.min(read(), 900)
      backdrop.current?.style.setProperty(
        'transform',
        `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y / 4500})`
      )
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [scrollContainer, reduced, heroReady])

  // the backdrop takes the morph name over from the card: clear it there before the new state is captured
  useLayoutEffect(() => {
    if (!morph) return
    for (const el of document.querySelectorAll<HTMLElement>(
      'main [data-title-media]'
    ))
      el.style.viewTransitionName = ''
  }, [morph])

  // the shared name only matters during the transition; drop it so later transitions can't collide
  useEffect(() => {
    if (!morphing) return
    const timer = window.setTimeout(() => setMorphing(false), 900)
    return () => window.clearTimeout(timer)
  }, [morphing])

  if (!t) {
    return isError ? (
      <div className='py-32 text-center'>
        <p className='text-lg text-foreground/80'>This title didn’t load.</p>
        <button
          type='button'
          onClick={() => refetch()}
          className='mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
        >
          Try again
        </button>
      </div>
    ) : (
      <DetailSkeleton variant={variant} />
    )
  }

  const logline = loglineOf(t)
  const meta = [
    t.year,
    lengthLabel(t),
    ratingLabel(t.rating) &&
      `★ ${ratingLabel(t.rating)}${t.voteCount ? ` (${t.voteCount.toLocaleString('en-IN')})` : ''}`,
  ].filter(Boolean)
  const awards = detail?.awards ?? []
  const Heading = variant === 'page' ? 'h1' : 'h2'

  return (
    <article>
      {/* hero */}
      <div
        className={cn(
          'relative isolate overflow-hidden',
          variant === 'modal'
            ? 'h-[min(62vh,560px)] rounded-t-3xl'
            : 'h-[82svh] min-h-[520px]'
        )}
      >
        <div
          ref={backdrop}
          className='absolute inset-0 -z-10 will-change-transform'
        >
          {(t.backdropUrl || t.posterUrl) && (
            <img
              src={
                t.backdropUrl
                  ? tmdbImage(t.backdropUrl, 'w1280')
                  : tmdbImage(t.posterUrl, 'w780')
              }
              alt=''
              fetchPriority='high'
              style={morphing ? { viewTransitionName: MORPH_NAME } : undefined}
              className='size-full object-cover'
            />
          )}
        </div>
        {trailerOpen && t.trailerKey && (
          <div className='absolute inset-0 z-10 bg-background'>
            <YouTubeTrailer
              videoKey={t.trailerKey}
              title={t.title}
              preview={false}
              muted={false}
              onEnded={() => setTrailerOpen(false)}
              onError={() => setTrailerOpen(false)}
              className='size-full'
            />
            <button
              type='button'
              onClick={() => setTrailerOpen(false)}
              className='absolute top-4 left-4 inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            >
              <X className='size-4' /> Close trailer
            </button>
          </div>
        )}
        <div
          aria-hidden='true'
          className='absolute inset-0 -z-10 scrim-bottom'
        />
        <div
          aria-hidden='true'
          className='absolute inset-0 -z-10 scrim-left opacity-80'
        />

        <div
          className={cn(
            'absolute inset-x-0 bottom-0',
            variant === 'modal' ? 'px-6 pb-8 md:px-10' : 'shell pb-12'
          )}
        >
          <Reveal fade={false}>
            <p className='flex items-center gap-2 text-eyebrow font-semibold text-foreground/75 uppercase'>
              <span
                className='size-1.5 rounded-full bg-stream-gradient'
                aria-hidden='true'
              />
              {TYPE_LABEL[t.type]}
              {t.isFree && <span className='text-foreground'>· Free</span>}
            </p>
            <Heading
              id={headingId}
              className={cn(
                'mt-3 max-w-3xl font-display font-bold text-balance',
                variant === 'modal' ? 'text-display-2' : 'text-display-1'
              )}
            >
              {t.title}
            </Heading>
            {logline && (
              <p className='mt-3 max-w-2xl text-lg text-foreground/85 md:text-xl'>
                {logline}
              </p>
            )}
            <p className='mt-3 flex flex-wrap gap-x-3 text-sm text-foreground/75'>
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </p>
            <div className='mt-6 flex flex-wrap items-center gap-3'>
              <PlayButton title={t} />
              <MyListButton title={t} />
              {t.trailerKey && !trailerOpen && (
                <button
                  type='button'
                  onClick={() => setTrailerOpen(true)}
                  className='inline-flex h-12 items-center gap-2 rounded-full glass px-6 text-base font-semibold transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <Clapperboard className='size-5' /> Trailer
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {/* body */}
      <div
        className={cn(
          'grid gap-10 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-14',
          variant === 'modal' ? 'px-6 md:px-10' : 'shell'
        )}
      >
        <div>
          <h3 className='text-eyebrow font-semibold text-muted-foreground uppercase'>
            Story
          </h3>
          <Description text={t.overview} />
          {awards.length > 0 && (
            <ul className='mt-6 flex flex-wrap gap-2' aria-label='Awards'>
              {awards.map((a) => (
                <li
                  key={a}
                  className='rounded-full glass px-3 py-1.5 text-xs font-semibold'
                >
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Facts title={t} detail={detail} />
      </div>

      {detail && detail.type !== 'movie' && detail.seasons.length > 0 && (
        <SeasonEpisodes
          titleId={detail.id}
          seasons={detail.seasons}
          inset={variant === 'modal'}
        />
      )}
      {detail && detail.cast.length > 0 && (
        <CastRow cast={detail.cast} inset={variant === 'modal'} />
      )}
      {detail && (
        <MoreLikeThis titleId={detail.id} inset={variant === 'modal'} />
      )}
    </article>
  )
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  if (!text)
    return <p className='mt-3 text-foreground/70'>No description yet.</p>
  const long = text.length > 420
  return (
    <div className='mt-3'>
      <p
        className={cn(
          'max-w-prose text-base leading-relaxed text-foreground/85 md:text-lg',
          long && !open && 'line-clamp-5'
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type='button'
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className='mt-2 text-sm font-semibold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
        >
          {open ? 'Less' : 'More'}
        </button>
      )}
    </div>
  )
}

function Facts({ title: t, detail }: { title: TitleCard; detail?: Detail }) {
  const rows: [string, string][] = []
  if (t.genres.length)
    rows.push(['Genres', t.genres.map((g) => g.name).join(', ')])
  if (detail?.directors.length)
    rows.push([
      detail.directors.length > 1 ? 'Directors' : 'Director',
      names(detail.directors),
    ])
  if (detail?.creators.length) rows.push(['Created by', names(detail.creators)])
  if (detail?.writers.length) rows.push(['Writers', names(detail.writers)])
  if (t.countries.length)
    rows.push([
      t.countries.length > 1 ? 'Countries' : 'Country',
      t.countries.map(countryName).join(', '),
    ])
  if (t.languages.length)
    rows.push([
      t.languages.length > 1 ? 'Languages' : 'Language',
      t.languages.map(languageName).join(', '),
    ])
  if (t.type === 'movie' && t.runtime)
    rows.push(['Runtime', formatRuntime(t.runtime) ?? ''])
  if (t.type !== 'movie' && t.numberOfEpisodes)
    rows.push([
      'Episodes',
      `${t.numberOfSeasons} seasons · ${t.numberOfEpisodes} episodes`,
    ])
  if (t.rating)
    rows.push([
      'Rating',
      `${t.rating.toFixed(1)} / 10 from ${t.voteCount.toLocaleString('en-IN')} votes (TMDB)`,
    ])
  if (t.releaseDate)
    rows.push([
      t.type === 'movie' ? 'Released' : 'First aired',
      new Date(t.releaseDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ])

  return (
    <dl className='grid content-start gap-4 text-sm'>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className='text-muted-foreground'>{label}</dt>
          <dd className='mt-0.5 text-foreground/90'>{value}</dd>
        </div>
      ))}
      {!detail &&
        Array.from({ length: 3 }, (_, i) => (
          <div key={i} aria-hidden='true'>
            <div className='h-3 w-16 skeleton rounded' />
            <div className='mt-2 h-4 w-40 skeleton rounded' />
          </div>
        ))}
    </dl>
  )
}

function DetailSkeleton({ variant }: { variant: 'modal' | 'page' }) {
  return (
    <div aria-busy='true' aria-label='Loading'>
      <div
        className={cn(
          'skeleton',
          variant === 'modal'
            ? 'h-[min(62vh,560px)] rounded-t-3xl'
            : 'h-[82svh]'
        )}
      />
      <div
        className={cn(
          'space-y-3 py-10',
          variant === 'modal' ? 'px-6 md:px-10' : 'shell'
        )}
      >
        <div className='h-4 w-2/3 skeleton rounded' />
        <div className='h-4 w-1/2 skeleton rounded' />
        <div className='h-4 w-3/5 skeleton rounded' />
      </div>
    </div>
  )
}
