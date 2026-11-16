import { useLayoutEffect, useRef } from 'react'
import { animate, onScroll } from 'animejs'
import { cn } from '@/lib/utils'
import { useMotion } from './use-motion'

/**
 * A thin accent bar along the top of the screen that fills as the page scrolls (anime.js onScroll, synced).
 * Not rendered with reduced motion.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar || reduced) return
    const animation = animate(bar, {
      scaleX: [0, 1],
      ease: 'linear',
      autoplay: onScroll({
        target: document.documentElement,
        enter: { target: 'top', container: 'top' },
        leave: { target: 'bottom', container: 'bottom' },
        sync: true,
      }),
    })
    return () => {
      animation.revert()
    }
  }, [reduced])

  if (reduced) return null
  return (
    <div
      ref={ref}
      aria-hidden='true'
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 origin-left scale-x-0 bg-stream-gradient',
        className
      )}
    />
  )
}
