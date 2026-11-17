import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { onScroll, type ScrollObserver } from 'animejs'
import { cn } from '@/lib/utils'
import { useCoarsePointer, useMotion } from './use-motion'

type PinnedSectionProps = {
  children: ReactNode
  /** Scroll distance, in screen heights, that the content stays pinned for. Keep it short: 1 to 1.5. */
  length?: number
  /** Same on touch devices; shorter by default, because long pins feel like scroll-jacking there */
  touchLength?: number
  className?: string
  /** Classes for the pinned, full-screen stage */
  stageClassName?: string
  /** 0 to 1 while the section scrolls past. Prefer the CSS variable for visuals (no re-render). */
  onProgress?: (progress: number) => void
}

/**
 * Pins a full-screen stage while the page scrolls `length` screens, and exposes the progress as
 * the CSS variable `--progress` (0 to 1) on the stage, so children can drive visuals with calc().
 * Progress is synced to scroll position through anime.js onScroll.
 * Reduced motion: no pin, no extra scroll distance, and `--progress` stays 0.
 */
export function PinnedSection({
  children,
  length = 1.25,
  touchLength = 0.6,
  className,
  stageClassName,
  onProgress,
}: PinnedSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()
  const coarse = useCoarsePointer()
  const progressRef = useRef(onProgress)
  useLayoutEffect(() => {
    progressRef.current = onProgress
  })

  const pinLength = coarse ? touchLength : length

  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return
    stage.style.setProperty('--progress', '0')
    if (reduced || pinLength <= 0) return

    const observer: ScrollObserver = onScroll({
      target: section,
      // pinned from the section's top reaching the top of the screen until its bottom reaches the bottom
      enter: { target: 'top', container: 'top' },
      leave: { target: 'bottom', container: 'bottom' },
      sync: true,
      onUpdate: (self) => {
        const p = Math.min(1, Math.max(0, self.progress))
        stage.style.setProperty('--progress', p.toFixed(4))
        progressRef.current?.(p)
      },
    })

    return () => {
      observer.revert()
      stage.style.setProperty('--progress', '0')
    }
  }, [reduced, pinLength])

  const pinned = !reduced && pinLength > 0

  return (
    <section
      ref={sectionRef}
      className={cn('relative', className)}
      // the extra height is the scroll distance the stage stays pinned for; fixed at first render, so no shift
      style={pinned ? { height: `${(1 + pinLength) * 100}svh` } : undefined}
    >
      <div
        ref={stageRef}
        className={cn(
          'relative min-h-svh overflow-hidden',
          pinned && 'sticky top-0 h-svh',
          stageClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}
