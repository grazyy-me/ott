import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useParallax } from './use-parallax'

type ParallaxProps = {
  children: ReactNode
  /** Sizes and positions the window; it clips its content (e.g. "absolute inset-0" or "h-[70svh]") */
  className?: string
  /** How far the layer travels, as a % of the window height, each way. 8 to 15 reads well for backdrops. */
  amount?: number
}

/**
 * Component form of useParallax(): a clipped window whose content drifts against the scroll.
 * The layer is oversized by `amount` above and below, so its edges never show. Still with reduced motion.
 */
export function Parallax({ children, className, amount = 12 }: ParallaxProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  // "through" centres the travel, so ratio 2a/100 means ±a% of the window height
  useParallax(layerRef, { trigger: windowRef, ratio: (amount * 2) / 100 })

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
