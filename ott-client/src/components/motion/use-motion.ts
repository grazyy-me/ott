import { useContext, useEffect, useState } from 'react'
import { MotionContext } from '@/context/motion-context'

export function useMotion() {
  const value = useContext(MotionContext)
  if (!value) throw new Error('useMotion must be used inside <MotionProvider>')
  return value
}

/** Stops smooth scrolling while `active` is true (open modal, player). */
export function useScrollLock(active: boolean) {
  const { lockScroll } = useMotion()
  useEffect(() => {
    if (!active) return
    return lockScroll()
  }, [active, lockScroll])
}

/** True on touch-first devices: pinned sections get shorter there */
export function useCoarsePointer() {
  const [coarse] = useState(
    () => window.matchMedia('(pointer: coarse)').matches
  )
  return coarse
}
