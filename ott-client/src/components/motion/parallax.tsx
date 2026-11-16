import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { animate, onScroll, type JSAnimation } from 'animejs'
import { cn } from '@/lib/utils'
import { useMotion } from './use-motion'

type ParallaxProps = {
  children: ReactNode
  /** Sizes and positions the window; it clips its content (e.g. "absolute inset-0" or "h-[70svh]") */
  className?: string
  /** How far the layer travels, as a % of the window height, each way. 8 to 15 reads well for backdrops. */
  amount?: number
}

/**
 * A clipped window whose content drifts against the scroll, tied 1:1 to scroll position (anime.js onScroll, synced).
 * The layer is oversized by `amount` above and below, so its edges never show.
 * Reduced motion: the layer sits still.
 */
export function Parallax({ children, className, amount = 12 }: ParallaxProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const frame = windowRef.current
    const layer = layerRef.current
    if (!frame || !layer || reduced) return

    let animation: JSAnimation | undefined
    const build = () => {
      animation?.revert()
      const shift = (frame.offsetHeight * amount) / 100
      animation = animate(layer, {
        y: [-shift, shift],
        ease: 'linear',
        autoplay: onScroll({
          target: frame,
          // from the moment the window's top enters at the bottom until its bottom leaves at the top
          enter: { target: 'top', container: 'bottom' },
          leave: { target: 'bottom', container: 'top' },
          sync: true,
        }),
      })
    }
    build()

    // the shift depends on the window's height
    let lastHeight = frame.offsetHeight
    const resize = new ResizeObserver(() => {
      if (frame.offsetHeight === lastHeight) return
      lastHeight = frame.offsetHeight
      build()
    })
    resize.observe(frame)

    return () => {
      resize.disconnect()
      animation?.revert()
    }
  }, [reduced, amount])

  return (
    <div ref={windowRef} className={cn('overflow-hidden', className)}>
      <div
        ref={layerRef}
        className='absolute inset-x-0 will-change-transform'
        style={{ top: `-${amount}%`, bottom: `-${amount}%` }}
      >
        {children}
      </div>
    </div>
  )
}
