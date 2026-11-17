import { useEffect, useRef, useState, type RefObject } from 'react'
import type Hls from 'hls.js'

export interface QualityLevel {
  index: number
  height: number
  bitrate: number
}

/** Safari (macOS and iOS) plays HLS itself; everywhere else hls.js feeds Media Source Extensions */
const prefersNativeHls = (video: HTMLVideoElement) =>
  video.canPlayType('application/vnd.apple.mpegurl') !== '' &&
  (/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent))

/**
 * Attaches an HLS stream to a <video>. hls.js is imported only here (its own chunk, never in the main
 * bundle). Exposes the quality levels and the chosen one (-1 = automatic).
 */
export function useHls(
  video: RefObject<HTMLVideoElement | null>,
  src: string,
  onFatalError: () => void
) {
  const hls = useRef<Hls | null>(null)
  const [levels, setLevels] = useState<QualityLevel[]>([])
  const [level, setLevel] = useState(-1)
  /** The height actually playing in automatic mode, e.g. 720 */
  const [playingHeight, setPlayingHeight] = useState<number | null>(null)
  const fatal = useRef(onFatalError)
  useEffect(() => {
    fatal.current = onFatalError
  })

  useEffect(() => {
    const el = video.current
    if (!el) return
    let cancelled = false

    if (prefersNativeHls(el)) {
      el.setAttribute('src', src)
      return () => {
        el.removeAttribute('src')
        el.load()
      }
    }

    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled) return
        if (!Hls.isSupported()) {
          el.setAttribute('src', src)
          return
        }
        const instance = new Hls({
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
        })
        hls.current = instance
        instance.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setLevels(
            data.levels
              .map((l, index) => ({
                index,
                height: l.height,
                bitrate: l.bitrate,
              }))
              .filter((l) => l.height > 0)
          )
        })
        instance.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setPlayingHeight(instance.levels[data.level]?.height ?? null)
        })
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad()
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR)
            instance.recoverMediaError()
          else fatal.current()
        })
        instance.loadSource(src)
        instance.attachMedia(el)
      })
      .catch(() => fatal.current())

    return () => {
      cancelled = true
      hls.current?.destroy()
      hls.current = null
    }
  }, [video, src])

  const chooseLevel = (index: number) => {
    // currentLevel switches at once (drops the buffer); -1 hands control back to the bandwidth estimate
    if (hls.current) hls.current.currentLevel = index
    setLevel(index)
  }

  return { levels, level, chooseLevel, playingHeight }
}
