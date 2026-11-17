/*
 * Adapted from "Glassy Coverflow Carousel" by automate_flows on 21st.dev:
 * https://21st.dev/@automate_flows/components/glassy-coverflow-carousel
 * (whose coverflow geometry is itself adapted from educalvolpz/coverflow-carousel on 21st.dev).
 * Changes: the website-screenshot layout and brand header are removed; "poster" (2:3) and "backdrop" (16:10)
 * layouts; reduced motion comes from MotionProvider (so the /lab toggle and user setting apply), not only the
 * OS query; Lenis smooth scrolling is locked while the trailer dialog is open; stream tokens and accent glow.
 * Kept: swipe, arrow/Home/End keys, optional autoplay that pauses for hover, focus, drag, hidden tab and the
 * open dialog, and a youtube-nocookie trailer that only loads when asked for.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Info,
  Pause,
  Play,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotion, useScrollLock } from '@/components/motion'

const styles =
  '.gc-shell{--gc-background:transparent;--gc-foreground:var(--foreground);--gc-card:var(--card);--gc-muted:var(--muted-foreground);--gc-border:var(--border);--gc-primary:var(--primary);--gc-primary-ink:var(--primary-foreground);--gc-hover:color-mix(in srgb,var(--foreground) 8%,transparent);--gc-shadow:oklch(0 0 0);' +
  'position:relative;isolation:isolate;display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:560px;height:92svh;max-height:920px;width:100%;padding-bottom:28px;overflow:clip;color:var(--gc-foreground)}' +
  '.gc-shell *{box-sizing:border-box}.gc-shell button{font:inherit;color:inherit;cursor:pointer}.gc-shell button:disabled{opacity:.35;cursor:default}' +
  '.gc-shell button:focus-visible,.gc-shell a:focus-visible{outline:2px solid var(--ring);outline-offset:5px}' +
  '.gc-atmosphere{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 55% 45% at 50% 44%,color-mix(in srgb,var(--stream-glow-2) 16%,transparent),transparent 70%)}' +
  '.gc-stage{grid-row:1;position:relative;min-height:0;display:flex;align-items:center;justify-content:center;perspective:1100px;transform-style:preserve-3d;touch-action:pan-y;user-select:none;cursor:grab}.gc-stage[data-dragging]{cursor:grabbing}' +
  '.gc-floor{position:absolute;bottom:0;left:50%;width:min(600px,80vw);height:35px;transform:translate(-50%);background:radial-gradient(ellipse,color-mix(in srgb,var(--gc-shadow) 50%,transparent),transparent 70%);filter:blur(12px);pointer-events:none}' +
  '.gc-card{position:absolute;width:var(--gc-card-width);margin:0;padding:6px;display:block;border:1px solid var(--gc-border);border-radius:16px;background:var(--gc-card);box-shadow:inset 0 1px color-mix(in srgb,var(--gc-foreground) 10%,transparent),0 18px 40px color-mix(in srgb,var(--gc-shadow) 55%,transparent);backface-visibility:hidden;transition:transform .7s cubic-bezier(.22,1,.36,1),opacity .5s ease,border-color .25s;will-change:transform;outline-offset:7px!important;text-align:center}' +
  '.gc-card[data-active]{border-color:color-mix(in srgb,var(--gc-foreground) 28%,transparent)}.gc-stage[data-dragging] .gc-card{transition:none}' +
  '.gc-poster{display:block;position:relative;width:100%;aspect-ratio:2/3;overflow:hidden;border-radius:11px;background:var(--muted)}.gc-shell[data-layout=backdrop] .gc-poster{aspect-ratio:16/10}' +
  '.gc-poster>img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}' +
  '.gc-poster-shade{position:absolute;inset:0;background:var(--gc-shadow);opacity:var(--gc-shade,0);transition:opacity .4s;pointer-events:none}' +
  '.gc-watch{position:absolute;bottom:14px;left:50%;transform:translate(-50%);display:flex;align-items:center;gap:8px;min-height:40px;white-space:nowrap;border-radius:999px;padding:8px 15px;background:var(--glass-bg-strong);border:1px solid var(--glass-border);backdrop-filter:blur(10px);font-size:12px;font-weight:600;opacity:0;transition:opacity .2s}' +
  '.gc-card[data-active] .gc-watch{opacity:1}.gc-card[data-active]:hover .gc-watch{background:var(--gc-primary);color:var(--gc-primary-ink)}' +
  '.gc-bottom{grid-row:2;position:relative;z-index:12;display:flex;align-items:center;flex-direction:column;gap:16px;padding:12px 20px 0}' +
  '.gc-active-info{min-height:58px;text-align:center;max-width:100%}.gc-active-info h3{margin:0 0 6px;font-family:var(--font-display);font-size:clamp(22px,2.4vw,30px);font-weight:700;line-height:1.15;letter-spacing:-.02em;text-wrap:balance}.gc-active-info p{margin:0;font-size:13px;color:var(--gc-muted)}' +
  '.gc-dock{display:flex;align-items:center;gap:12px;padding:5px 7px 5px 19px;border-radius:40px;background:var(--glass-bg);border:1px solid var(--glass-border);box-shadow:inset 0 1px 0 var(--glass-highlight);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}' +
  '.gc-position{display:flex;gap:7px;padding-right:15px;border-right:1px solid var(--gc-border);font-size:11px;font-variant-numeric:tabular-nums;color:var(--gc-muted)}.gc-position>span:first-child{color:var(--gc-foreground)}' +
  '.gc-transport{display:flex;align-items:center;gap:3px}.gc-dock button{border:0;background:none;display:flex;align-items:center;justify-content:center;padding:0;width:44px;height:44px;border-radius:50%;transition:background .16s}.gc-dock button:hover,.gc-transport .gc-play-toggle{background:var(--gc-hover)}' +
  '.gc-hint{display:flex;align-items:center;gap:7px;margin:0;color:var(--gc-muted);font-size:11px}' +
  '.gc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
  '.gc-dialog{padding:0;border:1px solid var(--glass-border);border-radius:20px;width:min(900px,calc(100vw - 32px));max-height:calc(100svh - 32px);background:var(--glass-bg-strong);backdrop-filter:blur(28px);color:var(--foreground);box-shadow:0 30px 100px oklch(0 0 0/60%);overflow:auto}' +
  '.gc-dialog::backdrop{background:oklch(0 0 0/70%);backdrop-filter:blur(10px)}.gc-dialog[open]{animation:gc-modal-in .3s cubic-bezier(.22,1,.36,1)}@keyframes gc-modal-in{0%{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}' +
  '.gc-dialog-panel{padding:14px}.gc-dialog-bar{display:flex;align-items:center;justify-content:space-between;padding:0 3px 12px;gap:20px;font-size:12px;color:var(--muted-foreground)}' +
  '.gc-dialog-bar button{background:var(--accent);border:1px solid var(--border);border-radius:999px;display:flex;align-items:center;gap:6px;padding:6px 14px;min-height:40px;color:var(--foreground);cursor:pointer}' +
  '.gc-preview{aspect-ratio:16/9;border-radius:12px;background:var(--muted);overflow:hidden}.gc-preview>iframe,.gc-preview>img{border:0;width:100%;height:100%;object-fit:cover}' +
  '.gc-dialog-caption{padding:18px 5px 6px}.gc-dialog-caption h2{font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-.02em;margin:0 0 8px}.gc-dialog-caption p{font-size:14px;line-height:1.6;margin:0;color:var(--muted-foreground);max-width:60ch}' +
  '.gc-external{display:inline-flex;gap:8px;align-items:center;color:var(--primary-foreground);background:var(--primary);text-decoration:none;font-size:13px;font-weight:600;margin:12px 5px 6px;padding:10px 16px;border-radius:999px;min-height:44px}' +
  '@media(max-width:600px){.gc-shell{min-height:520px;padding-bottom:22px}.gc-stage{perspective:900px}.gc-card{padding:5px;border-radius:13px}}' +
  '[data-motion=reduce] .gc-card,[data-motion=reduce] .gc-poster-shade,[data-motion=reduce] .gc-watch{transition:none!important}[data-motion=reduce] .gc-dialog[open]{animation:none!important}'

export interface CoverflowItem {
  id: string
  title: string
  subtitle: string
  image: string
  description?: string
  /** YouTube watch URL; the trailer player loads only when the dialog opens */
  trailerUrl?: string
}

export interface CoverflowCarouselProps {
  items: CoverflowItem[]
  initialIndex?: number
  layout?: 'poster' | 'backdrop'
  /** Autoplay delay in ms (min 2500). Autoplay is off unless `autoPlay` is set. */
  interval?: number
  autoPlay?: boolean
  label?: string
  className?: string
  style?: CSSProperties
  onSelect?: (item: CoverflowItem, index: number) => void
  /**
   * Clicking the centre card calls this (e.g. to open the title's details) instead of the trailer dialog.
   * `card` holds the picture, marked `data-title-media`, for a morph.
   */
  onOpen?: (item: CoverflowItem, index: number, card: HTMLElement) => void
}

const wrap = (value: number, length: number) =>
  ((value % length) + length) % length

function trailerEmbed(url?: string) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    const videoId =
      parsed.hostname === 'youtu.be'
        ? parsed.pathname.slice(1)
        : /(^|\.)youtube\.com$/.test(parsed.hostname)
          ? parsed.searchParams.get('v')
          : null
    return videoId && /^[\w-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`
      : undefined
  } catch {
    return undefined
  }
}

export function CoverflowCarousel({
  items,
  initialIndex = 0,
  layout = 'poster',
  interval = 6000,
  autoPlay = false,
  label = 'Collection',
  className,
  style,
  onSelect,
  onOpen,
}: CoverflowCarouselProps) {
  const { reduced } = useMotion()
  const [index, setIndex] = useState(
    Number.isFinite(initialIndex) ? Math.trunc(initialIndex) : 0
  )
  const [playing, setPlaying] = useState(autoPlay)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 1100, height: 460 })
  const [preview, setPreview] = useState<CoverflowItem | null>(null)
  const [pageVisible, setPageVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [cardFocused, setCardFocused] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const gesture = useRef<{
    x: number
    y: number
    time: number
    horizontal: boolean
  } | null>(null)
  const suppressClickUntil = useRef(0)
  const focusSelection = useRef(false)
  const id = useId()

  useScrollLock(preview !== null)

  const activeIndex = items.length ? wrap(index, items.length) : 0
  const active = items[activeIndex]
  const cardWidth =
    layout === 'poster'
      ? Math.min(
          270,
          stageSize.width * 0.58,
          Math.max(100, (stageSize.height - 28) / 1.5)
        )
      : Math.min(460, stageSize.width * 0.72)
  const step = cardWidth * 0.78
  const running =
    playing &&
    !reduced &&
    !preview &&
    !dragging &&
    pageVisible &&
    !hovered &&
    !cardFocused &&
    items.length > 1
  const duration = Number.isFinite(interval) ? Math.max(2500, interval) : 6000
  const before = Math.min(2, Math.floor((items.length - 1) / 2))
  const after = Math.min(2, Math.ceil((items.length - 1) / 2))
  // offstage slots recycle invisibly instead of crossing the deck when the index wraps
  const slots =
    items.length > 1
      ? Array.from(
          { length: before + after + 3 },
          (_, p) => index + p - before - 1
        )
      : [index]

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () =>
      setStageSize({ width: el.clientWidth, height: el.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setIndex((current) => current + 1), duration)
    return () => clearTimeout(timer)
  }, [running, index, duration])

  useEffect(() => {
    if (active) onSelect?.(active, activeIndex)
  }, [active, activeIndex, onSelect])

  useEffect(() => {
    if (focusSelection.current) {
      stage.current
        ?.querySelector<HTMLButtonElement>('.gc-card[data-active]')
        ?.focus({ preventScroll: true })
      focusSelection.current = false
    }
  }, [index])

  useEffect(() => {
    if (preview && dialog.current && !dialog.current.open)
      dialog.current.showModal()
    if (!preview && dialog.current?.open) dialog.current.close()
  }, [preview])

  const select = (next: number) => {
    setIndex(next)
    setDrag(0)
  }
  // the card's onClick has already ignored the click that ends a drag
  const open = (item: CoverflowItem) => setPreview(item)
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      horizontal: false,
    }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null
      return
    }
    if (!start.horizontal && Math.abs(dx) > 8) {
      start.horizontal = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    if (start.horizontal) setDrag(Math.max(-1.2, Math.min(1.2, dx / step)))
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const start = gesture.current
    gesture.current = null
    if (start?.horizontal) {
      const dx = event.clientX - start.x
      const velocity =
        Math.abs(dx) / Math.max(1, performance.now() - start.time)
      if (
        !cancel &&
        (Math.abs(dx) > Math.min(55, cardWidth * 0.18) ||
          (Math.abs(dx) > 14 && velocity > 0.35))
      )
        setIndex((current) => current + (dx < 0 ? 1 : -1))
      suppressClickUntil.current = performance.now() + 300
    }
    setDrag(0)
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!active) return null
  const video = trailerEmbed(preview?.trailerUrl)

  return (
    <section
      data-layout={layout}
      className={cn('gc-shell', className)}
      aria-label={label}
      aria-roledescription='carousel'
      style={{ '--gc-card-width': `${cardWidth}px`, ...style } as CSSProperties}
      onKeyDown={(event) => {
        if (preview || event.altKey || event.ctrlKey || event.metaKey) return
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key))
          focusSelection.current =
            (event.target as HTMLElement).closest('.gc-card') !== null
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          select(index + 1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          select(index - 1)
        }
        if (event.key === 'Home') {
          event.preventDefault()
          select(0)
        }
        if (event.key === 'End') {
          event.preventDefault()
          select(items.length - 1)
        }
      }}
    >
      <style>{styles}</style>
      <div className='gc-atmosphere' aria-hidden='true' />
      <div
        className='gc-stage'
        ref={stage}
        data-dragging={dragging || undefined}
        data-lenis-prevent-touch
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerUp(event)}
        onPointerCancel={(event) => pointerUp(event, true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setCardFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setCardFocused(false)
        }}
      >
        <div className='gc-floor' aria-hidden='true' />
        {slots.map((slot) => {
          const item = items[wrap(slot, items.length)]
          const d = slot - index
          const offset = d + drag
          const abs = Math.abs(offset)
          const selected = slot === index
          const offstage = d < -before || d > after
          return (
            <button
              key={slot}
              type='button'
              className='gc-card'
              data-active={selected || undefined}
              tabIndex={selected ? 0 : -1}
              aria-label={
                selected && onOpen
                  ? `More info: ${item.title}`
                  : selected
                    ? item.trailerUrl
                      ? // starts with the visible words, so voice control can say what it sees
                        `Watch trailer: ${item.title}`
                      : `Preview ${item.title}`
                    : `Select ${item.title}`
              }
              aria-current={selected ? 'true' : undefined}
              aria-hidden={offstage || undefined}
              onClick={(event) => {
                if (performance.now() < suppressClickUntil.current) return
                if (selected && onOpen)
                  onOpen(item, wrap(slot, items.length), event.currentTarget)
                else if (selected) open(item)
                else select(index + d)
              }}
              style={
                {
                  transform: `translate3d(${offset * step}px, 0, ${-Math.min(abs, 3) * 130}px) rotateY(${-Math.max(-42, Math.min(42, offset * 30))}deg) scale(${1 - Math.min(abs, 3) * 0.08})`,
                  opacity: offstage ? 0 : 1,
                  zIndex: 10 - Math.abs(d),
                  pointerEvents: offstage ? 'none' : undefined,
                  '--gc-shade': Math.min(abs, 2) * 0.22,
                } as CSSProperties
              }
            >
              <span className='gc-poster'>
                <img
                  src={item.image}
                  alt=''
                  data-title-media={selected || undefined}
                  draggable={false}
                  loading={Math.abs(d) < 2 ? 'eager' : 'lazy'}
                  decoding='async'
                />
                <span className='gc-poster-shade' aria-hidden='true' />
                {/* the centre card's chip: More info when it opens details, Watch trailer otherwise */}
                {selected && onOpen && (
                  <span className='gc-watch' aria-hidden='true'>
                    <Info size={14} /> More info
                  </span>
                )}
                {item.trailerUrl && selected && !onOpen && (
                  <span className='gc-watch' aria-hidden='true'>
                    <Play size={13} fill='currentColor' strokeWidth={0} /> Watch
                    trailer
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <div className='gc-bottom'>
        <div className='gc-active-info'>
          <h3>{active.title}</h3>
          <p>{active.subtitle}</p>
        </div>
        <div className='gc-dock' role='group' aria-label='Carousel controls'>
          <span className='gc-position' aria-hidden='true'>
            <span>{String(activeIndex + 1).padStart(2, '0')}</span>
            <span>/</span>
            <span>{String(items.length).padStart(2, '0')}</span>
          </span>
          <div className='gc-transport'>
            <button
              type='button'
              onClick={() => select(index - 1)}
              aria-label='Previous'
              disabled={items.length < 2}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type='button'
              className='gc-play-toggle'
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause carousel' : 'Play carousel'}
              aria-pressed={playing}
              disabled={reduced || items.length < 2}
            >
              {playing ? (
                <Pause size={14} fill='currentColor' />
              ) : (
                <Play size={14} fill='currentColor' />
              )}
            </button>
            <button
              type='button'
              onClick={() => select(index + 1)}
              aria-label='Next'
              disabled={items.length < 2}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <p className='gc-hint'>
          <span>Drag</span>
          <span>or</span>
          <ArrowLeft size={12} aria-hidden='true' />
          <ArrowRight size={12} aria-hidden='true' />
          <span>to browse</span>
        </p>
      </div>
      <p className='gc-sr-only' aria-live='polite' aria-atomic='true'>
        {!playing && `${active.title}. ${activeIndex + 1} of ${items.length}.`}
      </p>
      <dialog
        ref={dialog}
        className='gc-dialog'
        aria-labelledby={`${id}-title`}
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPreview(null)
        }}
      >
        {preview && (
          <div className='gc-dialog-panel'>
            <div className='gc-dialog-bar'>
              <span>{video ? 'Official trailer' : 'Preview'}</span>
              <button type='button' onClick={() => setPreview(null)}>
                <X size={15} /> Close
              </button>
            </div>
            <div className='gc-preview'>
              {video ? (
                <iframe
                  src={video}
                  title={`${preview.title} official trailer`}
                  allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
                  allowFullScreen
                  referrerPolicy='strict-origin-when-cross-origin'
                />
              ) : (
                <img src={preview.image} alt='' />
              )}
            </div>
            <div className='gc-dialog-caption'>
              <h2 id={`${id}-title`}>{preview.title}</h2>
              <p>{preview.description || preview.subtitle}</p>
            </div>
            {preview.trailerUrl && (
              <a
                className='gc-external'
                href={preview.trailerUrl}
                target='_blank'
                rel='noreferrer'
              >
                Watch on YouTube <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        )}
      </dialog>
    </section>
  )
}
