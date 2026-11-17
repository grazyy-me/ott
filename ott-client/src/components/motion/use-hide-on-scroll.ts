/*
 * Adapted from the useHideOnScroll hook in "Hide On Scroll" by ddoemonn on 21st.dev:
 * https://21st.dev/@ddoemonn/components/hide-on-scroll
 * Changes: window scrolling only (Lenis moves the native scroll position, so it works with smooth scroll);
 * "pinned" is applied when reading the result instead of resetting state from an effect.
 */
import { useEffect, useRef, useState } from 'react'

type Options = {
  /** px of continuous downward scroll before it hides */
  hideAfter?: number
  /** px of continuous upward scroll before it shows again */
  revealAfter?: number
  /** within this many px of the top it always shows */
  topGuard?: number
  /** keep it shown (menu open, focus inside it) */
  pinned?: boolean
}

/** Hide on scroll down, show on scroll up. Returns `{ hidden, atTop }`. */
export function useHideOnScroll({
  hideAfter = 14,
  revealAfter = 10,
  topGuard = 80,
  pinned = false,
}: Options = {}) {
  const [hidden, setHidden] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const last = useRef(0)
  const accum = useRef(0)

  useEffect(() => {
    let frame = 0
    const evaluate = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = window.scrollY
      if (y < 0 || y > max) return // overscroll bounce

      const dy = y - last.current
      last.current = y
      const top = y <= topGuard
      setAtTop(top)
      if (top) {
        accum.current = 0
        setHidden(false)
        return
      }
      if (dy === 0) return
      if (dy > 0 !== accum.current > 0) accum.current = 0
      accum.current += dy
      if (accum.current >= hideAfter) {
        accum.current = 0
        setHidden(true)
      } else if (accum.current <= -revealAfter) {
        accum.current = 0
        setHidden(false)
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate)
    }
    last.current = window.scrollY
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [hideAfter, revealAfter, topGuard])

  return { hidden: hidden && !pinned, atTop }
}
