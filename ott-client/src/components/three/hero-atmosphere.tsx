import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { cn } from '@/lib/utils'
import { useCoarsePointer, useMotion } from '@/components/motion'

// the Three.js bundle only loads on pages that show the hero, after first paint
const HeroScene = lazy(() => import('./hero-scene'))

type DeviceHints = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

/** WebGL available, and the device isn't low-end or asking to save data */
function canRunScene() {
  const nav = navigator as DeviceHints
  if (nav.connection?.saveData) return false
  if ((nav.hardwareConcurrency ?? 8) < 4) return false
  if ((nav.deviceMemory ?? 8) < 4) return false
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

/** Runs `run` once the browser is idle, but no sooner than `minDelay` ms. Returns a cancel function. */
const afterIdle = (run: () => void, minDelay = 0) => {
  let idleId = 0
  const timer = window.setTimeout(
    () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(run, { timeout: 2500 })
      } else {
        run()
      }
    },
    Math.max(
      minDelay,
      typeof window.requestIdleCallback === 'function' ? 0 : 1200
    )
  )
  return () => {
    window.clearTimeout(timer)
    if (idleId) window.cancelIdleCallback(idleId)
  }
}

/**
 * The light-and-dust layer over the home hero's backdrop.
 * Always renders a soft token-coloured gradient; on capable devices with full motion it then lazy-loads the
 * Three.js scene once the browser is idle, and fades it in. The scene renders only while the hero is on
 * screen and the tab is visible. Reduced motion, no WebGL, or a low-end device: the gradient alone.
 */
export function HeroAtmosphere({
  progressRef,
  className,
}: {
  /** 0..1 as the hero scrolls away */
  progressRef: RefObject<number>
  className?: string
}) {
  const { reduced } = useMotion()
  const coarse = useCoarsePointer()
  const [capable] = useState(canRunScene)
  const enabled = capable && !reduced
  const [load, setLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!enabled) return
    // phones: keep the Three.js parse (~330 ms at 4x CPU) out of the busy first seconds after load
    return afterIdle(() => setLoad(true), coarse ? 3500 : 0)
  }, [enabled, coarse])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return
    const io = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting)
    )
    io.observe(root)
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    // the overlay content takes the pointer events, so listen on the window
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [enabled])

  return (
    <div
      ref={rootRef}
      aria-hidden='true'
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      {/* the fallback, and the base the scene sits on */}
      <div className='absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,color-mix(in_oklch,var(--stream-glow-1)_22%,transparent),transparent_70%),radial-gradient(50%_45%_at_85%_20%,color-mix(in_oklch,var(--stream-glow-3)_20%,transparent),transparent_70%)]' />
      {enabled && load && (
        <Suspense fallback={null}>
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-[1200ms]',
              ready ? 'opacity-100' : 'opacity-0'
            )}
          >
            <HeroScene
              active={onScreen && pageVisible}
              progressRef={progressRef}
              pointerRef={pointerRef}
              particleCount={coarse ? 500 : 1200}
              onReady={() => setReady(true)}
            />
          </div>
        </Suspense>
      )}
    </div>
  )
}
