import { useEffect, useRef, type ReactNode } from 'react'
import type {
  BrowseFilters,
  RailItem,
  RailKey,
  TitleType,
} from '@/types/catalog'
import { cn } from '@/lib/utils'
import { useReveal } from '@/components/motion'
import { LandscapeTile, PosterTile } from '@/components/stream/title-tiles'
import { useGetRailTitlesInfiniteQuery } from '@/features/catalog/catalog-api'

const WIDE: RailKey[] = ['continue-watching', 'coming-soon']

/** Each tile reveals on its own as it scrolls in, so appending a page never re-animates the earlier ones */
function GridItem({ title, wide }: { title: RailItem; wide: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  useReveal(ref, { y: 24, duration: 700 })
  return (
    <li ref={ref}>
      {wide ? (
        <LandscapeTile
          title={title}
          variant={
            title.progress
              ? 'continue'
              : title.releaseDate && new Date(title.releaseDate) > new Date()
                ? 'coming'
                : 'default'
          }
        />
      ) : (
        <PosterTile title={title} />
      )}
    </li>
  )
}

/**
 * "Show all": an infinite grid of one rail (or `all`), with the FilterBar's filters. The next page loads
 * when a sentinel 800px below the last row comes near the viewport. Skeleton tiles while loading.
 * (A paged grid is allowed here as the "see all" fallback; main surfaces stay rails.)
 */
export function TitleGrid({
  railKey,
  type,
  filters,
  onClearFilters,
  header,
}: {
  railKey: RailKey
  type?: TitleType
  filters: BrowseFilters
  onClearFilters?: () => void
  /** Renders above the grid once the rail's title and size are known */
  header?: (info: { title: string; total: number }) => ReactNode
}) {
  const {
    // currentData, not data: data would keep showing the previous filters' titles while the new ones load
    currentData: data,
    isFetching,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useGetRailTitlesInfiniteQuery({ key: railKey, type, ...filters })
  const sentinel = useRef<HTMLDivElement>(null)
  const wide = WIDE.includes(railKey)
  const isLoading = !data && isFetching
  const items = data?.pages.flatMap((p) => p.data.results) ?? []
  const first = data?.pages[0]?.data

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '0px 0px 800px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const gridClass = wide
    ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  const skeletons = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <li key={`s${i}`} aria-hidden='true'>
        <div
          className={cn(
            'skeleton rounded-xl',
            wide ? 'aspect-video' : 'aspect-[2/3]'
          )}
        />
        {!wide && <div className='mt-2 h-4 w-3/4 skeleton rounded' />}
      </li>
    ))

  return (
    <section className='shell pt-6 pb-24'>
      {first && header?.({ title: first.title, total: first.totalResults })}

      {isError ? (
        <div className='py-20 text-center'>
          <p className='text-lg text-foreground/80'>This list didn’t load.</p>
          <button
            type='button'
            onClick={() => refetch()}
            className='mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
          >
            Try again
          </button>
        </div>
      ) : !isLoading && items.length === 0 ? (
        <div className='py-20 text-center'>
          <p className='font-display text-display-3 font-semibold'>
            Nothing matches these filters
          </p>
          <p className='mt-3 text-foreground/70'>
            Try another country, language, genre or year.
          </p>
          {onClearFilters && (
            <button
              type='button'
              onClick={onClearFilters}
              className='mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground'
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul
          className={gridClass}
          aria-busy={isLoading || isFetchingNextPage}
          aria-label={first?.title ?? 'Titles'}
        >
          {isLoading
            ? skeletons(12)
            : items.map((t) => <GridItem key={t.id} title={t} wide={wide} />)}
          {isFetchingNextPage && skeletons(wide ? 3 : 6)}
        </ul>
      )}

      <div ref={sentinel} aria-hidden='true' className='h-px' />
      {!hasNextPage && items.length > 0 && (
        <p className='mt-12 text-center text-sm text-muted-foreground'>
          That’s all {first?.totalResults} titles.
        </p>
      )}
    </section>
  )
}
