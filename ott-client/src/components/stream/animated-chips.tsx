/*
 * Adapted from "Animated Tags" by socolled on 21st.dev:
 * https://21st.dev/@socolled/components/animated-tags
 * Kept: chips rise in with a little blur when added and drop out with blur when removed.
 * Changes: framer-motion layout animations replaced by anime.js (CLAUDE.md keeps framer for route and modal
 * transitions); a removed chip stays mounted until its exit finishes; real remove buttons with accessible names;
 * a "Clear all" action; stream glass tokens.
 * Reduced motion: chips appear and disappear without movement.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { X } from 'lucide-react'
import { useMotion } from '@/components/motion'

export type Chip = { id: string; label: string }

function ChipItem({
  chip,
  leaving,
  onRemove,
  onGone,
}: {
  chip: Chip
  leaving: boolean
  onRemove: (id: string) => void
  onGone: (id: string) => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  const { reduced } = useMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (leaving) {
      if (reduced) {
        onGone(chip.id)
        return
      }
      const out = animate(el, {
        opacity: [1, 0],
        y: [0, 10],
        filter: ['blur(0px)', 'blur(4px)'],
        duration: 220,
        ease: 'in(2)',
        onComplete: () => onGone(chip.id),
      })
      return () => {
        out.pause()
      }
    }
    if (reduced) return
    const enter = animate(el, {
      opacity: [0, 1],
      y: [10, 0],
      filter: ['blur(4px)', 'blur(0px)'],
      duration: 320,
      ease: 'out(3)',
    })
    return () => {
      enter.revert()
    }
    // only on entering and on leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <li
      ref={ref}
      className='flex h-9 items-center gap-1 rounded-full glass pr-1 pl-3.5 text-sm'
    >
      <span className='truncate'>{chip.label}</span>
      <button
        type='button'
        disabled={leaving}
        onClick={() => onRemove(chip.id)}
        aria-label={`Remove ${chip.label}`}
        className='flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
      >
        <X className='size-3.5' aria-hidden='true' />
      </button>
    </li>
  )
}

/** The active filters as removable chips, with a "Clear all" action */
export function AnimatedChips({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: Chip[]
  onRemove: (id: string) => void
  onClearAll?: () => void
}) {
  // chips removed since the last render stay on screen until their exit animation ends
  const [previous, setPrevious] = useState(chips)
  const [leaving, setLeaving] = useState<Chip[]>([])
  if (previous !== chips) {
    const removed = previous.filter((p) => !chips.some((c) => c.id === p.id))
    setPrevious(chips)
    if (removed.length)
      setLeaving((current) => [
        ...current.filter((l) => !removed.some((r) => r.id === l.id)),
        ...removed,
      ])
  }
  const shown = [
    ...chips.map((chip) => ({ chip, leaving: false })),
    ...leaving
      .filter((l) => !chips.some((c) => c.id === l.id))
      .map((chip) => ({ chip, leaving: true })),
  ]
  if (!shown.length) return null

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <ul
        aria-label='Active filters'
        className='flex flex-wrap items-center gap-2'
      >
        {shown.map(({ chip, leaving: isLeaving }) => (
          <ChipItem
            key={chip.id}
            chip={chip}
            leaving={isLeaving}
            onRemove={onRemove}
            onGone={(id) =>
              setLeaving((current) => current.filter((l) => l.id !== id))
            }
          />
        ))}
      </ul>
      {onClearAll && chips.length > 1 && (
        <button
          type='button'
          onClick={onClearAll}
          className='h-9 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
        >
          Clear all
        </button>
      )}
    </div>
  )
}
