/*
 * Adapted from "Scroll-Triggered Video Hero" by daiwiikharihar on 21st.dev:
 * https://21st.dev/@daiwiikharihar/components/scroll-triggered-video-hero
 * Changes: framer-motion (useScroll, useSpring, whileInView) replaced by anime.js onScroll plus the shared
 * Reveal primitive; the chapter pill was `position: fixed` for the whole page, now it lives inside the section;
 * chapters take a picture and an optional muted clip (TMDB has backdrops, not clips); the component's own
 * film grain is dropped (the layout has one); stream tokens and accent gradient.
 * Reduced motion: no sticky stage; each chapter is its own full-height block with its picture.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { onScroll } from 'animejs'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal, useMotion } from '@/components/motion'

export type Chapter = {
  id: string
  eyebrow: string
  title: string
  description: string
  image: string
  /** Optional muted looping clip; never played with reduced motion */
  videoSrc?: string
  href?: string
  cta?: string
}

const RING = 2 * Math.PI * 18

function ChapterMedia({
  chapter,
  active,
  reduced,
}: {
  chapter: Chapter
  active: boolean
  reduced: boolean
}) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'absolute inset-0',
        !reduced && 'transition-opacity duration-[1200ms] ease-in-out',
        active ? 'z-10 opacity-100' : 'z-0 opacity-0'
      )}
    >
      {chapter.videoSrc && !reduced ? (
        <video
          src={chapter.videoSrc}
          poster={chapter.image}
          autoPlay
          muted
          loop
          playsInline
          preload='metadata'
          className='size-full object-cover'
        />
      ) : (
        <img
          src={chapter.image}
          alt=''
          loading='lazy'
          decoding='async'
          className='size-full object-cover'
        />
      )}
      <div className='absolute inset-0 scrim-left' />
      <div className='absolute inset-0 bg-background/30' />
    </div>
  )
}

function ChapterCopy({ chapter }: { chapter: Chapter }) {
  return (
    <div className='max-w-3xl'>
      <Reveal className='mb-6 flex items-center gap-4'>
        <span
          className='h-0.5 w-12 rounded-full bg-stream-gradient'
          aria-hidden='true'
        />
        <span className='text-eyebrow font-semibold text-foreground/80 uppercase'>
          {chapter.eyebrow}
        </span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className='font-display text-display-2 font-bold'>
          {chapter.title}
        </h2>
      </Reveal>
      <Reveal delay={160} className='mt-6 max-w-md rounded-2xl glass p-6'>
        <p className='text-lg leading-relaxed text-foreground/85'>
          {chapter.description}
        </p>
      </Reveal>
      {chapter.href && (
        <Reveal delay={240} className='mt-8'>
          <Link
            to={chapter.href}
            className='group inline-flex items-center gap-4 text-sm font-semibold tracking-widest uppercase'
          >
            <span className='relative flex size-12 items-center justify-center overflow-hidden rounded-full border border-foreground/30'>
              <span className='absolute inset-0 translate-y-full bg-foreground transition-transform duration-300 group-hover:translate-y-0 motion-reduce:transition-none' />
              <ChevronRight
                size={20}
                className='relative transition-colors duration-300 group-hover:text-background'
              />
            </span>
            {chapter.cta ?? 'More info'}
          </Link>
        </Reveal>
      )}
    </div>
  )
}

export function ChapterHero({
  chapters,
  label = 'Featured',
}: {
  chapters: Chapter[]
  label?: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const [active, setActive] = useState(0)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reduced || chapters.length === 0) return
    const observer = onScroll({
      target: section,
      enter: { target: 'top', container: 'top' },
      leave: { target: 'bottom', container: 'bottom' },
      sync: true,
      onUpdate: (self) => {
        const p = Math.min(1, Math.max(0, self.progress))
        setActive(
          Math.min(chapters.length - 1, Math.floor(p * chapters.length))
        )
        if (ringRef.current)
          ringRef.current.style.strokeDashoffset = String(RING * (1 - p))
      },
    })
    return () => {
      observer.revert()
    }
  }, [reduced, chapters.length])

  if (chapters.length === 0) return null

  // reduced motion: plain stacked blocks, no sticky stage
  if (reduced) {
    return (
      <section aria-label={label}>
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className='relative flex min-h-svh items-center overflow-hidden'
          >
            <ChapterMedia chapter={chapter} active reduced />
            <div className='relative z-20 shell py-24'>
              <ChapterCopy chapter={chapter} />
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className='relative'
      style={{ height: `${chapters.length * 100}svh` }}
    >
      <div className='sticky top-0 h-svh w-full overflow-hidden'>
        {chapters.map((chapter, i) => (
          <ChapterMedia
            key={chapter.id}
            chapter={chapter}
            active={i === active}
            reduced={false}
          />
        ))}

        {/* chapter pill: scoped to this section */}
        <div className='absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full glass py-2 pr-2 pl-6'>
          <div className='flex min-w-28 flex-col'>
            <span className='text-[10px] tracking-widest text-foreground/60 uppercase'>
              {String(active + 1).padStart(2, '0')} /{' '}
              {String(chapters.length).padStart(2, '0')}
            </span>
            <span className='text-xs font-bold'>
              {chapters[active].eyebrow}
            </span>
          </div>
          <svg
            className='size-12 -rotate-90'
            viewBox='0 0 48 48'
            aria-hidden='true'
          >
            <circle
              cx='24'
              cy='24'
              r='18'
              fill='none'
              strokeWidth='2'
              className='stroke-foreground/15'
            />
            <circle
              ref={ringRef}
              cx='24'
              cy='24'
              r='18'
              fill='none'
              strokeWidth='2'
              strokeLinecap='round'
              className='stroke-glow-1'
              strokeDasharray={RING}
              strokeDashoffset={RING}
            />
          </svg>
        </div>
      </div>

      {/* one screen of copy per chapter, scrolling over the sticky media */}
      <div className='absolute inset-0 z-20'>
        {chapters.map((chapter) => (
          <div key={chapter.id} className='flex h-svh shell items-center'>
            <ChapterCopy chapter={chapter} />
          </div>
        ))}
      </div>
    </section>
  )
}
