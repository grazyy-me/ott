import { useLayoutEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { tmdbImage } from '@/lib/tmdb-image'
import { useMotion } from '@/components/motion'
import { useGetTitleQuery } from '@/features/catalog/catalog-api'
import { useGetPlaybackQuery } from './playback-api'
import { VideoPlayer } from './player/video-player'

/**
 * /watch/:slug[/:episodeId] (signed in). Outside the stream shell: no navbar, no footer, no Lenis, but the
 * stream colours. Asks the server where to stream from (and where to resume), then mounts the player; a
 * new episode remounts it.
 */
export function PlayerPage() {
  const { slug = '', episodeId } = useParams()
  const navigate = useNavigate()
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'stream'
    return () => {
      delete root.dataset.surface
    }
  }, [])

  const titleQuery = useGetTitleQuery(slug)
  const detail = titleQuery.data?.data.title
  const playbackQuery = useGetPlaybackQuery(
    { titleId: detail?.id ?? '', episodeId },
    { skip: !detail, refetchOnMountOrArgChange: true }
  )
  const playback = playbackQuery.data?.data

  const error = titleQuery.error ?? playbackQuery.error
  const status = error && 'status' in error ? error.status : null

  if (status) {
    const unavailable = status === 403
    return (
      <section className='relative isolate flex min-h-svh items-center overflow-hidden bg-background text-foreground'>
        {detail?.backdropUrl && (
          <img
            src={tmdbImage(detail.backdropUrl, 'w1280')}
            alt=''
            className='absolute inset-0 -z-10 size-full object-cover opacity-30'
          />
        )}
        <div
          aria-hidden='true'
          className='absolute inset-0 -z-10 scrim-bottom'
        />
        <div className='shell'>
          <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
            {detail?.title ?? 'Player'}
          </p>
          <h1 className='mt-4 max-w-2xl font-display text-display-2 font-bold text-balance'>
            {unavailable
              ? 'Not available to stream yet'
              : 'This title couldn’t be found'}
          </h1>
          <p className='mt-4 max-w-xl text-lg text-foreground/75'>
            {unavailable
              ? 'We don’t have the video for this one yet. The free titles are ready to watch now.'
              : 'The link may be out of date.'}
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <button
              type='button'
              onClick={() =>
                window.history.state?.idx > 0 ? navigate(-1) : navigate('/')
              }
              className='inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <ArrowLeft className='size-5' /> Back
            </button>
            {detail && (
              <Link
                to={`/title/${detail.slug}`}
                className='inline-flex h-12 items-center rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
              >
                Title details
              </Link>
            )}
            <Link
              to='/browse/free'
              className='inline-flex h-12 items-center rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            >
              Free to watch
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (!playback || !detail) {
    return (
      <div
        className='fixed inset-0 flex items-center justify-center bg-background'
        aria-busy='true'
        aria-label='Loading the player'
      >
        <Loader2 className={reduced ? 'size-10' : 'size-10 animate-spin'} />
      </div>
    )
  }

  return (
    <VideoPlayer
      // a new episode (or title) starts a fresh player: new stream, resume point and view session
      key={`${playback.title.id}:${playback.episode?.id ?? ''}`}
      playback={playback}
      seasons={detail.type === 'movie' ? [] : detail.seasons}
    />
  )
}
