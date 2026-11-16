import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { cn } from '@/lib/utils'
import type { MotionPreference } from '@/context/motion-context'
import { Button } from '@/components/ui/button'
import {
  Parallax,
  PinnedSection,
  Reveal,
  ScrollProgress,
  Stagger,
  useMotion,
} from '@/components/motion'
import { useGetTitlesQuery } from '@/features/catalog/catalog-api'
import { LAB_TITLES_QUERY } from './query'

/**
 * /lab: every design token and motion primitive on one page, with real catalog data.
 * Used to check the design system (and reduced motion) before building real pages on it.
 */
export function Lab() {
  const { data } = useGetTitlesQuery(LAB_TITLES_QUERY)
  const titles = data?.data.results ?? []
  const withBackdrop = titles.filter((t) => t.backdropUrl)
  const hero = withBackdrop[0]
  const band = withBackdrop[1]

  return (
    <>
      <ScrollProgress />
      <PinnedHero title={hero} />
      <TokensSection />
      <TypeSection />
      <GlassSection title={band ?? hero} />
      <StaggerSection titles={titles} />
      <ParallaxBand title={band} />
      <MotionSettings />
    </>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
      {children}
    </p>
  )
}

function Backdrop({
  title,
  className,
  priority = false,
}: {
  title?: TitleCard
  className?: string
  priority?: boolean
}) {
  if (!title?.backdropUrl) {
    return <div aria-hidden='true' className={cn('bg-muted', className)} />
  }
  return (
    <img
      src={title.backdropUrl}
      alt=''
      width={1280}
      height={720}
      fetchPriority={priority ? 'high' : 'auto'}
      loading={priority ? 'eager' : 'lazy'}
      decoding='async'
      className={cn('size-full object-cover', className)}
    />
  )
}

// ---------------------------------------------------------------- pinned hero

function PinnedHero({ title }: { title?: TitleCard }) {
  const { reduced } = useMotion()

  return (
    <PinnedSection>
      {/* the backdrop eases in a little as you scroll; the copy lifts and fades */}
      <div
        className='absolute inset-0'
        style={
          reduced
            ? undefined
            : { transform: 'scale(calc(1 + var(--progress) * 0.08))' }
        }
      >
        <Backdrop title={title} priority />
      </div>
      <div aria-hidden='true' className='absolute inset-0 scrim-bottom' />
      <div aria-hidden='true' className='absolute inset-0 scrim-left' />

      <div
        className='relative shell flex h-full min-h-svh flex-col justify-end pt-32 pb-[14svh]'
        style={
          reduced
            ? undefined
            : {
                opacity: 'calc(1 - var(--progress) * 1.5)',
                transform: 'translate3d(0, calc(var(--progress) * -10svh), 0)',
              }
        }
      >
        <Reveal fade={false}>
          <Eyebrow>Design system · Lab</Eyebrow>
        </Reveal>
        {/* the LCP element: visible from the first paint, it only slides into place */}
        <Reveal delay={80} fade={false}>
          <h1 className='mt-5 max-w-[11ch] font-display text-display-1 font-bold'>
            Every frame, in motion.
          </h1>
        </Reveal>
        <Reveal delay={160} fade={false}>
          <p className='mt-6 max-w-xl text-lg leading-relaxed text-foreground/80'>
            This hero is pinned while you scroll, then hands over to the
            sections below. Every token and motion primitive the stream pages
            use is on this page.
          </p>
        </Reveal>
        {title && (
          <Reveal delay={240} fade={false}>
            <p className='mt-8 text-sm text-muted-foreground'>
              Backdrop: {title.title}
              {title.year ? ` (${title.year})` : ''}
            </p>
          </Reveal>
        )}
      </div>
    </PinnedSection>
  )
}

// ---------------------------------------------------------------- tokens

const SWATCHES = [
  { name: 'background', className: 'bg-background' },
  { name: 'card', className: 'bg-card' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'glow-1', className: 'bg-glow-1' },
  { name: 'glow-2', className: 'bg-glow-2' },
  { name: 'glow-3', className: 'bg-glow-3' },
  { name: 'foreground', className: 'bg-foreground' },
]

function TokensSection() {
  return (
    <section className='shell py-28'>
      <Reveal>
        <Eyebrow>Colour</Eyebrow>
        <h2 className='mt-4 font-display text-display-2 font-bold'>
          Near-black, lit warm.
        </h2>
      </Reveal>
      <Stagger className='mt-12 flex flex-wrap gap-4'>
        {SWATCHES.map((s) => (
          <div key={s.name} className='w-[calc(50%-0.5rem)] sm:w-36'>
            <div
              className={cn(
                'h-24 rounded-2xl border border-border',
                s.className
              )}
            />
            <p className='mt-2 font-mono text-xs text-muted-foreground'>
              {s.name}
            </p>
          </div>
        ))}
      </Stagger>
      <Reveal className='mt-10'>
        <div className='h-3 rounded-full bg-stream-gradient' />
        <p className='mt-2 font-mono text-xs text-muted-foreground'>
          stream-gradient: accents only (bars, dots, highlights), never text
        </p>
      </Reveal>
    </section>
  )
}

// ---------------------------------------------------------------- type

function TypeSection() {
  return (
    <section className='shell border-t border-border py-28'>
      <Reveal>
        <Eyebrow>Type</Eyebrow>
      </Reveal>
      <Stagger className='mt-10 space-y-10' step={90}>
        <div>
          <p className='font-display text-display-1 font-bold'>Display 1</p>
          <p className='mt-2 font-mono text-xs text-muted-foreground'>
            text-display-1 · Bricolage Grotesque 700 · hero titles
          </p>
        </div>
        <div>
          <p className='font-display text-display-2 font-bold'>Display 2</p>
          <p className='mt-2 font-mono text-xs text-muted-foreground'>
            text-display-2 · section headings
          </p>
        </div>
        <div>
          <p className='font-display text-display-3 font-semibold'>
            Display 3, for rail headings
          </p>
          <p className='mt-2 font-mono text-xs text-muted-foreground'>
            text-display-3
          </p>
        </div>
        <div>
          <Eyebrow>Eyebrow label</Eyebrow>
          <p className='mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80'>
            Body copy is Inter. It stays at a comfortable 17 to 18 pixels with
            generous line height, so synopses read easily over dark backdrops.
          </p>
        </div>
      </Stagger>
    </section>
  )
}

// ---------------------------------------------------------------- glass

function GlassSection({ title }: { title?: TitleCard }) {
  return (
    <section className='shell py-28'>
      <Reveal>
        <Eyebrow>Surfaces</Eyebrow>
        <h2 className='mt-4 font-display text-display-2 font-bold'>
          Glass over pictures.
        </h2>
      </Reveal>
      <Reveal className='relative mt-12 overflow-hidden rounded-3xl border border-border'>
        <div className='aspect-[16/9] sm:aspect-[21/9]'>
          <Backdrop title={title} />
        </div>
        <div className='absolute inset-0 flex flex-col items-start justify-end gap-4 p-4 sm:flex-row sm:items-end sm:p-8'>
          <div className='max-w-sm rounded-2xl glass p-5'>
            <p className='font-semibold'>glass</p>
            <p className='mt-1 text-sm text-foreground/75'>
              Navbar, chips and controls over imagery.
            </p>
          </div>
          <div className='max-w-sm rounded-2xl glass-strong p-5'>
            <p className='font-semibold'>glass-strong</p>
            <p className='mt-1 text-sm text-foreground/75'>
              Menus, modals and anything holding long text.
            </p>
          </div>
        </div>
      </Reveal>
      <Reveal className='mt-10 flex flex-wrap gap-3'>
        <Button size='lg' className='rounded-full px-7'>
          Play
        </Button>
        <Button size='lg' variant='secondary' className='rounded-full px-7'>
          More info
        </Button>
        <Button size='lg' variant='outline' className='rounded-full px-7'>
          My list
        </Button>
        <Button size='lg' variant='ghost' className='rounded-full px-7'>
          Trailer
        </Button>
      </Reveal>
    </section>
  )
}

// ---------------------------------------------------------------- stagger

function StaggerSection({ titles }: { titles: TitleCard[] }) {
  const posters = titles.filter((t) => t.posterUrl).slice(0, 10)

  return (
    <section className='py-28'>
      <div className='shell'>
        <Reveal>
          <Eyebrow>Stagger</Eyebrow>
          <h2 className='mt-4 font-display text-display-3 font-semibold'>
            Popular right now
          </h2>
        </Reveal>
      </div>
      {/* a rail, not a grid: scrolls sideways, posters arrive one after another */}
      <Stagger
        key={posters.length}
        as='ul'
        // scroll-px matches the shell gutter, so snapping keeps the first poster off the screen edge
        className='shell mt-8 no-scrollbar flex snap-x scroll-px-[clamp(1.25rem,4vw,3rem)] gap-4 overflow-x-auto pb-4'
        step={60}
      >
        {(posters.length ? posters : Array.from({ length: 8 }, () => null)).map(
          (t, i) => (
            <li key={t?.id ?? i} className='w-36 shrink-0 snap-start sm:w-44'>
              <div className='aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted'>
                {t && (
                  <img
                    src={t.posterUrl}
                    alt=''
                    width={780}
                    height={1170}
                    loading='lazy'
                    decoding='async'
                    className='size-full object-cover'
                  />
                )}
              </div>
              <p className='mt-2 truncate text-sm text-foreground/85'>
                {t?.title ?? ' '}
              </p>
            </li>
          )
        )}
      </Stagger>
    </section>
  )
}

// ---------------------------------------------------------------- parallax

function ParallaxBand({ title }: { title?: TitleCard }) {
  return (
    <section className='relative h-[80svh] min-h-[28rem]'>
      <Parallax className='absolute inset-0' amount={12}>
        <Backdrop title={title} />
      </Parallax>
      <div aria-hidden='true' className='absolute inset-0 scrim-bottom' />
      <div className='relative shell flex h-full flex-col justify-end pb-16'>
        <Reveal>
          <Eyebrow>Parallax</Eyebrow>
          <p className='mt-4 max-w-[16ch] font-display text-display-2 font-bold'>
            {title?.title ?? 'Backdrops drift against the scroll.'}
          </p>
          {title?.tagline && (
            <p className='mt-4 max-w-lg text-lg text-foreground/80'>
              {title.tagline}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- motion settings

const PREFERENCES: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Follow system' },
  { value: 'reduce', label: 'Reduce' },
  { value: 'full', label: 'Full' },
]

function MotionSettings() {
  const { reduced, systemReduced, preference, setPreference, smoothScroll } =
    useMotion()

  return (
    <section className='shell py-28'>
      <Reveal>
        <Eyebrow>Reduced motion</Eyebrow>
        <h2 className='mt-4 font-display text-display-3 font-semibold'>
          Check every primitive both ways.
        </h2>
      </Reveal>
      <Reveal className='mt-10 max-w-2xl rounded-3xl glass p-6 sm:p-8'>
        <fieldset>
          <legend className='text-sm text-muted-foreground'>
            Motion on this device
          </legend>
          <div className='mt-4 flex flex-wrap gap-2'>
            {PREFERENCES.map((p) => (
              <label
                key={p.value}
                className={cn(
                  'cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  preference === p.value
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border text-foreground/80 hover:bg-accent'
                )}
              >
                <input
                  type='radio'
                  name='motion'
                  value={p.value}
                  checked={preference === p.value}
                  onChange={() => setPreference(p.value)}
                  className='sr-only'
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <dl className='mt-8 grid grid-cols-3 gap-4 text-sm'>
          <div>
            <dt className='text-muted-foreground'>System asks</dt>
            <dd className='mt-1 font-medium'>
              {systemReduced ? 'Reduce' : 'No preference'}
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>In effect</dt>
            <dd className='mt-1 font-medium' data-testid='motion-state'>
              {reduced ? 'Reduced' : 'Full'}
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Smooth scroll</dt>
            <dd className='mt-1 font-medium'>{smoothScroll ? 'On' : 'Off'}</dd>
          </div>
        </dl>
        <p className='mt-8 text-sm leading-relaxed text-muted-foreground'>
          Reduced: no smooth scroll, no pinning, no parallax, no transforms.
          Reveals become plain fades. Reload after switching to see the pinned
          hero without its extra scroll length.
        </p>
      </Reveal>
      <Reveal className='mt-10'>
        <Link
          to='/lab/next'
          className='inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline'
        >
          Next: route transitions →
        </Link>
      </Reveal>
    </section>
  )
}
