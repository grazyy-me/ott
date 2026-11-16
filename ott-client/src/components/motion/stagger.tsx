import {
  useLayoutEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { animate, stagger, type JSAnimation } from 'animejs'
import { useMotion } from './use-motion'

type StaggerProps = {
  as?: ElementType
  children: ReactNode
  className?: string
  /** ms between items */
  step?: number
  /** ms before the first item */
  delay?: number
  /** px each item rises from; ignored with reduced motion */
  y?: number
  /** Animate these descendants instead of the direct children */
  selector?: string
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>

/**
 * Reveals its children one after another the first time the group scrolls into view.
 * Reduced motion: quick opacity fades only.
 */
export function Stagger({
  as: Tag = 'div',
  children,
  className,
  step = 70,
  delay = 0,
  y = 28,
  selector,
  ...rest
}: StaggerProps) {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(
      selector ? root.querySelectorAll<HTMLElement>(selector) : root.children
    ) as HTMLElement[]
    if (!items.length) return

    for (const item of items) {
      item.style.opacity = '0'
      item.style.transform = reduced ? '' : `translate3d(0, ${y}px, 0)`
    }

    let animation: JSAnimation | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        animation = reduced
          ? animate(items, {
              opacity: [0, 1],
              duration: 400,
              delay: stagger(Math.min(step, 40), { start: delay }),
              ease: 'linear',
            })
          : animate(items, {
              opacity: [0, 1],
              y: [y, 0],
              duration: 900,
              delay: stagger(step, { start: delay }),
              ease: 'outExpo',
            })
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(root)

    return () => {
      observer.disconnect()
      animation?.revert()
      for (const item of items) {
        item.style.opacity = ''
        item.style.transform = ''
      }
    }
    // children: re-run when the item list changes (e.g. data arrives)
  }, [reduced, step, delay, y, selector, children])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
