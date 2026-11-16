import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { claimTrailerSlot, releaseTrailerSlot } from './trailer-slot'
import { loadYouTubeApi, type YTPlayer } from './youtube-api'

/**
 * A YouTube trailer through the IFrame API on youtube-nocookie.com. It creates its iframe only when
 * mounted, and only after claiming the app's single trailer slot (any other trailer is destroyed first).
 * `preview`: muted, no controls, looping, and scaled up a little so YouTube's title bar and logo are
 * cropped off. It fades in only once the video is actually playing, so there is never a black box.
 */
export function YouTubeTrailer({
  videoKey,
  title,
  muted = true,
  preview = true,
  onPlaying,
  onEnded,
  onError,
  className,
}: {
  videoKey: string
  /** The title's name, for the player's accessible name */
  title: string
  muted?: boolean
  preview?: boolean
  onPlaying?: () => void
  onEnded?: () => void
  onError?: () => void
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const [playing, setPlaying] = useState(false)
  // the latest props, read by the player's event handlers without re-creating the player
  const latest = useRef({ muted, onPlaying, onEnded, onError })
  useEffect(() => {
    latest.current = { muted, onPlaying, onEnded, onError }
  })

  useEffect(() => {
    const el = host.current
    if (!el) return
    const id = Symbol(videoKey)
    let cancelled = false
    let disposed = false
    const mountPoint = document.createElement('div')
    el.append(mountPoint)

    const dispose = () => {
      if (disposed) return
      disposed = true
      try {
        player.current?.destroy()
      } catch {
        // the iframe may already be gone
      }
      player.current = null
      el.replaceChildren()
      setPlaying(false)
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
            ...(preview ? { loop: 1, playlist: videoKey } : {}),
          },
          events: {
            onReady: (e) => {
              if (latest.current.muted) e.target.mute()
              e.target.playVideo()
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                setPlaying(true)
                latest.current.onPlaying?.()
              } else if (e.data === YT.PlayerState.ENDED) {
                latest.current.onEnded?.()
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
        'overflow-hidden transition-opacity duration-500 [&>iframe]:size-full [&>iframe]:border-0',
        preview ? 'pointer-events-none scale-[1.22]' : 'pointer-events-auto',
        playing ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  )
}
