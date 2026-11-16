import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion'

type SectionHeaderProps = {
  /** Running number, e.g. "01" */
  index?: string
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  /** "See all" style link on the right */
  action?: { label: string; to: string }
  align?: 'left' | 'center'
  className?: string
}

/** Editorial band header: numbered eyebrow, display title, one line of copy, and an optional pill link. */
export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
}: SectionHeaderProps) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'shell flex flex-col gap-6',
        centered
          ? 'items-center text-center'
          : 'md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <Reveal className={cn(centered && 'flex flex-col items-center')}>
        <p className='flex items-center gap-3 text-eyebrow font-semibold text-muted-foreground uppercase'>
          {index && (
            <span className='text-foreground/90 tabular-nums'>{index}</span>
          )}
          {index && (
            <span aria-hidden='true' className='h-px w-8 bg-stream-gradient' />
          )}
          {eyebrow}
        </p>
        <h2 className='mt-4 max-w-[18ch] font-display text-display-2 font-bold text-balance'>
          {title}
        </h2>
        {description && (
          <p className='mt-4 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg'>
            {description}
          </p>
        )}
      </Reveal>
      {action && (
        <Reveal delay={120} className='shrink-0'>
          <Link
            to={action.to}
            className='group inline-flex h-11 items-center gap-2 rounded-full glass px-5 text-sm font-semibold transition-colors hover:bg-accent'
          >
            {action.label}
            <ArrowRight
              aria-hidden='true'
              className='size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none'
            />
          </Link>
        </Reveal>
      )}
    </div>
  )
}
