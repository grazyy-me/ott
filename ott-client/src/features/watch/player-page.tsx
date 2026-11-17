import { useLayoutEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import type { SubscriptionRequired } from '@/types/billing'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { tmdbImage } from '@/lib/tmdb-image'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useMotion } from '@/components/motion'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { PaywallDialog } from '@/features/billing/paywall-dialog'
import { useGetTitleQuery } from '@/features/catalog/catalog-api'
import { useGetPlaybackQuery, useGetStreamQuery } from './playback-api'
import { VideoPlayer } from './player/video-player'

/**
 * /watch/:slug[/:episodeId]. Outside the stream shell: no navbar, no footer, no Lenis, but the stream colours.
 * Asks the server what to play and where to resume (POST /playback), then for the video URL
 * (GET /titles/:id/stream). A 402 there opens the paywall; once paid, the stream loads and playback starts.
 * Guests can watch free titles (nothing is saved for them). A new episode remounts the player.
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

  const location = useLocation()
  const authStatus = useAppSelector(selectAuthStatus)
  const guest = authStatus !== 'authenticated'

  const titleQuery = useGetTitleQuery(slug)
  const detail = titleQuery.data?.data.title
  useDocumentTitle(detail ? `Watching ${detail.title}` : 'Player')
  // wait for the session check, so a signed-in viewer isn't treated as a guest for a moment
  const playbackQuery = useGetPlaybackQuery(
    { titleId: detail?.id ?? '', episodeId },
    {
      skip: !detail || authStatus === 'checking',
      refetchOnMountOrArgChange: true,
    }
  )
  const playback = playbackQuery.data?.data
  const streamQuery = useGetStreamQuery(
    { titleId: playback?.title.id ?? '', episodeId: playback?.episode?.id },
    { skip: !playback, refetchOnMountOrArgChange: true }
  )
  const stream = streamQuery.data?.data
  const streamError = streamQuery.error as
    { status?: number; data?: SubscriptionRequired } | undefined
  const paywall = streamError?.status === 402 ? streamError.data : undefined

  const error =
    titleQuery.error ??
    playbackQuery.error ??
    (paywall ? undefined : streamQuery.error)
  const status = error && 'status' in error ? error.status : null
  const goBack = () =>
    window.history.state?.idx > 0 ? navigate(-1) : navigate(`/title/${slug}`)

  if (paywall && detail) {
    return (
      <section className='relative isolate min-h-svh overflow-hidden bg-background text-foreground'>
        {detail.backdropUrl && (
          <img
            src={tmdbImage(detail.backdropUrl, 'w1280')}
            alt=''
            className='absolute inset-0 -z-10 size-full object-cover opacity-40'
          />
        )}
        <div
          aria-hidden='true'
          className='absolute inset-0 -z-10 scrim-bottom'
        />
        <PaywallDialog
          open
          required={paywall}
          titleName={detail.title}
          returnTo={`${location.pathname}${location.search}`}
          onClose={goBack}
          onSubscribed={() => streamQuery.refetch()}
        />
      </section>
    )
  }

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

  if (!playback || !detail || !stream) {
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
      src={stream.src}
      guest={guest}
      seasons={detail.type === 'movie' ? [] : detail.seasons}
    />
  )
}
