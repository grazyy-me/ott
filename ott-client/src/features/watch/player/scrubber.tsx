import { useRef, useState, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { formatTime } from './format'

/**
 * The seek bar: played and buffered ranges, a time tooltip under the pointer, drag to seek (the video
 * seeks once, on release). Keyboard seeking is the player's arrow keys; this is announced as a slider.
 */
export function Scrubber({
  time,
  duration,
  buffered,
  onSeek,
}: {
  time: number
  duration: number
  buffered: number
  onSeek: (seconds: number) => void
}) {
  const bar = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)

  const at = (e: PointerEvent) => {
    const rect = bar.current!.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    return ratio * duration
  }
  const shown = drag ?? time
  const pct = (s: number) => (duration ? `${(s / duration) * 100}%` : '0%')

  return (
    <div
      ref={bar}
      role='slider'
      tabIndex={0}
      aria-label='Seek'
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
      onPointerDown={(e) => {
        if (!duration) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(at(e))
      }}
      onPointerMove={(e) => {
        if (!duration) return
        const t = at(e)
        setHover(t)
        if (drag !== null) setDrag(t)
      }}
      onPointerUp={(e) => {
        if (drag === null) return
        onSeek(at(e))
        setDrag(null)
      }}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => setHover(null)}
      className='group relative flex h-6 min-w-0 flex-1 cursor-pointer touch-none items-center outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <div className='relative h-1 w-full overflow-hidden rounded-full bg-foreground/20 transition-[height] group-hover:h-1.5'>
        <div
          className='absolute inset-y-0 left-0 bg-foreground/35'
          style={{ width: pct(buffered) }}
        />
        <div
          className='absolute inset-y-0 left-0 bg-stream-gradient'
          style={{ width: pct(shown) }}
        />
      </div>
      <div
        aria-hidden='true'
        className={cn(
          'absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow transition-transform',
          drag !== null ? 'scale-125' : 'scale-0 group-hover:scale-100'
        )}
        style={{ left: pct(shown) }}
      />
      {hover !== null && (
        <div
          aria-hidden='true'
          className='pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground tabular-nums'
          style={{ left: pct(hover) }}
        >
          {formatTime(hover)}
        </div>
      )}
    </div>
  )
}
