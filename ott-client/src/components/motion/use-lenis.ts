import { useEffect, useRef } from 'react'
import type Lenis from 'lenis'
import { useMotion } from './use-motion'

/**
 * The app's Lenis instance (null with reduced motion or outside stream pages).
 * Pass a callback to run on every smooth-scroll frame, e.g. `useLenis(({ scroll, velocity }) => ...)`.
 * The callback can change between renders without re-subscribing.
 */
export function useLenis(onScroll?: (lenis: Lenis) => void) {
  const { lenis } = useMotion()
  const callback = useRef(onScroll)

  useEffect(() => {
    callback.current = onScroll
  })

  useEffect(() => {
    if (!lenis) return
    const handler = (instance: Lenis) => callback.current?.(instance)
    return lenis.on('scroll', handler)
  }, [lenis])

  return lenis
}
