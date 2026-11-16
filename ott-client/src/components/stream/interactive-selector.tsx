/*
 * Adapted from "Interactive Selector" by minhxthanh on 21st.dev:
 * https://21st.dev/@minhxthanh/components/interactive-selector
 * Changes: panels are real buttons (aria-pressed, arrow keys move between them) instead of clickable divs;
 * <img> elements (lazy, sized) instead of CSS background images; it stacks vertically on phones instead of
 * forcing a 600px minimum width; react-icons removed (optional icon slot instead); the entrance uses the
 * shared Stagger primitive (anime.js); stream tokens instead of hard-coded greys.
 * Reduced motion: panels switch without the 700ms grow.
 */
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Stagger, useMotion } from '@/components/motion'

export type SelectorItem = {
  id: string
  title: string
  subtitle?: string
  image: string
  icon?: ReactNode
  /** Link for the button on the open panel */
  href?: string
  /** Button label; default "More info" */
  cta?: string
}

type InteractiveSelectorProps = {
  items: SelectorItem[]
  /** Accessible name for the group */
  label: string
  initialIndex?: number
  className?: string
}

export function InteractiveSelector({
  items,
  label,
  initialIndex = 0,
  className,
}: InteractiveSelectorProps) {
  const [active, setActive] = useState(initialIndex)
  const { reduced } = useMotion()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const move = (to: number) => {
    const next = (to + items.length) % items.length
    setActive(next)
    buttons.current[next]?.focus()
  }

  return (
    <Stagger
      role='group'
      aria-label={label}
      className={cn(
        'flex h-[34rem] w-full flex-col gap-2 md:h-[28rem] md:flex-row',
        className
      )}
      step={110}
      y={0}
    >
      {items.map((item, index) => {
        const open = index === active
        return (
          <div
            key={item.id}
            className={cn(
              'relative min-h-[4.5rem] min-w-14 overflow-hidden rounded-2xl border md:min-h-14',
              open ? 'border-foreground/40' : 'border-border',
              !reduced &&
                'transition-[flex-grow,border-color] duration-700 ease-out-expo'
            )}
            style={{ flex: open ? '7 1 0%' : '1 1 0%' }}
          >
            <button
              ref={(el) => {
                buttons.current[index] = el
              }}
              type='button'
              aria-pressed={open}
              aria-label={open ? item.title : `Show ${item.title}`}
              onClick={() => setActive(index)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  move(index + 1)
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  move(index - 1)
                }
              }}
              className='absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
            >
              <img
                src={item.image}
                alt=''
                loading='lazy'
                decoding='async'
                className={cn(
                  'size-full object-cover',
                  !reduced && 'transition-transform duration-700 ease-out-expo',
                  open ? 'scale-100' : 'scale-110'
                )}
              />
              <span
                aria-hidden='true'
                className={cn(
                  'absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent',
                  !reduced && 'transition-opacity duration-700',
                  open ? 'opacity-100' : 'opacity-60'
                )}
              />
            </button>

            {/* label: the icon always, the text only on the open panel */}
            <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 p-4'>
              {item.icon && (
                <span className='flex size-11 shrink-0 items-center justify-center rounded-full glass'>
                  {item.icon}
                </span>
              )}
              <div
                className={cn(
                  'min-w-0',
                  !reduced &&
                    'transition-[opacity,translate] duration-700 ease-out-expo',
                  open ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                )}
                aria-hidden={!open}
              >
                <p className='truncate font-display text-xl font-bold md:text-2xl'>
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className='mt-1 truncate text-sm text-foreground/75'>
                    {item.subtitle}
                  </p>
                )}
                {item.href && open && (
                  <Link
                    to={item.href}
                    className='pointer-events-auto mt-3 inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground'
                  >
                    {item.cta ?? 'More info'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </Stagger>
  )
}
