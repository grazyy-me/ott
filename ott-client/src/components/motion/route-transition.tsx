import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { AnimatePresence, m } from 'framer-motion'
import { useMotion } from './use-motion'

const EASE = [0.16, 1, 0.3, 1] as const

// Keeps the outlet it was first rendered with, so the page that is leaving keeps showing its own content
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

/**
 * Cross-fades between stream pages (framer-motion: route and modal transitions only, per CLAUDE.md).
 * Needs a <LazyMotion> ancestor (StreamLayout provides it).
 * Reduced motion: a short opacity fade, no movement.
 */
export function RouteTransition() {
  const location = useLocation()
  const { reduced } = useMotion()

  return (
    <AnimatePresence mode='wait' initial={false}>
      <m.div
        key={location.pathname}
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: reduced ? 0.15 : 0.5, ease: EASE },
        }}
        exit={{
          opacity: 0,
          y: reduced ? 0 : -8,
          transition: { duration: reduced ? 0.1 : 0.22, ease: 'easeIn' },
        }}
      >
        <FrozenOutlet />
      </m.div>
    </AnimatePresence>
  )
}
