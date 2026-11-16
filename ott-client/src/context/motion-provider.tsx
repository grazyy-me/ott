import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { MotionContext, type MotionPreference } from './motion-context'

const QUERY = '(prefers-reduced-motion: reduce)'
const STORAGE_KEY = 'motion-preference'

const readPreference = (): MotionPreference => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'reduce' || value === 'full' ? value : 'system'
  } catch {
    return 'system'
  }
}

/**
 * The one place smooth scrolling lives. Wrap stream pages in this (StreamLayout does).
 * - Lenis runs only when motion is not reduced, and is destroyed as soon as it becomes reduced.
 * - Sets html[data-motion="reduce" | "full"] so CSS can react too.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia(QUERY).matches
  )
  const [preference, setPreferenceState] =
    useState<MotionPreference>(readPreference)
  // a ref, not state: nothing renders differently because of the instance itself
  const lenisRef = useRef<Lenis | null>(null)
  const locks = useRef(0)

  const reduced =
    preference === 'reduce' || (preference === 'system' && systemReduced)

  // follow the OS setting live
  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = reduced ? 'reduce' : 'full'
    return () => {
      delete root.dataset.motion
    }
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.12,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    })
    if (locks.current > 0) instance.stop()
    lenisRef.current = instance
    return () => {
      instance.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  const getLenis = useCallback(() => lenisRef.current, [])

  const setPreference = useCallback((next: MotionPreference) => {
    setPreferenceState(next)
    try {
      if (next === 'system') window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage blocked: the choice still applies for this visit
    }
  }, [])

  const lockScroll = useCallback(() => {
    locks.current += 1
    lenisRef.current?.stop()
    let released = false
    return () => {
      if (released) return
      released = true
      locks.current = Math.max(0, locks.current - 1)
      if (locks.current === 0) lenisRef.current?.start()
    }
  }, [])

  const value = useMemo(
    () => ({
      reduced,
      systemReduced,
      preference,
      setPreference,
      smoothScroll: !reduced,
      getLenis,
      lockScroll,
    }),
    [reduced, systemReduced, preference, setPreference, getLenis, lockScroll]
  )

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  )
}
