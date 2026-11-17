import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { Film, Sparkles, Tv } from 'lucide-react'
import { tmdbImage, youtubeWatchUrl } from '@/lib/tmdb-image'
import { Reveal } from '@/components/motion'
import { ChapterHero, type Chapter } from '@/components/stream/chapter-hero'
import { CoverflowCarousel } from '@/components/stream/coverflow-carousel'
import { CurvedLensCarousel } from '@/components/stream/curved-lens-carousel'
import { EndlessCorridor } from '@/components/stream/endless-corridor'
import {
  FilmstripHero,
  type FilmstripItem,
} from '@/components/stream/filmstrip-hero'
import { InteractiveSelector } from '@/components/stream/interactive-selector'
import { useGetTitlesQuery } from '@/features/catalog/catalog-api'

const TYPE_LABEL = { movie: 'Movie', series: 'Series', reality: 'Reality' }

const TYPE_ICON = {
  movie: <Film className='size-5' aria-hidden='true' />,
  series: <Tv className='size-5' aria-hidden='true' />,
  reality: <Sparkles className='size-5' aria-hidden='true' />,
}

const meta = (t: TitleCard) =>
  [
    t.year,
    t.genres
      .slice(0, 2)
      .map((g) => g.name)
      .join(', '),
  ]
    .filter(Boolean)
    .join(' · ')

const clip = (text: string, max = 140) =>
  text.length > max ? text.slice(0, text.lastIndexOf(' ', max)) + '…' : text

function SectionLabel({ name, note }: { name: string; note: string }) {
  return (
    <div className='shell pt-28 pb-10'>
      <Reveal>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          21st.dev · {name}
        </p>
        <p className='mt-3 max-w-2xl text-foreground/75'>{note}</p>
      </Reveal>
    </div>
  )
}

/** /lab/components: the 21st.dev components adapted for stream pages, fed with real catalog titles */
export function LabComponents() {
  const movies =
    useGetTitlesQuery({ type: 'movie', sort: 'popular', limit: 24 }).data?.data
      .results ?? []
  const series =
    useGetTitlesQuery({ type: 'series', sort: 'popular', limit: 12 }).data?.data
      .results ?? []
  const reality =
    useGetTitlesQuery({ type: 'reality', sort: 'popular', limit: 6 }).data?.data
      .results ?? []

  const withBackdrop = (list: TitleCard[]) => list.filter((t) => t.backdropUrl)
  const featurable = (list: TitleCard[]) =>
    list.filter((t) => t.backdropUrl && t.posterUrl)

  const hero: FilmstripItem[] = [
    ...featurable(movies).slice(0, 5),
    ...featurable(series).slice(0, 2),
    ...featurable(reality).slice(0, 1),
  ].map((t) => ({
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
  }))

  const selector = [
    ...withBackdrop(movies).slice(2, 4),
    ...withBackdrop(series).slice(0, 2),
    ...withBackdrop(reality).slice(0, 1),
  ].map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: meta(t),
    image: tmdbImage(t.backdropUrl, 'w1280'),
    icon: TYPE_ICON[t.type],
  }))

  const coverflow = movies
    .filter((t) => t.posterUrl)
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: meta(t),
      image: tmdbImage(t.posterUrl, 'w500'),
      description: t.overview,
      trailerUrl: youtubeWatchUrl(t.trailerKey),
    }))

  const corridor = [...movies, ...series]
    .filter((t) => t.posterUrl)
    .slice(0, 12)
    .map((t) => tmdbImage(t.posterUrl, 'w342'))

  const lens = series
    .filter((t) => t.posterUrl)
    .slice(0, 8)
    .map((t) => ({
      title: t.title,
      kicker: `Series · ${t.year ?? ''}`,
      caption: clip(t.overview),
      image: tmdbImage(t.posterUrl, 'w500'),
    }))

  const chapters: Chapter[] = [
    ...withBackdrop(reality).slice(1, 2),
    ...withBackdrop(series).slice(2, 4),
  ].map((t, i) => ({
    id: t.id,
    eyebrow: `Chapter ${String(i + 1).padStart(2, '0')} · ${t.type === 'reality' ? 'Reality' : 'Series'}`,
    title: t.title,
    description: clip(t.overview, 180),
    image: tmdbImage(t.backdropUrl, 'w1280'),
  }))

  if (hero.length < 2) {
    // data still loading: hold the hero's space so nothing jumps when it arrives
    return <div className='h-svh' aria-busy='true' />
  }

  return (
    <>
      <FilmstripHero
        items={hero}
        label='Featured titles'
        defaultIndex={1}
        actions={(item) => (
          <Link
            to={`/lab/components#${item.id}`}
            className='inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90'
          >
            More info
          </Link>
        )}
      />

      <div className='shell py-20'>
        <Reveal>
          <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
            21st.dev · Hero Carousel
          </p>
          <p className='mt-3 max-w-2xl text-lg leading-relaxed text-foreground/80'>
            Featured titles in a filmstrip: click a poster, drag the strip,
            swipe sideways on a trackpad or use the arrow keys. It advances on
            its own until you hover or focus it. Below: every other component
            adapted from 21st.dev, fed with real titles from the catalog.
          </p>
        </Reveal>
      </div>

      <SectionLabel
        name='Interactive Selector'
        note='Pick a panel by click, tap or arrow keys; it stacks vertically on phones.'
      />
      <div className='shell'>
        <InteractiveSelector items={selector} label='Featured picks' />
      </div>

      <SectionLabel
        name='Glassy Coverflow Carousel'
        note='Swipe, drag or use the arrow keys. Select the front poster to load its trailer.'
      />
      <CoverflowCarousel
        items={coverflow}
        label='Popular movies'
        initialIndex={2}
      />

      <SectionLabel
        name='Endless'
        note='A corridor of posters flying past; it pauses when off screen and stays still with reduced motion.'
      />
      <EndlessCorridor
        images={corridor}
        title='Endless stories'
        caption='Movies, series and reality shows from fourteen languages.'
      />

      <SectionLabel
        name='3D Curved Carousel'
        note='WebGL: drag or flick and it settles on a spring. Falls back to a plain picture without WebGL.'
      />
      <CurvedLensCarousel slides={lens} label='Popular series' height='92svh' />

      <SectionLabel
        name='Scroll-Triggered Video Hero'
        note='Chapters cross-fade as you scroll; the ring tracks progress through the section.'
      />
      <ChapterHero chapters={chapters} label='Featured chapters' />
    </>
  )
}
