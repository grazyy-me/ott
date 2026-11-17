import { useState, type ReactNode } from 'react'
import {
  UNSAFE_LocationContext as LocationContext,
  useLocation,
  useNavigationType,
  useOutlet,
  type Location,
} from 'react-router'
import { AnimatePresence, m } from 'framer-motion'
import { useMotion } from './use-motion'

const EASE = [0.16, 1, 0.3, 1] as const

// Keeps the outlet it was first rendered with, so the page that is leaving keeps showing its own content
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

/** Makes the page underneath a modal read its own location (search params and all), not the modal's URL */
function AtLocation({
  location,
  children,
}: {
  location?: Location
  children: ReactNode
}) {
  const navigationType = useNavigationType()
  const current = useLocation()
  // always the same element type: switching between a provider and bare children would remount the page
  return (
    <LocationContext.Provider
      value={{ location: location ?? current, navigationType }}
    >
      {children}
    </LocationContext.Provider>
  )
}

/**
 * Cross-fades between stream pages (framer-motion: route and modal transitions only, per CLAUDE.md).
 * Needs a <LazyMotion> ancestor (StreamLayout provides it).
 * `pageLocation`: while a title modal is open, the page it was opened from; that page stays mounted and
 * still (no transition) underneath.
 * Reduced motion: a short opacity fade, no movement.
 */
export function RouteTransition({ pageLocation }: { pageLocation?: Location }) {
  const current = useLocation()
  const location = pageLocation ?? current
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
        <AtLocation location={pageLocation}>
          <FrozenOutlet />
        </AtLocation>
      </m.div>
    </AnimatePresence>
  )
}
