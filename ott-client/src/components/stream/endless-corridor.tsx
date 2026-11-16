/*
 * Adapted from "Endless" by helloweblisy on 21st.dev:
 * https://21st.dev/@helloweblisy/components/endless
 * Changes: GSAP replaced by a single anime.js timer that places every plane each frame (CLAUDE.md: no second
 * animation library); the loop pauses while the section is off screen; images, title and caption are props;
 * stream tokens instead of hard-coded black and grey.
 * Reduced motion: the corridor is laid out once and stays still.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createTimer, type Timer } from 'animejs'
import { cn } from '@/lib/utils'
import { useMotion } from '@/components/motion'

const Z_FAR = -2400
const Z_NEAR = 780
const RANGE = Z_NEAR - Z_FAR
const LOOP_MS = 16000
const FADE_IN = 0.06
const FADE_OUT = 0.04

const opacityFor = (progress: number) => {
  if (progress < FADE_IN) return Math.max(0, progress / FADE_IN)
  if (progress > 1 - FADE_OUT) return Math.max(0, (1 - progress) / FADE_OUT)
  return 1
}

const layoutFor = (width: number) => {
  const planeW =
    width < 768 ? Math.min(width * 0.26, 200) : Math.min(width * 0.26, 440)
  return { planeW, planeH: planeW * (4 / 3), offsetX: width * 0.33, angle: 24 }
}

type EndlessCorridorProps = {
  /** Portrait pictures (posters work well); 10 to 14 reads best */
  images: string[]
  title: ReactNode
  caption?: ReactNode
  className?: string
}

export function EndlessCorridor({
  images,
  title,
  caption,
  className,
}: EndlessCorridorProps) {
  const rootRef = useRef<HTMLElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const root = rootRef.current
    const world = worldRef.current
    if (!root || !world) return
    const planes = Array.from(
      world.querySelectorAll<HTMLElement>('[data-plane]')
    )
    const total = planes.length
    if (!total) return

    let layout = layoutFor(root.clientWidth)
    const size = () => {
      layout = layoutFor(root.clientWidth)
      for (const plane of planes) {
        plane.style.width = `${layout.planeW}px`
        plane.style.height = `${layout.planeH}px`
      }
    }

    // where every plane is at loop progress t (each starts 1/total further along)
    const place = (t: number) => {
      planes.forEach((plane, i) => {
        const p = (t + i / total) % 1
        const left = i % 2 === 0
        const x = left ? -layout.offsetX : layout.offsetX
        const z = Z_FAR + p * RANGE
        plane.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${left ? layout.angle : -layout.angle}deg)`
        plane.style.opacity = String(opacityFor(p))
        plane.style.zIndex = String(Math.round(p * 1000))
      })
    }

    let timer: Timer | undefined
    let visibility: IntersectionObserver | undefined

    size()
    place(0)
    const onResize = () => {
      size()
      place(timer?.iterationProgress ?? 0)
    }
    window.addEventListener('resize', onResize)

    if (!reduced) {
      timer = createTimer({
        duration: LOOP_MS,
        loop: true,
        autoplay: false,
        onUpdate: (self) => place(self.iterationProgress),
      })
      // only run while it can be seen
      visibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) timer?.play()
        else timer?.pause()
      })
      visibility.observe(root)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      visibility?.disconnect()
      timer?.revert()
    }
  }, [reduced, images.length])

  return (
    <section
      ref={rootRef}
      aria-label={typeof title === 'string' ? title : 'Collection'}
      className={cn(
        'relative h-svh min-h-[34rem] w-full overflow-hidden bg-background select-none [clip-path:inset(0)]',
        className
      )}
    >
      <div className='absolute inset-0 [perspective:1100px] [transform-style:preserve-3d]'>
        <div
          ref={worldRef}
          className='absolute inset-0 [transform-style:preserve-3d]'
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              data-plane
              aria-hidden='true'
              className='absolute top-1/2 left-1/2 overflow-hidden rounded-lg bg-muted will-change-transform [backface-visibility:hidden]'
            >
              <img
                src={src}
                alt=''
                decoding='async'
                className='size-full object-cover'
              />
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_85%)]'
      />
      <div className='pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center'>
        <h2 className='font-display text-display-2 font-bold'>{title}</h2>
        {caption && (
          <p className='mt-4 max-w-md text-base text-foreground/75'>
            {caption}
          </p>
        )}
      </div>
    </section>
  )
}
