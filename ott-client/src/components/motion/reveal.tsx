import { useRef, type ElementType, type ReactNode } from 'react'
import { useReveal } from './use-reveal'

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

/** Component form of useReveal(): fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  as: Tag = 'div',
  children,
  className,
  delay,
  y,
  duration,
  fade,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  useReveal(ref, { delay, y, duration, fade })
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
