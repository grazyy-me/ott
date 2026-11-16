import { createContext } from 'react'
import type Lenis from 'lenis'

/** "system" follows prefers-reduced-motion; the others force a mode (dev/QA toggle on /lab, or a user setting) */
export type MotionPreference = 'system' | 'reduce' | 'full'

export interface MotionContextValue {
  /** True when motion should be reduced: no smooth scroll, pinning, parallax or transforms; fades only */
  reduced: boolean
  /** What the operating system asks for */
  systemReduced: boolean
  preference: MotionPreference
  setPreference: (preference: MotionPreference) => void
  /** Whether Lenis smooth scrolling is running (only on stream pages, never with reduced motion) */
  smoothScroll: boolean
  /** The app's single Lenis instance, or null when it isn't running. Prefer useLenis(). */
  lenis: Lenis | null
  /** Same, without subscribing to changes (for event handlers) */
  getLenis: () => Lenis | null
  /** Used by useSmoothScroll (StreamLayout) to hand the instance it created to the root */
  attachLenis: (lenis: Lenis | null) => void
  /** Stops smooth scrolling (modals, player). Returns the matching unlock; locks nest. */
  lockScroll: () => () => void
}

export const MotionContext = createContext<MotionContextValue | null>(null)
