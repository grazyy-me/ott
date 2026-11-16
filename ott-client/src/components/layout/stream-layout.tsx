import { useLayoutEffect } from 'react'
import { LazyMotion } from 'framer-motion'
import { RouteTransition, useSmoothScroll } from '@/components/motion'
import { SkipToMain } from '@/components/skip-to-main'
import { Grain } from '@/components/stream/grain'
import { StreamFooter } from '@/components/stream/stream-footer'
import { StreamNav } from '@/components/stream/stream-nav'

const loadFramerFeatures = () =>
  import('@/components/motion/framer-features').then((m) => m.default)

/**
 * Public shell for every stream page: dark stream tokens, smooth scroll, grain, floating nav, footer,
 * and cross-faded page changes. It starts the app's one Lenis loop (useSmoothScroll; the instance lives in
 * the root MotionProvider). Lazy-loaded by the router, so the motion libraries stay out of the
 * sign-in and admin bundles.
 */
export function StreamLayout() {
  // switch the document to the stream tokens (stream.css) before the first paint
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'stream'
    return () => {
      delete root.dataset.surface
    }
  }, [])

  useSmoothScroll()

  return (
    <>
      <LazyMotion features={loadFramerFeatures} strict>
        <SkipToMain />
        <Grain />
        <StreamNav />
        <main id='content' tabIndex={-1} className='relative outline-none'>
          <RouteTransition />
        </main>
        <StreamFooter />
      </LazyMotion>
    </>
  )
}
