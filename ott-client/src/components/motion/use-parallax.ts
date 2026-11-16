import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useMotion } from './use-motion'
import { useScrollProgress, type ScrollRange } from './use-scroll-progress'

export type ParallaxOptions = {
  /** What drives the movement; defaults to the element's parent */
  trigger?: RefObject<HTMLElement | null>
  /**
   * How far it moves over the range, as a share of the trigger's height (re-measured on resize).
   * Positive moves down, so the element lags behind the page ("slower"); negative moves it up ("faster").
   */
  ratio?: number
  /** Or a fixed distance in px (used when `ratio` is not set) */
  distance?: number
  /** "through" (default) centres the movement (-d/2 to +d/2); "out" and "pin" go 0 to d */
  range?: ScrollRange
  disabled?: boolean
}

/**
 * Moves `ref` vertically, tied 1:1 to scroll position. Built on useScrollProgress (anime.js onScroll, synced
 * with Lenis in the same frame, and settling exactly at 0 or 1 after a jump), writing the transform directly.
 * (A scroll-linked anime.js animation did not advance for a pinned-wrapper trigger, so this avoids it.)
 * Off with reduced motion.
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  {
    trigger,
    ratio,
    distance = 0,
    range = 'through',
    disabled = false,
  }: ParallaxOptions
) {
  const { reduced } = useMotion()
  const off = reduced || disabled
  const parentRef = useRef<HTMLElement | null>(null)
  const driverHeight = useRef(0)

  // the default trigger is the element's parent; track the trigger's height for `ratio`
  // passive effect: a trigger ref on a parent component is attached only after this component's layout effects
  useEffect(() => {
    parentRef.current = ref.current?.parentElement ?? null
    const driver = trigger?.current ?? parentRef.current
    if (!driver) return
    driverHeight.current = driver.offsetHeight
    const resize = new ResizeObserver(() => {
      driverHeight.current = driver.offsetHeight
    })
    resize.observe(driver)
    return () => resize.disconnect()
  }, [ref, trigger])

  // clear the offset when turned off (reduced motion switched on, or disabled)
  useLayoutEffect(() => {
    const el = ref.current
    if (off && el) el.style.transform = ''
  }, [ref, off])

  useScrollProgress(
    trigger ?? parentRef,
    (p) => {
      const el = ref.current
      if (!el) return
      const d = ratio !== undefined ? driverHeight.current * ratio : distance
      const [from, to] = range === 'through' ? [-d / 2, d / 2] : [0, d]
      el.style.transform = `translate3d(0, ${(from + (to - from) * p).toFixed(2)}px, 0)`
    },
    { range, disabled: off }
  )
}
