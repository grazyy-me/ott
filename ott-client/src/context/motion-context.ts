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
  /** Whether Lenis smooth scrolling is running (it is off while motion is reduced) */
  smoothScroll: boolean
  /** The live Lenis instance, for scrollTo and friends; null while motion is reduced */
  getLenis: () => Lenis | null
  /** Stops smooth scrolling (modals, player). Returns the matching unlock; locks nest. */
  lockScroll: () => () => void
}

export const MotionContext = createContext<MotionContextValue | null>(null)
