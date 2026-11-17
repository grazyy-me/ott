import { useEffect, useRef, type RefObject } from 'react'
import { onScroll } from 'animejs'

/**
 * Scroll ranges shared by the scroll hooks:
 * - "through": from the trigger's top entering at the bottom of the screen until its bottom leaves at the top
 * - "out":     from the trigger's top at the top of the screen until its bottom leaves at the top (page heroes)
 * - "pin":     from the trigger's top at the top of the screen until its bottom reaches the bottom (pinned sections)
 */
export type ScrollRange = 'through' | 'out' | 'pin'

export const scrollRange = (range: ScrollRange) =>
  range === 'through'
    ? {
        enter: { target: 'top', container: 'bottom' },
        leave: { target: 'bottom', container: 'top' },
      }
    : range === 'out'
      ? {
          enter: { target: 'top', container: 'top' },
          leave: { target: 'bottom', container: 'top' },
        }
      : {
          enter: { target: 'top', container: 'top' },
          leave: { target: 'bottom', container: 'bottom' },
        }

/**
 * Calls `onProgress(0..1)` as `trigger` scrolls through `range`, synced to the smooth-scroll frame.
 * Write styles directly in the callback (no React state per frame).
 */
export function useScrollProgress(
  trigger: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  {
    range = 'through',
    disabled = false,
  }: { range?: ScrollRange; disabled?: boolean } = {}
) {
  const callback = useRef(onProgress)
  useEffect(() => {
    callback.current = onProgress
  })

  // a passive effect, not a layout effect: a trigger ref on a parent component is only attached after the
  // children's layout effects have run (e.g. a hero mounting in the same commit as its page's wrapper)
  useEffect(() => {
    const el = trigger.current
    if (!el || disabled) return
    let last = -1
    const report = (p: number) => {
      const clamped = Math.min(1, Math.max(0, p))
      if (clamped === last) return
      last = clamped
      callback.current(clamped)
    }
    const observer = onScroll({
      target: el,
      ...scrollRange(range),
      sync: true,
      onUpdate: (self) => report(self.progress),
    })
    // onUpdate only fires while the observer is in range, so a jump past either end (Home link, scroll
    // restoration, a fast fling) could leave the last value stuck mid-way. The container's scrollY is updated
    // on every scroll event, so derive progress from it as well; this listener runs after anime.js's own.
    const fromContainer = () => {
      const { container, offsetStart, distance } = observer
      if (distance) report((container.scrollY - offsetStart) / distance)
    }
    window.addEventListener('scroll', fromContainer, { passive: true })
    fromContainer()
    return () => {
      window.removeEventListener('scroll', fromContainer)
      observer.revert()
    }
  }, [trigger, range, disabled])
}
