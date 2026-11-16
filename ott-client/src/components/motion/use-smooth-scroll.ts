import { useEffect } from 'react'
import { engine, scrollContainers } from 'animejs'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useMotion } from './use-motion'

/**
 * Starts the app's one smooth-scroll loop (call it once, in StreamLayout).
 *
 * Every frame, in this order:
 *   1. Lenis advances the scroll position (window.scrollTo),
 *   2. anime.js scroll containers re-read it straight away (not on the next native scroll event),
 *   3. anime.js's engine updates every animation and onScroll observer.
 * So scroll-linked animations read the exact position Lenis just set, in the same frame: no one-frame lag
 * between smooth scrolling and parallax. anime.js's own loop is switched off while this runs.
 *
 * The Lenis instance is handed to the root MotionProvider (useLenis() reads it from there).
 * With reduced motion there is no Lenis, but the loop still drives anime.js.
 */
export function useSmoothScroll() {
  const { reduced, attachLenis } = useMotion()

  useEffect(() => {
    const lenis = reduced
      ? null
      : new Lenis({
          autoRaf: false,
          lerp: 0.12,
          anchors: true,
          allowNestedScroll: true,
          stopInertiaOnNavigate: true,
        })

    // tell anime.js the moment Lenis moves the page
    const syncContainers = () => {
      scrollContainers.forEach((container) => container.handleScroll())
    }
    lenis?.on('scroll', syncContainers)

    engine.useDefaultMainLoop = false
    let frame = 0
    const loop = (time: number) => {
      lenis?.raf(time)
      engine.update()
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    attachLenis(lenis)
    if (import.meta.env.DEV)
      (window as unknown as { __lenis?: Lenis | null }).__lenis = lenis

    return () => {
      cancelAnimationFrame(frame)
      lenis?.destroy()
      attachLenis(null)
      // hand anime.js its own loop back for pages outside the stream shell
      engine.useDefaultMainLoop = true
      engine.wake()
    }
  }, [reduced, attachLenis])
}
