import { Children, useRef, type ElementType, type ReactNode } from 'react'
import { useReveal } from './use-reveal'

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

/** Component form of useReveal({ stagger }): reveals its children one after another when it scrolls into view. */
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
  // re-run when the number of items changes (e.g. data arrives), not on every parent render: `children` is a
  // new array each render, and re-running would hide and re-animate items that were already revealed
  const count = Children.count(children)
  useReveal(ref, { stagger: step, delay, y, selector, deps: [count] })
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
