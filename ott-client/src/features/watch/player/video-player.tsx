import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Season } from '@/types/catalog'
import type { Playback } from '@/types/playback'
import {
  ArrowLeft,
  Captions,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/components/motion'
import {
  saveProgressOnExit,
  useLogViewMutation,
  useSaveProgressMutation,
} from '../playback-api'
import { episodeLabel, formatTime } from './format'
import { EpisodesPanel, SettingsPanel, ShortcutsPanel } from './panels'
import { Scrubber } from './scrubber'
import { UpNext } from './up-next'
import { useHls } from './use-hls'

const HEARTBEAT_MS = 10_000
const HIDE_CONTROLS_MS = 3000
const SKIP_SEC = 10
const UP_NEXT_LAST_SEC = 30
const CREDITS_AT = 0.95
const COUNTDOWN_SEC = 10

type PanelName = 'settings' | 'episodes' | 'shortcuts' | null

const iconButton =
  'flex size-11 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring'

/**
 * The player: hls.js (or Safari's own HLS) behind custom controls, keyboard shortcuts, resume, progress
 * saved every 10 seconds (and on pause, seek and leaving), one view logged per session, and for series the
 * next episode with a 10-second autoplay countdown.
 */
export function VideoPlayer({
  playback,
  seasons,
}: {
  playback: Playback
  /** For the episodes panel (series only) */
  seasons: Season[]
}) {
  const { title, episode, next } = playback
  const navigate = useNavigate()
  const { reduced } = useMotion()
  const [saveProgress] = useSaveProgressMutation()
  const [logView] = useLogViewMutation()

  const shell = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const { levels, level, chooseLevel, playingHeight } = useHls(
    video,
    playback.src,
    () => setFailed(true)
  )

  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [controls, setControls] = useState(true)
  const [panel, setPanel] = useState<PanelName>(null)
  const [captions, setCaptions] = useState<{ index: number; label: string }[]>(
    []
  )
  const [caption, setCaption] = useState(-1)
  const [resumed, setResumed] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [upNextDismissed, setUpNextDismissed] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const episodeId = episode?.id ?? null
  const nextHref = next ? `/watch/${title.slug}/${next.id}` : null

  // ---------------------------------------------------------------- progress
  const progressNow = useCallback(() => {
    const el = video.current
    if (
      !el ||
      !el.duration ||
      !Number.isFinite(el.duration) ||
      el.currentTime <= 0
    )
      return null
    return {
      titleId: title.id,
      episodeId,
      positionSec: Math.floor(el.currentTime),
      durationSec: Math.floor(el.duration),
    }
  }, [title.id, episodeId])

  const save = useCallback(() => {
    const update = progressNow()
    if (update) saveProgress(update)
  }, [progressNow, saveProgress])

  // every 10s while playing
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(save, HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [playing, save])

  // leaving: the tab closes or hides (keepalive fetch), or the player unmounts (navigation)
  useEffect(() => {
    const onHide = () => {
      const update = progressNow()
      if (update) saveProgressOnExit(update)
    }
    window.addEventListener('pagehide', onHide)
    const onVisibility = () => document.visibilityState === 'hidden' && onHide()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      onHide()
    }
  }, [progressNow])

  // ---------------------------------------------------------------- media events
  const viewLogged = useRef(false)
  const resumeApplied = useRef(false)
  /** The caption track the viewer chose (-1: off), read by the track listeners */
  const captionChoice = useRef(-1)
  useEffect(() => {
    const el = video.current
    if (!el) return
    let seekTimer = 0
    const handlers: [string, () => void][] = [
      ['play', () => setPlaying(true)],
      [
        'pause',
        () => {
          setPlaying(false)
          save()
        },
      ],
      [
        'playing',
        () => {
          setWaiting(false)
          if (!viewLogged.current) {
            viewLogged.current = true
            logView({ titleId: title.id, episodeId })
          }
        },
      ],
      ['waiting', () => setWaiting(true)],
      ['canplay', () => setWaiting(false)],
      ['timeupdate', () => setTime(el.currentTime)],
      [
        'durationchange',
        () => setDuration(Number.isFinite(el.duration) ? el.duration : 0),
      ],
      [
        'progress',
        () => {
          const ranges = el.buffered
          setBuffered(ranges.length ? ranges.end(ranges.length - 1) : 0)
        },
      ],
      [
        'volumechange',
        () => {
          setVolume(el.volume)
          setMuted(el.muted)
        },
      ],
      ['ratechange', () => setRate(el.playbackRate)],
      [
        'seeked',
        () => {
          window.clearTimeout(seekTimer)
          seekTimer = window.setTimeout(save, 1000)
        },
      ],
      [
        'loadedmetadata',
        () => {
          if (!resumeApplied.current) {
            resumeApplied.current = true
            if (playback.resumeAt > 0 && playback.resumeAt < el.duration - 10) {
              el.currentTime = playback.resumeAt
              setResumed(playback.resumeAt)
            }
          }
          el.play().catch(() => setWaiting(false)) // autoplay refused: the big play button shows
        },
      ],
      [
        'ended',
        () => {
          setPlaying(false)
          saveProgress({
            titleId: title.id,
            episodeId,
            positionSec: Math.floor(el.duration),
            durationSec: Math.floor(el.duration),
          })
          if (next?.hasVideo && !reduced) setCountdown(COUNTDOWN_SEC)
        },
      ],
    ]
    for (const [name, fn] of handlers) el.addEventListener(name, fn)
    // captions the stream carries (hls.js adds them as text tracks)
    const tracks = el.textTracks
    const isCaption = (t: TextTrack) =>
      t.kind === 'subtitles' || t.kind === 'captions'
    // captions stay as the viewer set them (off by default), even when the stream marks a track as default
    const enforceCaptions = () =>
      Array.from(tracks).forEach((t, i) => {
        if (!isCaption(t)) return
        const want = i === captionChoice.current ? 'showing' : 'disabled'
        if (t.mode !== want) t.mode = want
      })
    const readTracks = () => {
      setCaptions(
        Array.from(tracks)
          .map((t, index) => ({ t, index }))
          .filter(({ t }) => isCaption(t))
          .map(({ t, index }) => ({
            index,
            label: t.label || t.language || `Track ${index + 1}`,
          }))
      )
      enforceCaptions()
    }
    tracks.addEventListener('addtrack', readTracks)
    tracks.addEventListener('change', enforceCaptions)
    return () => {
      for (const [name, fn] of handlers) el.removeEventListener(name, fn)
      tracks.removeEventListener('addtrack', readTracks)
      tracks.removeEventListener('change', enforceCaptions)
      window.clearTimeout(seekTimer)
    }
  }, [
    playback.resumeAt,
    title.id,
    episodeId,
    next,
    reduced,
    save,
    saveProgress,
    logView,
  ])

  // the "Resumed at" note fades after a few seconds
  useEffect(() => {
    if (resumed === null) return
    const timer = window.setTimeout(() => setResumed(null), 6000)
    return () => window.clearTimeout(timer)
  }, [resumed])

  // the autoplay countdown after the episode ends
  useEffect(() => {
    if (countdown === null || !nextHref) return
    if (countdown === 0) {
      navigate(nextHref, { replace: true })
      return
    }
    const timer = window.setTimeout(
      () => setCountdown((c) => (c === null ? c : c - 1)),
      1000
    )
    return () => window.clearTimeout(timer)
  }, [countdown, nextHref, navigate])

  // ---------------------------------------------------------------- actions
  const togglePlay = useCallback(() => {
    const el = video.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }, [])
  const seekTo = useCallback((seconds: number) => {
    const el = video.current
    if (!el || !el.duration) return
    el.currentTime = Math.min(Math.max(0, seconds), el.duration - 0.5)
    setCountdown(null)
  }, [])
  const skip = useCallback(
    (delta: number) => {
      seekTo((video.current?.currentTime ?? 0) + delta)
      setFlash(delta > 0 ? `+${delta}s` : `${delta}s`)
    },
    [seekTo]
  )
  const changeVolume = useCallback((v: number) => {
    const el = video.current
    if (!el) return
    el.volume = Math.min(1, Math.max(0, v))
    el.muted = el.volume === 0
  }, [])
  const toggleMute = useCallback(() => {
    const el = video.current
    if (!el) return
    el.muted = !el.muted
    if (!el.muted && el.volume === 0) el.volume = 0.5
  }, [])
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void shell.current?.requestFullscreen?.()
  }, [])
  const chooseCaption = useCallback((index: number) => {
    const tracks = video.current?.textTracks
    if (!tracks) return
    captionChoice.current = index
    Array.from(tracks).forEach(
      (t, i) => (t.mode = i === index ? 'showing' : 'disabled')
    )
    setCaption(index)
  }, [])
  const toggleCaptions = useCallback(() => {
    if (!captions.length) return
    chooseCaption(caption === -1 ? captions[0].index : -1)
  }, [captions, caption, chooseCaption])
  const goNext = useCallback(() => {
    if (nextHref) navigate(nextHref, { replace: true })
  }, [nextHref, navigate])
  const goBack = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(`/title/${title.slug}`, { replace: true })
  }, [navigate, title.slug])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // a short "+10s" / "Paused" flash in the middle
  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 600)
    return () => window.clearTimeout(timer)
  }, [flash])

  // ---------------------------------------------------------------- controls visibility
  const hideTimer = useRef(0)
  const wake = useCallback(() => {
    setControls(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(
      () => setControls(false),
      HIDE_CONTROLS_MS
    )
  }, [])
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])
  const showControls =
    controls || !playing || panel !== null || countdown !== null

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // events can target the window or document (no .closest)
      const target = e.target instanceof Element ? e.target : document.body
      const onControl = target.closest('button, input, [role=dialog]')
      // Space and Enter on a focused button press that button
      if (onControl && (e.key === ' ' || e.key === 'Enter')) return
      if (target.tagName === 'INPUT' && e.key.startsWith('Arrow')) return
      const el = video.current
      if (!el) return
      let handled = true
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          togglePlay()
          setFlash(el.paused ? 'Play' : 'Pause')
          break
        case 'ArrowLeft':
        case 'j':
        case 'J':
          skip(-SKIP_SEC)
          break
        case 'ArrowRight':
        case 'l':
        case 'L':
          skip(SKIP_SEC)
          break
        case 'ArrowUp':
          changeVolume(el.volume + 0.1)
          break
        case 'ArrowDown':
          changeVolume(el.volume - 0.1)
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'c':
        case 'C':
          toggleCaptions()
          break
        case 'n':
        case 'N':
          goNext()
          break
        case '?':
          setPanel((p) => (p === 'shortcuts' ? null : 'shortcuts'))
          break
        case 'Escape':
          if (panel) setPanel(null)
          else if (!document.fullscreenElement) goBack()
          else handled = false // the browser leaves fullscreen
          break
        default:
          if (/^[0-9]$/.test(e.key) && el.duration)
            seekTo((Number(e.key) / 10) * el.duration)
          else handled = false
      }
      if (handled) {
        e.preventDefault()
        wake()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    togglePlay,
    skip,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    toggleCaptions,
    goNext,
    goBack,
    seekTo,
    panel,
    wake,
  ])

  // ---------------------------------------------------------------- render
  const nearEnd =
    duration > 0 &&
    (time >= duration - UP_NEXT_LAST_SEC || time / duration >= CREDITS_AT)
  const showUpNext =
    Boolean(next?.hasVideo) &&
    (countdown !== null || (nearEnd && !upNextDismissed))
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={shell}
      onPointerMove={wake}
      onPointerDown={wake}
      className={cn(
        'fixed inset-0 z-50 bg-background text-foreground select-none',
        !showControls && 'cursor-none'
      )}
    >
      <video
        ref={video}
        playsInline
        preload='auto'
        poster={title.backdropUrl || undefined}
        aria-label={
          episode ? `${title.title}, ${episodeLabel(episode)}` : title.title
        }
        onClick={() => {
          if (panel) return setPanel(null)
          togglePlay()
        }}
        onDoubleClick={toggleFullscreen}
        className='size-full bg-background object-contain'
      />

      {/* buffering / start */}
      {waiting && !failed && (
        <div
          className='pointer-events-none absolute inset-0 flex items-center justify-center'
          aria-hidden='true'
        >
          <Loader2
            className={cn(
              'size-12 text-foreground/80',
              !reduced && 'animate-spin'
            )}
          />
        </div>
      )}
      {!playing && !waiting && !failed && countdown === null && (
        <button
          type='button'
          onClick={togglePlay}
          aria-label='Play'
          className='absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full glass-strong outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <Play className='size-8 translate-x-0.5 fill-current' />
        </button>
      )}
      {flash && (
        <div
          aria-hidden='true'
          className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full glass px-5 py-2 text-lg font-semibold'
        >
          {flash}
        </div>
      )}
      {failed && (
        <div
          role='alert'
          className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 text-center'
        >
          <p className='font-display text-display-3 font-semibold'>
            This video couldn’t play
          </p>
          <p className='text-foreground/70'>
            Check your connection and try again.
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground'
          >
            Try again
          </button>
        </div>
      )}

      {/* top bar */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-background/80 to-transparent p-4 transition-opacity duration-300 sm:p-6',
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <button
          type='button'
          onClick={goBack}
          aria-label='Back'
          className={iconButton}
        >
          <ArrowLeft className='size-6' />
        </button>
        <div className='min-w-0'>
          <p className='truncate font-display text-lg font-semibold sm:text-xl'>
            {title.title}
          </p>
          {episode && (
            <p className='truncate text-sm text-foreground/75'>
              {episodeLabel(episode)}
            </p>
          )}
        </div>
      </div>

      {resumed !== null && (
        <div
          role='status'
          className='absolute bottom-28 left-4 z-20 flex items-center gap-3 rounded-full glass-strong py-1.5 pr-1.5 pl-4 text-sm sm:left-6'
        >
          Resumed at {formatTime(resumed)}
          <button
            type='button'
            onClick={() => {
              seekTo(0)
              setResumed(null)
            }}
            className='inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <RotateCcw className='size-3.5' /> Start over
          </button>
        </div>
      )}

      {showUpNext && next && (
        <UpNext
          episode={next}
          countdown={countdown}
          onPlay={goNext}
          onCancel={() => {
            setCountdown(null)
            setUpNextDismissed(true)
          }}
        />
      )}

      {/* bottom controls */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent px-4 pt-16 pb-4 transition-opacity duration-300 sm:px-6',
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className='flex items-center gap-3'>
          <Scrubber
            time={time}
            duration={duration}
            buffered={buffered}
            onSeek={seekTo}
          />
          <span className='shrink-0 text-sm text-foreground/80 tabular-nums'>
            {formatTime(time)} / {formatTime(duration)}
          </span>
        </div>
        <div className='mt-1 flex items-center gap-1'>
          <button
            type='button'
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className={iconButton}
          >
            {playing ? (
              <Pause className='size-6 fill-current' />
            ) : (
              <Play className='size-6 fill-current' />
            )}
          </button>
          <button
            type='button'
            onClick={() => skip(-SKIP_SEC)}
            aria-label='Back 10 seconds'
            // phones: drag the scrubber instead; the row has room for the essentials only
            className={cn(iconButton, 'hidden sm:flex')}
          >
            <RotateCcw className='size-5' />
          </button>
          <button
            type='button'
            onClick={() => skip(SKIP_SEC)}
            aria-label='Forward 10 seconds'
            // phones: drag the scrubber instead; the row has room for the essentials only
            className={cn(iconButton, 'hidden sm:flex')}
          >
            <RotateCw className='size-5' />
          </button>
          <div className='group/volume flex items-center'>
            <button
              type='button'
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className={iconButton}
            >
              <VolumeIcon className='size-5' />
            </button>
            <input
              type='range'
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label='Volume'
              className='hidden w-24 accent-[var(--foreground)] sm:block'
            />
          </div>

          <div className='ml-auto flex items-center gap-1'>
            {next?.hasVideo && (
              <button
                type='button'
                onClick={goNext}
                aria-label='Next episode'
                title='Next episode (N)'
                className={iconButton}
              >
                <SkipForward className='size-5' />
              </button>
            )}
            {episode && seasons.length > 0 && (
              <button
                type='button'
                onClick={() =>
                  setPanel((p) => (p === 'episodes' ? null : 'episodes'))
                }
                aria-label='Episodes'
                aria-expanded={panel === 'episodes'}
                className={iconButton}
              >
                <ListVideo className='size-5' />
              </button>
            )}
            {captions.length > 0 && (
              <button
                type='button'
                onClick={toggleCaptions}
                aria-label={
                  caption === -1 ? 'Turn captions on' : 'Turn captions off'
                }
                aria-pressed={caption !== -1}
                className={iconButton}
              >
                <Captions className='size-5' />
              </button>
            )}
            <button
              type='button'
              onClick={() =>
                setPanel((p) => (p === 'settings' ? null : 'settings'))
              }
              aria-label='Settings'
              aria-expanded={panel === 'settings'}
              className={iconButton}
            >
              <Settings className='size-5' />
            </button>
            {'pictureInPictureEnabled' in document &&
              document.pictureInPictureEnabled && (
                <button
                  type='button'
                  onClick={() => {
                    if (document.pictureInPictureElement)
                      void document.exitPictureInPicture()
                    else void video.current?.requestPictureInPicture()
                  }}
                  aria-label='Picture in picture'
                  // phones: drag the scrubber instead; the row has room for the essentials only
                  className={cn(iconButton, 'hidden sm:flex')}
                >
                  <PictureInPicture2 className='size-5' />
                </button>
              )}
            <button
              type='button'
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className={iconButton}
            >
              {fullscreen ? (
                <Minimize className='size-5' />
              ) : (
                <Maximize className='size-5' />
              )}
            </button>
          </div>
        </div>
      </div>

      {panel === 'settings' && (
        <SettingsPanel
          levels={levels}
          level={level}
          playingHeight={playingHeight}
          onLevel={chooseLevel}
          rate={rate}
          onRate={(r) => {
            if (video.current) video.current.playbackRate = r
          }}
          captions={captions}
          caption={caption}
          onCaption={chooseCaption}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'episodes' && episode && (
        <EpisodesPanel
          titleId={title.id}
          seasons={seasons}
          current={episode}
          onPick={(id) =>
            navigate(`/watch/${title.slug}/${id}`, { replace: true })
          }
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'shortcuts' && (
        <ShortcutsPanel onClose={() => setPanel(null)} />
      )}
    </div>
  )
}
