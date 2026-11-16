/*
 * Adapted from "Hero Carousel" by crafterui on 21st.dev:
 * https://21st.dev/@crafterui/components/hero-carousel
 * A full-bleed featured-titles hero: posters sit in a filmstrip sharing one top edge, the focused one unfurls to
 * full height, and the whole background re-grades to that title's backdrop.
 * Changes:
 * - framer-motion (motion values, drag, AnimatePresence) replaced by anime.js and plain pointer events
 *   (CLAUDE.md keeps framer for route and modal transitions).
 * - The original captured every wheel event over the stage, so a full-height hero became a scroll trap at the
 *   top of the page. Only horizontal wheel / trackpad swipes step the strip; vertical scrolling stays with the page.
 * - Its top bar (brand, back, menu) and film grain are removed: StreamLayout has the navbar and grain.
 * - Cards show posters, the background shows the backdrop; the colour grade uses the stream glow colours at
 *   a lower strength so film art keeps its own colour.
 * - First paint is immediate (no fade or wipe on the first backdrop and title), so it never delays LCP.
 * - Autoplay pauses on hover, focus, drag, a hidden tab and when the hero is scrolled away.
 * Reduced motion: no autoplay, no slow zoom, no slide; changes are instant.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { animate, stagger, utils } from 'animejs'
import { cn } from '@/lib/utils'
import { useMotion, useParallax } from '@/components/motion'

export interface FilmstripItem {
  id: string
  title: string
  /** Portrait picture for the strip card (a poster) */
  poster: string
  /** Landscape picture for the full-screen background (a backdrop) */
  backdrop: string
  /** Small line before the title, e.g. "Series" */
  eyebrow?: string
  /** Facts on the right, e.g. ["2024", "8.4 ★", "Drama"] */
  meta?: string[]
  /** One or two sentences under the title */
  overview?: string
}

interface FilmstripHeroProps {
  items: FilmstripItem[]
  label?: string
  defaultIndex?: number
  autoplay?: boolean
  /** ms between autoplay steps */
  autoplayDelay?: number
  /** Buttons for the focused title, e.g. "More info" */
  actions?: (item: FilmstripItem) => ReactNode
  /** A layer between the backdrop and the copy, e.g. the Three.js HeroAtmosphere */
  atmosphere?: ReactNode
  /**
   * The pinned wrapper the page scrolls the hero inside. When given, the backdrop drifts slowest, the strip
   * faster and the title block fastest as that wrapper scrolls (useParallax, range "pin").
   */
  parallaxTrigger?: RefObject<HTMLElement | null>
  className?: string
}

/* Layout ratios from the original, relative to the stage */
const CARD_H = 0.264 // focused card height ÷ stage height
const CARD_AR = 0.75 // cards are 3:4
const GAP = 0.04 // gap ÷ card width
const STRIP_TOP = 0.56 // the strip's shared top edge, down the stage

const GRADES = [
  'var(--stream-glow-1)',
  'var(--stream-glow-2)',
  'var(--stream-glow-3)',
]
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 420
const FADE_MS = 700

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/** One full-screen background: the backdrop, slowly zooming, tinted toward a glow colour */
function Backdrop({
  item,
  first,
  reduced,
}: {
  item: FilmstripItem
  first: boolean
  reduced: boolean
}) {
  const layerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  // decided once, at mount: the flag changing later must not replay the fade or restart the zoom
  const [isFirst] = useState(first)

  useLayoutEffect(() => {
    const layer = layerRef.current
    const img = imgRef.current
    if (!layer || !img) return
    // the first backdrop is there at first paint (it's the LCP image); later ones fade in over it
    const fade =
      isFirst || reduced
        ? undefined
        : animate(layer, { opacity: [0, 1], duration: FADE_MS, ease: 'out(2)' })
    const zoom = reduced
      ? undefined
      : animate(img, { scale: [1.12, 1], duration: 9000, ease: 'linear' })
    return () => {
      fade?.revert()
      zoom?.revert()
    }
  }, [isFirst, reduced])

  return (
    <div ref={layerRef} className='absolute inset-0' aria-hidden='true'>
      <img
        ref={imgRef}
        src={item.backdrop}
        alt=''
        draggable={false}
        fetchPriority={first ? 'high' : 'auto'}
        decoding='async'
        className='absolute inset-0 size-full object-cover will-change-transform'
      />
    </div>
  )
}

export function FilmstripHero({
  items,
  label = 'Featured',
  defaultIndex = 0,
  autoplay = true,
  autoplayDelay = 7000,
  actions,
  atmosphere,
  parallaxTrigger,
  className,
}: FilmstripHeroProps) {
  const { reduced } = useMotion()
  const stageRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const backdropsRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // depth: backdrop slowest, strip faster, copy fastest (negative ratio = moves up while the page scrolls)
  const noParallax = !parallaxTrigger
  useParallax(backdropsRef, {
    trigger: parallaxTrigger,
    ratio: -0.04,
    range: 'pin',
    disabled: noParallax,
  })
  useParallax(stripRef, {
    trigger: parallaxTrigger,
    ratio: -0.12,
    range: 'pin',
    disabled: noParallax,
  })
  useParallax(copyRef, {
    trigger: parallaxTrigger,
    ratio: -0.2,
    range: 'pin',
    disabled: noParallax,
  })
  const last = Math.max(0, items.length - 1)

  // sized from the window up front, so the first paint already has the real card sizes (no layout shift)
  const [box, setBox] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }))
  const [index, setIndex] = useState(clamp(defaultIndex, 0, last))
  // the backdrop that is fading out under the new one
  const [previous, setPrevious] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  // the slide shown at first paint: it skips the fade and title wipe
  const [firstIndex] = useState(index)

  const fullH = clamp(box.h * CARD_H, 110, 360)
  const halfH = fullH / 2
  const cardW = fullH * CARD_AR
  const gap = Math.max(6, Math.round(cardW * GAP))
  const step = cardW + gap
  const xFor = useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW]
  )

  const go = useCallback(
    (next: number) => {
      const target = clamp(next, 0, last)
      if (target === index) return
      setPrevious(index)
      setIndex(target)
    },
    [index, last]
  )

  // measure the stage
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() =>
      setBox({ w: stage.clientWidth, h: stage.clientHeight })
    )
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  // fetch and decode the next backdrop ahead of time, so its cross-fade never waits on an image
  useEffect(() => {
    const next = items[(index + 1) % items.length]
    if (!next || items.length < 2) return
    const img = new Image()
    img.src = next.backdrop
    img.decode?.().catch(() => {})
  }, [index, items])

  // drop the old backdrop once the new one has faded in
  useEffect(() => {
    if (previous === null) return
    const id = window.setTimeout(
      () => setPrevious(null),
      reduced ? 0 : FADE_MS + 50
    )
    return () => window.clearTimeout(id)
  }, [previous, reduced])

  // slide the strip so the focused card is centred
  const placed = useRef(false)
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || dragging) return
    if (!placed.current || reduced) {
      utils.set(track, { x: xFor(index) })
      placed.current = true
      return
    }
    const slide = animate(track, {
      x: xFor(index),
      duration: 750,
      ease: 'out(4)',
    })
    return () => {
      slide.pause()
    }
  }, [index, xFor, dragging, reduced])

  // each title's words rise from behind their own edge, one after another, then the rest of the copy
  // follows. Runs on first load and on every change. (The backdrop, not the title, is the LCP element.)
  useLayoutEffect(() => {
    const title = titleRef.current
    const copy = copyRef.current
    if (!title || !copy) return
    const words = title.querySelectorAll<HTMLElement>('[data-word]')
    const details = copy.querySelectorAll<HTMLElement>('[data-hero-detail]')
    const animations = reduced
      ? [
          animate(title, { opacity: [0, 1], duration: 250, ease: 'linear' }),
          animate(details, { opacity: [0, 1], duration: 250, ease: 'linear' }),
        ]
      : [
          animate(words, {
            y: ['110%', '0%'],
            duration: 700,
            delay: stagger(55, { start: index === firstIndex ? 150 : 0 }),
            ease: 'out(4)',
          }),
          animate(details, {
            opacity: [0, 1],
            y: [14, 0],
            duration: 600,
            delay: stagger(70, { start: 260 + words.length * 55 }),
            ease: 'out(3)',
          }),
        ]
    return () => {
      for (const a of animations) a.revert()
    }
  }, [index, reduced, firstIndex])

  // horizontal wheel / trackpad swipes step the strip; vertical scrolling is left to the page
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let acc = 0
    let until = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      const stuck =
        (e.deltaX > 0 && index === last) || (e.deltaX < 0 && index === 0)
      if (stuck) return
      e.preventDefault()
      if (e.timeStamp < until) return
      acc += e.deltaX
      if (Math.abs(acc) < WHEEL_THRESHOLD) return
      go(index + Math.sign(acc))
      acc = 0
      until = e.timeStamp + WHEEL_COOLDOWN
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [go, index, last])

  // autoplay only while it can be seen
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 }
    )
    io.observe(stage)
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (
      !autoplay ||
      reduced ||
      paused ||
      dragging ||
      !inView ||
      !pageVisible ||
      items.length < 2
    )
      return
    const id = window.setTimeout(
      () => go(index === last ? 0 : index + 1),
      autoplayDelay
    )
    return () => window.clearTimeout(id)
  }, [
    autoplay,
    autoplayDelay,
    reduced,
    paused,
    dragging,
    inView,
    pageVisible,
    items.length,
    index,
    last,
    go,
  ])

  // drag the strip with a pointer; a flick carries further
  const drag = useRef<{
    startX: number
    startTrack: number
    lastX: number
    lastT: number
    v: number
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const trackX = () => Number(utils.get(trackRef.current!, 'x', false)) || 0

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = {
      startX: e.clientX,
      startTrack: trackX(),
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      moved: false,
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (!d.moved) {
      if (Math.abs(dx) < 6) return
      d.moved = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.v = d.v * 0.6 + ((e.clientX - d.lastX) / dt) * 0.4
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    // a little resistance past either end
    const min = xFor(last)
    const max = xFor(0)
    let x = d.startTrack + dx
    if (x > max) x = max + (x - max) * 0.25
    if (x < min) x = min + (x - min) * 0.25
    utils.set(trackRef.current!, { x })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    suppressClick.current = true
    window.setTimeout(() => (suppressClick.current = false), 0)
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    const thrown = trackX() + d.v * 180
    const nearest = clamp(
      Math.round((box.w / 2 - thrown - cardW / 2) / step),
      0,
      last
    )
    setDragging(false)
    if (nearest !== index) go(nearest)
    // same card: the layout effect re-centres it once dragging is false
  }

  const active = items[index]
  if (!active) return null
  const layers =
    previous !== null && previous !== index ? [previous, index] : [index]

  return (
    <section
      ref={stageRef}
      tabIndex={0}
      aria-roledescription='carousel'
      aria-label={label}
      onKeyDown={(e) => {
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        }
        if (!(e.key in keys)) return
        e.preventDefault()
        go(keys[e.key])
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setPaused(false)
      }}
      className={cn(
        'relative h-svh min-h-[36rem] w-full overflow-hidden bg-background select-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className
      )}
    >
      {/* oversized top and bottom so the parallax drift never shows an edge */}
      <div
        ref={backdropsRef}
        className='absolute inset-x-0 -top-[6%] -bottom-[6%]'
      >
        {layers.map((i) => (
          <Backdrop
            key={items[i].id}
            item={items[i]}
            first={i === firstIndex && previous === null}
            reduced={reduced}
          />
        ))}
      </div>

      {/* one shared colour grade over whichever backdrops are showing: keeps the pictures' light and dark,
          pulls their colour a little toward the glow. One blend layer, not one per backdrop (cross-fades
          blending four full-screen layers at once dropped frames on integrated GPUs). */}
      <div
        aria-hidden='true'
        className={cn(
          'absolute inset-0 opacity-25 mix-blend-color',
          !reduced && 'transition-[background-color] duration-700'
        )}
        style={{ backgroundColor: GRADES[index % GRADES.length] }}
      />

      {atmosphere}

      {/* legibility: under the navbar, behind the copy, and into the page below */}
      <div
        aria-hidden='true'
        className='absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background'
      />
      <div
        aria-hidden='true'
        className='absolute inset-0 scrim-left opacity-70'
      />

      {/* title block, sitting just above the strip */}
      <div
        ref={copyRef}
        className='absolute inset-x-0 top-0 shell flex flex-col justify-end pb-[3svh]'
        style={{ height: `${STRIP_TOP * 100}%` }}
      >
        <div className='flex w-full flex-wrap items-end gap-x-12 gap-y-4'>
          <div className='max-w-3xl min-w-0' aria-live='polite'>
            {active.eyebrow && (
              <p
                data-hero-detail
                className='mb-4 text-eyebrow font-semibold text-foreground/80 uppercase'
              >
                {active.eyebrow}
              </p>
            )}
            <h1
              key={active.id}
              ref={titleRef}
              aria-label={active.title}
              className='font-display text-display-2 font-bold text-balance'
            >
              {/* one mask per word, so each rises from behind its own edge */}
              {active.title.split(' ').map((word, i, all) => (
                <span key={i} aria-hidden='true'>
                  <span className='inline-block overflow-hidden pb-[0.08em] align-bottom'>
                    <span data-word className='inline-block'>
                      {word}
                    </span>
                  </span>
                  {i < all.length - 1 ? ' ' : null}
                </span>
              ))}
            </h1>
            {active.overview && (
              <p
                key={`o-${active.id}`}
                data-hero-detail
                className='mt-4 line-clamp-2 max-w-xl text-base text-foreground/80 md:text-lg'
              >
                {active.overview}
              </p>
            )}
            {actions && (
              <div data-hero-detail className='mt-6 flex flex-wrap gap-3'>
                {actions(active)}
              </div>
            )}
          </div>
          {active.meta?.length ? (
            <ul
              data-hero-detail
              className='ml-auto hidden items-end gap-8 md:flex'
              aria-label='Details'
            >
              {active.meta.map((fact) => (
                <li
                  key={fact}
                  className='text-xs font-medium tracking-[0.14em] whitespace-nowrap text-foreground/80 uppercase'
                >
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* the strip: one shared top edge, the focused card twice as tall */}
      <div
        ref={stripRef}
        className='absolute inset-x-0'
        style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}
      >
        <div
          ref={trackRef}
          className={cn(
            'flex touch-pan-y items-start',
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          style={{ gap }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {items.map((item, i) => {
            const focused = i === index
            return (
              <button
                key={item.id}
                type='button'
                aria-label={focused ? item.title : `Show ${item.title}`}
                aria-current={focused || undefined}
                tabIndex={focused ? 0 : -1}
                onClick={() => {
                  if (!suppressClick.current) go(i)
                }}
                // every card is full height; the half-height look is a clip, so a focus change never
                // re-lays out the strip (paint only), and the clipped half can't be clicked
                className={cn(
                  'group relative shrink-0 rounded-xl bg-muted outline-none',
                  !reduced &&
                    'transition-[clip-path] duration-700 ease-out-expo'
                )}
                style={{
                  width: cardW,
                  height: fullH,
                  clipPath: `inset(0 0 ${focused ? 0 : fullH - halfH}px 0 round 12px)`,
                }}
              >
                <img
                  src={item.poster}
                  alt=''
                  draggable={false}
                  loading={Math.abs(i - index) < 4 ? 'eager' : 'lazy'}
                  decoding='async'
                  className='size-full object-cover'
                  style={{ objectPosition: '50% 22%' }}
                />
                <span
                  aria-hidden='true'
                  className={cn(
                    'absolute inset-0 bg-background',
                    !reduced && 'transition-opacity duration-700',
                    focused ? 'opacity-0' : 'opacity-35'
                  )}
                />
                {/* the frame (border + focus ring) follows the visible height; out of flow, so cheap */}
                <span
                  aria-hidden='true'
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 rounded-xl border group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-inset',
                    focused ? 'border-foreground/40' : 'border-border',
                    !reduced &&
                      'transition-[height,border-color] duration-700 ease-out-expo'
                  )}
                  style={{ height: focused ? fullH : halfH }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* position rail */}
      <div className='absolute inset-x-0 bottom-[3svh] shell'>
        <div className='w-40 sm:w-56'>
          <div className='flex justify-between text-xs font-medium text-foreground/80 tabular-nums'>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{String(items.length).padStart(2, '0')}</span>
          </div>
          <div className='relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-foreground/20'>
            <div
              className={cn(
                'absolute inset-y-0 rounded-full bg-stream-gradient',
                !reduced && 'transition-[left] duration-700 ease-out-expo'
              )}
              style={{
                width: `${100 / items.length}%`,
                left: `${(index / items.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
