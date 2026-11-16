import { useParams, useSearchParams } from 'react-router'
import type { RailKey, TitleType } from '@/types/catalog'
import { FilterBar } from '@/components/stream/filter-bar'
import { FILTER_KEYS, readFilters } from '@/components/stream/filter-state'
import { RAIL_TITLES } from '@/components/stream/rail-layout'
import { NotFoundError } from '@/features/errors/not-found-error'
import { BrowseHeader } from './browse-page'
import { BROWSE_COPY } from './copy'
import { TitleGrid } from './title-grid'

const TYPES: TitleType[] = ['movie', 'series', 'reality']
const PERSONAL: RailKey[] = [
  'continue-watching',
  'because-you-watched',
  'because-you-watched-2',
]

/** /browse/:key?type=: every title of one rail as an infinite grid, with the FilterBar */
export function ShowAllPage() {
  const { key } = useParams()
  const [params, setParams] = useSearchParams()
  const typeParam = params.get('type') as TitleType | null
  const type = typeParam && TYPES.includes(typeParam) ? typeParam : undefined
  const filters = readFilters(params)

  if (!key || !(key in RAIL_TITLES)) return <NotFoundError />
  const railKey = key as RailKey

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const k of FILTER_KEYS) next.delete(k)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      {/* the header renders at once (no shift when the data arrives); the grid adds the count */}
      <BrowseHeader
        eyebrow={type ? BROWSE_COPY[type].title : 'Everything'}
        title={RAIL_TITLES[railKey]}
      />
      {!PERSONAL.includes(railKey) && <FilterBar type={type} />}
      <TitleGrid
        railKey={railKey}
        type={type}
        filters={PERSONAL.includes(railKey) ? {} : filters}
        onClearFilters={clearFilters}
        header={({ title, total }) => (
          <p className='mb-6 text-sm text-muted-foreground' aria-live='polite'>
            {title !== RAIL_TITLES[railKey] ? `${title} · ` : ''}
            {total} {total === 1 ? 'title' : 'titles'}
          </p>
        )}
      />
    </>
  )
}
