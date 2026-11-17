import { useEffect, useState, type ReactNode } from 'react'
import type { Season } from '@/types/catalog'
import type { PlaybackEpisode } from '@/types/playback'
import { Check, X } from 'lucide-react'
import { formatRuntime } from '@/lib/title-format'
import { tmdbImage } from '@/lib/tmdb-image'
import { cn } from '@/lib/utils'
import { useGetEpisodesQuery } from '@/features/catalog/catalog-api'
import type { QualityLevel } from './use-hls'

/*
 * Panels drawn inside the player (not in portals): in fullscreen only the player element is on screen, so a
 * popover rendered into <body> would be invisible.
 */

function Panel({
  label,
  onClose,
  className,
  children,
}: {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role='dialog'
      aria-label={label}
      className={cn(
        'absolute z-30 overflow-hidden rounded-2xl glass-strong text-sm shadow-2xl',
        className
      )}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div className='flex items-center justify-between border-b border-border px-4 py-3'>
        <p className='font-semibold'>{label}</p>
        <button
          type='button'
          onClick={onClose}
          aria-label={`Close ${label.toLowerCase()}`}
          className='flex size-8 items-center justify-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
        >
          <X className='size-4' />
        </button>
      </div>
      {children}
    </div>
  )
}

function Choice({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type='button'
      role='menuitemradio'
      aria-checked={selected}
      onClick={onSelect}
      className='flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2 text-left outline-none hover:bg-accent focus-visible:bg-accent'
    >
      {children}
      {selected && <Check aria-hidden='true' className='size-4' />}
    </button>
  )
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** One choice per height (a stream can have several bitrates at 1080p): the best one, tallest first */
const byHeight = (levels: QualityLevel[]) => {
  const best = new Map<number, QualityLevel>()
  for (const l of levels) {
    const kept = best.get(l.height)
    if (!kept || l.bitrate > kept.bitrate) best.set(l.height, l)
  }
  return [...best.values()].sort((a, b) => b.height - a.height)
}

/** One choice per caption label (streams can carry the same language twice) */
const byLabel = <T extends { label: string }>(tracks: T[]) =>
  tracks.filter((t, i) => tracks.findIndex((u) => u.label === t.label) === i)

/** Quality (hls.js levels; none for Safari's own HLS), speed and captions */
export function SettingsPanel({
  levels,
  level,
  playingHeight,
  onLevel,
  rate,
  onRate,
  captions,
  caption,
  onCaption,
  onClose,
}: {
  levels: QualityLevel[]
  level: number
  playingHeight: number | null
  onLevel: (index: number) => void
  rate: number
  onRate: (rate: number) => void
  captions: { index: number; label: string }[]
  caption: number
  onCaption: (index: number) => void
  onClose: () => void
}) {
  return (
    <Panel
      label='Settings'
      onClose={onClose}
      className='right-4 bottom-24 w-[min(22rem,calc(100%-2rem))]'
    >
      <div className='grid max-h-[55vh] gap-4 overflow-y-auto p-3 sm:grid-cols-2'>
        {levels.length > 0 && (
          <div role='menu' aria-label='Quality'>
            <p className='px-3 pb-1 text-eyebrow font-semibold text-muted-foreground uppercase'>
              Quality
            </p>
            <Choice selected={level === -1} onSelect={() => onLevel(-1)}>
              Auto{level === -1 && playingHeight ? ` (${playingHeight}p)` : ''}
            </Choice>
            {byHeight(levels).map((l) => (
              <Choice
                key={l.index}
                selected={level === l.index}
                onSelect={() => onLevel(l.index)}
              >
                {l.height}p
              </Choice>
            ))}
          </div>
        )}
        <div role='menu' aria-label='Speed'>
          <p className='px-3 pb-1 text-eyebrow font-semibold text-muted-foreground uppercase'>
            Speed
          </p>
          {RATES.map((r) => (
            <Choice key={r} selected={rate === r} onSelect={() => onRate(r)}>
              {r === 1 ? 'Normal' : `${r}×`}
            </Choice>
          ))}
        </div>
        {captions.length > 0 && (
          <div role='menu' aria-label='Captions'>
            <p className='px-3 pb-1 text-eyebrow font-semibold text-muted-foreground uppercase'>
              Captions
            </p>
            <Choice selected={caption === -1} onSelect={() => onCaption(-1)}>
              Off
            </Choice>
            {byLabel(captions).map((c) => (
              <Choice
                key={c.index}
                selected={caption === c.index}
                onSelect={() => onCaption(c.index)}
              >
                {c.label}
              </Choice>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

/** A series' episodes, season by season; the one playing is marked */
export function EpisodesPanel({
  titleId,
  seasons,
  current,
  onPick,
  onClose,
}: {
  titleId: string
  seasons: Season[]
  current: PlaybackEpisode
  onPick: (episodeId: string) => void
  onClose: () => void
}) {
  const [seasonNumber, setSeasonNumber] = useState(current.seasonNumber)
  const { data, isFetching } = useGetEpisodesQuery({ titleId, seasonNumber })
  const episodes =
    data?.data.season.seasonNumber === seasonNumber ? data.data.episodes : []

  // the playing episode in view when the panel opens
  useEffect(() => {
    if (seasonNumber !== current.seasonNumber) return
    document
      .getElementById(`episode-${current.id}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [episodes.length, seasonNumber, current])

  return (
    <Panel
      label='Episodes'
      onClose={onClose}
      className='top-4 right-4 bottom-24 flex w-[min(26rem,calc(100%-2rem))] flex-col'
    >
      {seasons.length > 1 && (
        <div
          className='no-scrollbar flex gap-1 overflow-x-auto border-b border-border p-2'
          role='tablist'
          aria-label='Seasons'
        >
          {seasons.map((s) => (
            <button
              key={s.id}
              type='button'
              role='tab'
              aria-selected={s.seasonNumber === seasonNumber}
              onClick={() => setSeasonNumber(s.seasonNumber)}
              className={cn(
                'h-8 shrink-0 rounded-full px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.seasonNumber === seasonNumber
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Season {s.seasonNumber}
            </button>
          ))}
        </div>
      )}
      <ol className='flex-1 overflow-y-auto p-2' aria-busy={isFetching}>
        {episodes.map((e) => {
          const playing = e.id === current.id
          return (
            <li key={e.id} id={`episode-${e.id}`}>
              <button
                type='button'
                onClick={() => onPick(e.id)}
                aria-current={playing || undefined}
                disabled={!e.hasVideo}
                className={cn(
                  'flex w-full gap-3 rounded-xl p-2 text-left outline-none hover:bg-accent focus-visible:bg-accent disabled:opacity-50',
                  playing && 'bg-accent'
                )}
              >
                <div className='relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted'>
                  {e.stillUrl && (
                    <img
                      src={tmdbImage(e.stillUrl, 'w300')}
                      alt=''
                      loading='lazy'
                      className='size-full object-cover'
                    />
                  )}
                  {playing && (
                    <span
                      className='absolute inset-x-0 bottom-0 h-1 bg-stream-gradient'
                      aria-hidden='true'
                    />
                  )}
                </div>
                <div className='min-w-0'>
                  <p className='truncate font-medium'>
                    {e.episodeNumber}. {e.name || `Episode ${e.episodeNumber}`}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {playing
                      ? 'Playing'
                      : e.hasVideo
                        ? formatRuntime(e.runtime)
                        : 'Not available yet'}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Space / K', 'Play or pause'],
  ['← / J', 'Back 10 seconds'],
  ['→ / L', 'Forward 10 seconds'],
  ['↑ / ↓', 'Volume'],
  ['M', 'Mute'],
  ['F', 'Fullscreen'],
  ['C', 'Captions'],
  ['N', 'Next episode'],
  ['0 – 9', 'Jump to 0% – 90%'],
  ['Esc', 'Close a panel, leave fullscreen, or go back'],
  ['?', 'This list'],
]

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel
      label='Keyboard shortcuts'
      onClose={onClose}
      className='top-1/2 left-1/2 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2'
    >
      <dl className='grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4'>
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className='contents'>
            <dt>
              <kbd className='rounded-md border border-border px-1.5 py-0.5 font-mono text-xs'>
                {keys}
              </kbd>
            </dt>
            <dd className='text-foreground/80'>{action}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
