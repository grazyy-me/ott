import type { ReactNode } from 'react'
import type { TitleCard } from '@/types/catalog'
import { PosterTile } from '@/components/stream/title-tiles'

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

/** A plain poster grid with skeletons: the "see all" fallback used by Search and My List */
export function PosterGrid({
  items,
  loading,
  label,
}: {
  items: TitleCard[]
  loading: boolean
  label: string
}) {
  return (
    <ul className={GRID} aria-busy={loading} aria-label={label}>
      {loading
        ? Array.from({ length: 12 }, (_, i) => (
            <li key={i} aria-hidden='true'>
              <div className='aspect-[2/3] skeleton rounded-xl' />
              <div className='mt-2 h-4 w-3/4 skeleton rounded' />
            </li>
          ))
        : items.map((t) => (
            <li key={t.id}>
              <PosterTile title={t} />
            </li>
          ))}
    </ul>
  )
}

/** A centred message for empty and error states, with the one action that helps */
export function GridMessage({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className='py-16 text-center' role='status'>
      <p className='font-display text-display-3 font-semibold text-balance'>
        {title}
      </p>
      {body && (
        <p className='mx-auto mt-3 max-w-md text-foreground/75'>{body}</p>
      )}
      {action && <div className='mt-6 flex justify-center'>{action}</div>}
    </div>
  )
}

export function Pager({
  page,
  totalPages,
  totalResults,
  pageSize,
  onPage,
}: {
  page: number
  totalPages: number
  totalResults: number
  pageSize: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalResults)
  const button =
    'inline-flex h-11 items-center rounded-full glass px-5 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <nav
      aria-label='Pages'
      className='mt-10 flex flex-wrap items-center justify-center gap-4'
    >
      <button
        type='button'
        className={button}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <p className='text-sm text-foreground/75 tabular-nums'>
        {from}–{to} of {totalResults}
      </p>
      <button
        type='button'
        className={button}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
