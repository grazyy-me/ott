import { useSearchParams } from 'react-router'
import type { TitleType } from '@/types/catalog'
import { Reveal } from '@/components/motion'
import { FilterBar } from '@/components/stream/filter-bar'
import {
  FILTER_KEYS,
  hasFilters,
  readFilters,
} from '@/components/stream/filter-state'
import { BROWSE_COPY } from './copy'
import { RailsView } from './rails-view'
import { TitleGrid } from './title-grid'

/** The page header band shared by the browse and "Show all" pages */
export function BrowseHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <header className='relative overflow-hidden pt-32 pb-8 md:pt-40'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[36rem] max-w-5xl rounded-full'
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklch, var(--stream-glow-2) 18%, transparent), transparent)',
          // the header clips the glow; fade it out first so there's no hard edge above the filter bar
          maskImage: 'linear-gradient(to bottom, black 45%, transparent 85%)',
        }}
      />
      <div className='relative shell'>
        <Reveal>
          <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
            {eyebrow}
          </p>
          <h1 className='mt-4 font-display text-display-1 font-bold text-balance'>
            {title}
          </h1>
          {description && (
            <p className='mt-5 max-w-xl text-lg text-foreground/75'>
              {description}
            </p>
          )}
        </Reveal>
      </div>
    </header>
  )
}

/**
 * Movies / TV Series / Reality Shows: the type's rails; with any filter (or a sort) set in the FilterBar,
 * an infinite grid of everything of that type that matches instead.
 */
export function BrowsePage({ type }: { type: TitleType }) {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const filtering = hasFilters(filters) || Boolean(filters.sort)
  const copy = BROWSE_COPY[type]

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const key of FILTER_KEYS) next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      <BrowseHeader
        eyebrow='Browse'
        title={copy.title}
        description={copy.description}
      />
      <FilterBar type={type} />
      {filtering ? (
        <TitleGrid
          railKey='all'
          type={type}
          filters={filters}
          onClearFilters={clearFilters}
          header={({ total }) => (
            <p
              className='mb-6 text-sm text-muted-foreground'
              aria-live='polite'
            >
              {total} {total === 1 ? 'title' : 'titles'}
            </p>
          )}
        />
      ) : (
        <div className='pt-4 pb-16'>
          <RailsView page={type} type={type} />
        </div>
      )}
    </>
  )
}
