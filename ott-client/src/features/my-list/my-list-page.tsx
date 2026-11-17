import { useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/lib/use-document-title'
import { BrowseHeader } from '@/features/browse/browse-page'
import { GridMessage, Pager, PosterGrid } from '@/features/browse/poster-grid'
import { useGetWatchlistQuery } from '@/features/catalog/watchlist-api'

const PAGE_SIZE = 24

/** /my-list (signed in): the titles saved with "+ My List", newest first */
export function MyListPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError, refetch } =
    useGetWatchlistQuery({ page, limit: PAGE_SIZE })
  const result = data?.data
  useDocumentTitle('My List')

  return (
    <>
      <BrowseHeader
        eyebrow='Your titles'
        title='My List'
        description='Everything you saved to watch later. Use + on any title to add it here.'
      />
      <section className='shell pb-24' aria-live='polite'>
        {isError ? (
          <GridMessage
            title='Your list didn’t load'
            body='Check your connection and try again.'
            action={
              <button
                type='button'
                onClick={() => refetch()}
                className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                Try again
              </button>
            }
          />
        ) : result && result.totalResults === 0 ? (
          <GridMessage
            title='Nothing saved yet'
            body='Press + on a title’s preview or details to keep it here for later.'
            action={
              <Link
                to='/'
                className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                Find something to watch
              </Link>
            }
          />
        ) : (
          <>
            {result && (
              <p className='mb-6 text-sm text-muted-foreground'>
                {result.totalResults}{' '}
                {result.totalResults === 1 ? 'title' : 'titles'}
              </p>
            )}
            <PosterGrid
              items={result?.results ?? []}
              loading={isLoading || isFetching}
              label='My List'
            />
            {result && (
              <Pager
                page={result.page}
                totalPages={result.totalPages}
                totalResults={result.totalResults}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            )}
          </>
        )}
      </section>
    </>
  )
}
