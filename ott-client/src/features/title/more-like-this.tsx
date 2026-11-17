import { cn } from '@/lib/utils'
import { PosterTile } from '@/components/stream/title-tiles'
import { useGetSimilarTitlesQuery } from '@/features/catalog/catalog-api'

/** Same type, most shared genres first. Its cards have the hover preview too; a click opens that title. */
export function MoreLikeThis({
  titleId,
  inset,
}: {
  titleId: string
  inset: boolean
}) {
  const { data, isLoading } = useGetSimilarTitlesQuery({
    id: titleId,
    limit: 12,
  })
  const items = data?.data.results ?? []
  if (!isLoading && items.length === 0) return null

  return (
    <section className='py-8 pb-12' aria-labelledby='similar-heading'>
      <h3
        id='similar-heading'
        className={cn(
          'font-display text-display-3 font-semibold',
          inset ? 'px-6 md:px-10' : 'shell'
        )}
      >
        More Like This
      </h3>
      <ul
        data-lenis-prevent
        className={cn(
          'mt-5 no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4',
          inset ? 'scroll-px-6 px-6 md:scroll-px-10 md:px-10' : 'shell'
        )}
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={i} aria-hidden='true' className='w-32 shrink-0 sm:w-40'>
                <div className='aspect-[2/3] skeleton rounded-xl' />
              </li>
            ))
          : items.map((t) => (
              <li key={t.id} className='w-32 shrink-0 snap-start sm:w-40'>
                <PosterTile title={t} />
              </li>
            ))}
      </ul>
    </section>
  )
}
