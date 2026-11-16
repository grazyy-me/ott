import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { claimTrailerSlot, releaseTrailerSlot } from './trailer-slot'
import { loadYouTubeApi, type YTPlayer } from './youtube-api'

/**
 * How long YouTube keeps its own overlay (title bar, big play / pause buttons, logo) on screen after playback
 * starts, resumes after buffering, or restarts. A preview stays hidden behind its backdrop until then.
 */
const OVERLAY_CLEAR_MS = 3200

/**
 * A YouTube trailer through the IFrame API on youtube-nocookie.com. It creates its iframe only when
 * mounted, and only after claiming the app's single trailer slot (any other trailer is destroyed first).
 *
 * `preview` (hover cards, the details hero): muted, no controls, no pointer input, and shown only once it
 * has played cleanly for a few seconds, past YouTube's start-up overlay. Buffering or a pause hides it
 * again until it's clean. It loops by restarting itself behind the backdrop (YouTube's own loop shows the
 * overlay and end-screen suggestions). `onVisibleChange` tells the parent when to fade its backdrop.
 * Without `preview` it is the normal player with controls and sound, shown as soon as it plays.
 */
export function YouTubeTrailer({
  videoKey,
  title,
  muted = true,
  preview = true,
  onVisibleChange,
  onEnded,
  onError,
  className,
}: {
  videoKey: string
  /** The title's name, for the player's accessible name */
  title: string
  muted?: boolean
  preview?: boolean
  onVisibleChange?: (visible: boolean) => void
  onEnded?: () => void
  onError?: () => void
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const [visible, setVisible] = useState(false)
  // the latest props, read by the player's event handlers without re-creating the player
  const latest = useRef({ muted, onVisibleChange, onEnded, onError })
  useEffect(() => {
    latest.current = { muted, onVisibleChange, onEnded, onError }
  })

  useEffect(() => {
    const el = host.current
    if (!el) return
    const id = Symbol(videoKey)
    let cancelled = false
    let disposed = false
    let revealTimer = 0
    const mountPoint = document.createElement('div')
    el.append(mountPoint)

    const show = (next: boolean) => {
      window.clearTimeout(revealTimer)
      setVisible(next)
      latest.current.onVisibleChange?.(next)
    }

    const dispose = () => {
      if (disposed) return
      disposed = true
      window.clearTimeout(revealTimer)
      try {
        player.current?.destroy()
      } catch {
        // the iframe may already be gone
      }
      player.current = null
      el.replaceChildren()
      show(false)
    }

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        // the previous trailer's iframe is removed here, before this one exists
        claimTrailerSlot(id, dispose)
        player.current = new YT.Player(mountPoint, {
          host: 'https://www.youtube-nocookie.com',
          videoId: videoKey,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: latest.current.muted ? 1 : 0,
            controls: preview ? 0 : 1,
            disablekb: preview ? 1 : 0,
            fs: preview ? 0 : 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            // previews are silent: captions would cover the picture
            ...(preview ? { cc_load_policy: 0 } : {}),
          },
          events: {
            onReady: (e) => {
              if (latest.current.muted) e.target.mute()
              e.target.playVideo()
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                if (!preview) return show(true)
                // wait out YouTube's overlay before showing anything
                window.clearTimeout(revealTimer)
                revealTimer = window.setTimeout(
                  () => show(true),
                  OVERLAY_CLEAR_MS
                )
              } else if (e.data === YT.PlayerState.ENDED) {
                latest.current.onEnded?.()
                if (preview) {
                  // loop behind the backdrop: no end screen, no overlay on the way round
                  show(false)
                  e.target.seekTo(0, true)
                  e.target.playVideo()
                }
              } else if (preview) {
                // buffering, paused or cued: YouTube's overlay is back, so hide until it's clean again
                show(false)
              }
            },
            onError: () => latest.current.onError?.(),
          },
        })
        const iframe = el.querySelector('iframe')
        iframe?.setAttribute('title', `${title} trailer`)
        if (preview) iframe?.setAttribute('tabindex', '-1')
      })
      .catch(() => latest.current.onError?.())

    return () => {
      cancelled = true
      releaseTrailerSlot(id)
      dispose()
    }
  }, [videoKey, preview, title])

  useEffect(() => {
    const p = player.current
    if (!p) return
    try {
      if (muted) p.mute()
      else p.unMute()
    } catch {
      // not ready yet: onReady applies the mute state
    }
  }, [muted])

  return (
    <div
      ref={host}
      aria-hidden={preview || undefined}
      className={cn(
        'overflow-hidden transition-opacity duration-700 [&>iframe]:size-full [&>iframe]:border-0',
        preview ? 'pointer-events-none scale-[1.22]' : 'pointer-events-auto',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  )
}
