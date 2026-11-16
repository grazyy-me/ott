import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { animate } from 'animejs'
import { Volume2, VolumeX } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '@/app/hooks'
import { lengthLabel, ratingLabel } from '@/lib/title-format'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { useMotion } from '@/components/motion'
import { catalogApi } from '@/features/catalog/catalog-api'
import { preloadTitleModal } from '@/features/title/modal-state'
import { MoreInfoButton, MyListButton, PlayButton } from '../title-actions'
import { YouTubeTrailer } from '../trailer/youtube-trailer'
import { PreviewContext, type PreviewController } from './preview-context'

const HOVER_DELAY = 400
const CLOSE_GRACE = 120
const FOCUS_DELAY = 250
/** A hover that starts this soon after a scroll is the page moving under a still pointer, not intent */
const SCROLL_QUIET = 200

interface Active {
  title: TitleCard
  anchor: HTMLElement
  /** Play the trailer (mouse hover, motion allowed, not Save-Data) */
  video: boolean
  /** Opened by keyboard focus: details only, not interactive */
  focus: boolean
  closing: boolean
  id: number
}

const saveData = () =>
  Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData
  )

/**
 * The one hover preview for every card on stream pages (desktop only): a floating card that grows out of
 * the hovered card after 400ms, plays the muted trailer and offers Play, My List and More info. It lives
 * in a portal, so rails that scroll sideways don't clip it. Scrolling or a route change closes it.
 */
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null)
  const activeRef = useRef<Active | null>(null)
  const timers = useRef({ open: 0, close: 0, focus: 0 })
  // the card whose hover delay is counting (pointer moves over it don't restart the delay)
  const pending = useRef<HTMLElement | null>(null)
  const lastScroll = useRef(0)
  const nextId = useRef(0)
  const { reduced } = useMotion()
  const dispatch = useAppDispatch()
  const location = useLocation()

  const set = useCallback((next: Active | null) => {
    activeRef.current = next
    setActive(next)
  }, [])

  const clearTimers = () => {
    pending.current = null
    window.clearTimeout(timers.current.open)
    window.clearTimeout(timers.current.close)
    window.clearTimeout(timers.current.focus)
  }

  const controller = useMemo<PreviewController>(() => {
    const canHover = () =>
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const open = (title: TitleCard, anchor: HTMLElement, focus: boolean) => {
      dispatch(catalogApi.util.prefetch('getTitle', title.slug, {}))
      set({
        title,
        anchor,
        focus,
        video: !focus && !reduced && !saveData() && Boolean(title.trailerKey),
        closing: false,
        id: ++nextId.current,
      })
    }
    const closeSoon = () => {
      window.clearTimeout(timers.current.close)
      timers.current.close = window.setTimeout(() => {
        const current = activeRef.current
        if (current) set({ ...current, closing: true })
      }, CLOSE_GRACE)
    }
    return {
      schedule: (title, anchor) => {
        if (!canHover()) return
        window.clearTimeout(timers.current.close)
        if (activeRef.current?.anchor === anchor || pending.current === anchor)
          return
        window.clearTimeout(timers.current.open)
        pending.current = anchor
        timers.current.open = window.setTimeout(() => {
          pending.current = null
          const moving = performance.now() - lastScroll.current < SCROLL_QUIET
          if (moving || !anchor.isConnected || !anchor.matches(':hover')) return
          open(title, anchor, false)
        }, HOVER_DELAY)
      },
      leave: (anchor) => {
        pending.current = null
        window.clearTimeout(timers.current.open)
        if (activeRef.current?.anchor === anchor) closeSoon()
      },
      focus: (title, anchor) => {
        if (!canHover()) return
        clearTimers()
        // focus scrolls the card into view first (which would close the preview): open once it settles
        // its own timer: the scroll handler below cancels hover timers, not this one
        timers.current.focus = window.setTimeout(() => {
          const link = anchor.closest('a') ?? anchor
          if (link === document.activeElement) open(title, anchor, true)
        }, FOCUS_DELAY)
      },
      blur: (anchor) => {
        const current = activeRef.current
        if (current?.focus && current.anchor === anchor) set(null)
      },
      dismiss: () => {
        clearTimers()
        set(null)
      },
    }
  }, [dispatch, reduced, set])

  // load the title modal's code once the page is idle, so a click can morph straight into it
  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 2000))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(() => void preloadTitleModal())
    return () => cancel(handle)
  }, [])

  // scrolling anything (the page, a rail) closes the preview at once: its position would be stale
  useEffect(() => {
    const onScroll = () => {
      lastScroll.current = performance.now()
      pending.current = null
      window.clearTimeout(timers.current.open)
      if (activeRef.current) set(null)
    }
    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      clearTimers()
    }
  }, [set])

  // a new page (or a title modal) closes it too
  const [routeKey, setRouteKey] = useState(location.key)
  if (routeKey !== location.key) {
    setRouteKey(location.key)
    setActive(null)
  }
  // timers read the open preview from this ref; keep it in step with renders like the one above
  useEffect(() => {
    activeRef.current = active
  }, [active])

  return (
    <PreviewContext.Provider value={controller}>
      {children}
      {active &&
        createPortal(
          <HoverPreview
            key={active.id}
            active={active}
            reduced={reduced}
            onEnter={() => window.clearTimeout(timers.current.close)}
            onLeave={() => controller.leave(active.anchor)}
            onExited={() => {
              if (activeRef.current?.id === active.id) set(null)
            }}
            onNavigate={controller.dismiss}
          />,
          document.body
        )}
    </PreviewContext.Provider>
  )
}

const GUTTER = 16

function HoverPreview({
  active,
  reduced,
  onEnter,
  onLeave,
  onExited,
  onNavigate,
}: {
  active: Active
  reduced: boolean
  onEnter: () => void
  onLeave: () => void
  onExited: () => void
  onNavigate: () => void
}) {
  const { title: t, anchor } = active
  const ref = useRef<HTMLDivElement>(null)
  const from = useRef(1)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)

  // place it over the card (written straight to the element, no re-render), then grow it out of the card
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = anchor.getBoundingClientRect()
    const wide = rect.width / rect.height > 1.2
    const width = Math.round(
      wide
        ? Math.min(rect.width * 1.2, 520)
        : Math.min(Math.max(rect.width * 1.6, 300), 380)
    )
    el.style.width = `${width}px`
    const height = el.offsetHeight
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, GUTTER),
      window.innerWidth - width - GUTTER
    )
    const top = Math.min(
      Math.max(rect.top + rect.height / 2 - height / 2, GUTTER + 64),
      window.innerHeight - height - GUTTER
    )
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.transformOrigin = `${rect.left + rect.width / 2 - left}px ${rect.top + rect.height / 2 - top}px`
    from.current = rect.width / width

    const enter = animate(el, {
      opacity: [0, 1],
      ...(reduced ? {} : { scale: [from.current, 1] }),
      duration: reduced ? 150 : 320,
      ease: 'outExpo',
    })
    return () => {
      enter.cancel()
    }
  }, [anchor, reduced])

  useEffect(() => {
    if (!active.closing) return
    const el = ref.current
    if (!el) return onExited()
    const exit = animate(el, {
      opacity: 0,
      ...(reduced ? {} : { scale: from.current }),
      duration: reduced ? 100 : 200,
      ease: 'inQuad',
      onComplete: onExited,
    })
    return () => {
      exit.cancel()
    }
  }, [active.closing, reduced, onExited])

  const meta = [
    ratingLabel(t.rating) && `★ ${ratingLabel(t.rating)}`,
    t.year,
    lengthLabel(t),
  ].filter(Boolean)
  const showVideo = active.video && !videoFailed && !active.closing

  return (
    <div
      ref={ref}
      data-morph-root
      role={active.focus ? undefined : 'dialog'}
      aria-label={active.focus ? undefined : `${t.title} preview`}
      aria-hidden={active.focus || undefined}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        'fixed z-40 overflow-hidden rounded-2xl glass-strong opacity-0 shadow-[0_30px_80px_-20px_oklch(0_0_0/85%)]',
        active.focus && 'pointer-events-none'
      )}
    >
      <div className='relative aspect-video overflow-hidden bg-muted'>
        {(t.backdropUrl || t.posterUrl) && (
          <img
            src={
              t.backdropUrl
                ? tmdbImage(t.backdropUrl, 'w780')
                : tmdbImage(t.posterUrl, 'w500')
            }
            alt=''
            data-title-media
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500',
              playing && 'opacity-0',
              !active.video && !reduced && 'animate-ken-burns'
            )}
          />
        )}
        {showVideo && (
          <YouTubeTrailer
            videoKey={t.trailerKey}
            title={t.title}
            muted={muted}
            onVisibleChange={setPlaying}
            onError={() => setVideoFailed(true)}
            className='absolute inset-0'
          />
        )}
        <div
          aria-hidden='true'
          className='absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent'
        />
        {playing && (
          <button
            type='button'
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute trailer' : 'Mute trailer'}
            className='absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full glass transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
          >
            {muted ? (
              <VolumeX className='size-4' />
            ) : (
              <Volume2 className='size-4' />
            )}
          </button>
        )}
      </div>

      <div className='p-4'>
        <div className='flex items-center gap-2'>
          <PlayButton title={t} compact onNavigate={onNavigate} />
          <MyListButton title={t} compact />
          <MoreInfoButton
            title={t}
            compact
            className='ml-auto'
            onNavigate={onNavigate}
          />
        </div>
        <p className='mt-3 truncate font-display text-lg font-bold'>
          {t.title}
        </p>
        <p className='mt-1 flex flex-wrap items-center gap-x-2 text-sm text-foreground/75'>
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
          {t.isFree && (
            <span className='rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold'>
              Free
            </span>
          )}
        </p>
        {t.genres.length > 0 && (
          <p className='mt-1.5 truncate text-sm text-muted-foreground'>
            {t.genres
              .slice(0, 3)
              .map((g) => g.name)
              .join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}
