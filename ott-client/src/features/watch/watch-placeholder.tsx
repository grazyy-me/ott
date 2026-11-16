import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { tmdbImage } from '@/lib/tmdb-image'
import { useGetTitleQuery } from '@/features/catalog/catalog-api'

/**
 * /watch/:slug[/:episodeId] until the player exists (playback phase). Signed-in only, like the real
 * player will be: ProtectedRoute sends signed-out visitors to sign-in first.
 */
export function WatchPlaceholder() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { data } = useGetTitleQuery(slug)
  const t = data?.data.title

  return (
    <section className='relative isolate flex min-h-svh items-center overflow-hidden'>
      {t?.backdropUrl && (
        <img
          src={tmdbImage(t.backdropUrl, 'w1280')}
          alt=''
          className='absolute inset-0 -z-10 size-full object-cover opacity-30'
        />
      )}
      <div aria-hidden='true' className='absolute inset-0 -z-10 scrim-bottom' />
      <div className='shell pt-24'>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          {t?.title ?? 'Player'}
        </p>
        <h1 className='mt-4 max-w-2xl font-display text-display-2 font-bold text-balance'>
          Playback is coming soon
        </h1>
        <p className='mt-4 max-w-xl text-lg text-foreground/75'>
          The player arrives in the next phase. Your account is ready, so it
          will start right here.
        </p>
        <div className='mt-8 flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => navigate(-1)}
            className='inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <ArrowLeft className='size-5' /> Back
          </button>
          {t && (
            <Link
              to={`/title/${t.slug}`}
              className='inline-flex h-12 items-center rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            >
              Title details
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
