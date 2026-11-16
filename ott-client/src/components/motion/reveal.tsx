import {
  useLayoutEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { animate, type JSAnimation } from 'animejs'
import { useMotion } from './use-motion'

type RevealProps = {
  as?: ElementType
  children: ReactNode
  className?: string
  /** ms before the reveal starts once in view */
  delay?: number
  /** px it rises from; ignored with reduced motion */
  y?: number
  duration?: number
  /**
   * Default true. Set false for content that must be visible at first paint (the hero title, i.e. the
   * LCP element): it then only slides into place, and with reduced motion it doesn't animate at all.
   */
  fade?: boolean
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>

/**
 * Fades and lifts its content in the first time it scrolls into view.
 * Reduced motion: an opacity fade only, no transform.
 */
export function Reveal({
  as: Tag = 'div',
  children,
  className,
  delay = 0,
  y = 40,
  duration = 1000,
  fade = true,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotion()

  // layout effect: the hidden start state is applied before the first paint, so nothing flashes
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // nothing to do: always visible, and no movement allowed
    if (!fade && reduced) return

    if (fade) el.style.opacity = '0'
    el.style.transform = reduced ? '' : `translate3d(0, ${y}px, 0)`

    let animation: JSAnimation | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        animation = reduced
          ? animate(el, {
              opacity: [0, 1],
              duration: 450,
              delay,
              ease: 'linear',
            })
          : animate(el, {
              ...(fade ? { opacity: [0, 1] } : {}),
              y: [y, 0],
              duration,
              delay,
              ease: 'outExpo',
            })
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      animation?.revert()
      el.style.opacity = ''
      el.style.transform = ''
    }
  }, [reduced, y, delay, duration, fade])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
