import { Link } from 'react-router'
import { Reveal } from '@/components/motion'

/** Second lab page: navigating between /lab and here shows the RouteTransition cross-fade. */
export function LabNext() {
  return (
    <section className='flex min-h-svh shell flex-col justify-center pt-32 pb-20'>
      <Reveal>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          Route transition
        </p>
      </Reveal>
      <Reveal delay={80}>
        <h1 className='mt-5 max-w-[14ch] font-display text-display-2 font-bold'>
          Pages cross-fade, the shell stays put.
        </h1>
      </Reveal>
      <Reveal delay={160}>
        <p className='mt-6 max-w-xl text-lg leading-relaxed text-foreground/80'>
          The navbar, grain and footer belong to the layout, so only the page
          content changes. With reduced motion this is a short fade with no
          movement.
        </p>
      </Reveal>
      <Reveal delay={240} className='mt-10'>
        <Link
          to='/lab'
          className='inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90'
        >
          ← Back to the lab
        </Link>
      </Reveal>
    </section>
  )
}
