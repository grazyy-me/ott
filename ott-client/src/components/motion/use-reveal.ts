import { useLayoutEffect, type RefObject } from 'react'
import { animate, stagger as staggerDelay, type JSAnimation } from 'animejs'
import { useMotion } from './use-motion'

export type RevealOptions = {
  /** px it rises from; ignored with reduced motion */
  y?: number
  /** ms before it starts once in view */
  delay?: number
  duration?: number
  /**
   * Default true. False keeps it fully visible and only slides it (for the LCP element, which must paint
   * at once); with reduced motion it then doesn't animate at all.
   */
  fade?: boolean
  /** ms between items: reveals the children (or `selector` matches) one after another */
  stagger?: number
  selector?: string
  /** Re-run when these change (e.g. the list of items arrived) */
  deps?: unknown[]
}

/**
 * Reveals `ref` (or its children, with `stagger`) the first time it scrolls into view.
 * The hidden start state is applied before the first paint, so nothing flashes.
 * Reduced motion: opacity fades only, no transform.
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  {
    y = 40,
    delay = 0,
    duration = 1000,
    fade = true,
    stagger,
    selector,
    deps = [],
  }: RevealOptions = {}
) {
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const many = stagger !== undefined
    const targets = many
      ? (Array.from(
          selector
            ? root.querySelectorAll<HTMLElement>(selector)
            : root.children
        ) as HTMLElement[])
      : [root]
    if (!targets.length) return
    if (!fade && reduced) return

    for (const t of targets) {
      if (fade) t.style.opacity = '0'
      t.style.transform = reduced ? '' : `translate3d(0, ${y}px, 0)`
    }

    let animation: JSAnimation | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const timing = many
          ? staggerDelay(reduced ? Math.min(stagger, 40) : stagger, {
              start: delay,
            })
          : delay
        animation = reduced
          ? animate(targets, {
              opacity: [0, 1],
              duration: 450,
              delay: timing,
              ease: 'linear',
            })
          : animate(targets, {
              ...(fade ? { opacity: [0, 1] } : {}),
              y: [y, 0],
              duration: many ? Math.min(duration, 900) : duration,
              delay: timing,
              ease: 'outExpo',
            })
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(root)

    return () => {
      observer.disconnect()
      animation?.revert()
      for (const t of targets) {
        t.style.opacity = ''
        t.style.transform = ''
      }
    }
    // deps is the caller's own list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, reduced, y, delay, duration, fade, stagger, selector, ...deps])
}
