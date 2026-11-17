import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { TitleType } from '@/types/catalog'
import { Search } from 'lucide-react'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { BrowseHeader } from '@/features/browse/browse-page'
import { GridMessage, Pager, PosterGrid } from '@/features/browse/poster-grid'
import { useSearchTitlesQuery } from '@/features/catalog/catalog-api'

const PAGE_SIZE = 24
const TYPES: { value: TitleType | ''; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'movie', label: 'Movies' },
  { value: 'series', label: 'Series' },
  { value: 'reality', label: 'Reality' },
]

/**
 * /search?q=&type=&page=: the query lives in the URL (shareable, Back works).
 * Two letters minimum, as the API requires.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const typeParam = params.get('type') as TitleType | null
  const type =
    typeParam && ['movie', 'series', 'reality'].includes(typeParam)
      ? typeParam
      : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [draft, setDraft] = useState(q)
  const inputId = useId()
  useDocumentTitle(q ? `Search: ${q}` : 'Search')

  // the URL follows the input after a pause (and resets to page 1)
  useEffect(() => {
    const trimmed = draft.trim()
    if (trimmed === q) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      next.delete('page')
      setParams(next, { replace: true, preventScrollReset: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [draft, q, params, setParams])

  const ready = q.length >= 2
  const { data, isFetching, isError, refetch } = useSearchTitlesQuery(
    { q, type, page, limit: PAGE_SIZE },
    { skip: !ready }
  )
  const result = data?.data
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, {
      replace: key !== 'page',
      preventScrollReset: key !== 'page',
    })
  }

  return (
    <>
      <BrowseHeader eyebrow='Search' title='Find a title' />
      <section className='shell pb-24'>
        <form
          role='search'
          onSubmit={(e) => e.preventDefault()}
          className='max-w-2xl'
        >
          <label
            htmlFor={inputId}
            className='text-sm font-medium text-foreground/85'
          >
            Title name
          </label>
          <div className='relative mt-2'>
            <Search
              aria-hidden='true'
              className='pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground'
            />
            <input
              id={inputId}
              type='search'
              autoComplete='off'
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='For example: Breaking Bad'
              className='h-12 w-full rounded-full glass pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
            />
          </div>
        </form>

        <div
          role='radiogroup'
          aria-label='Type'
          className='mt-5 flex flex-wrap gap-2'
        >
          {TYPES.map((t) => {
            const active = (type ?? '') === t.value
            return (
              <button
                key={t.label}
                type='button'
                role='radio'
                aria-checked={active}
                onClick={() => setParam('type', t.value || undefined)}
                className={cn(
                  'h-11 rounded-full px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'glass text-foreground/80 hover:bg-accent'
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className='mt-10' aria-live='polite'>
          {!ready ? (
            <GridMessage
              title={q.length === 1 ? 'Keep typing' : 'Search by title'}
              body='Type at least two letters of a movie, series or reality show.'
            />
          ) : isError ? (
            <GridMessage
              title='Search didn’t load'
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
              title={`No titles match “${q}”`}
              body='Try a shorter part of the name, or browse by genre instead.'
              action={
                <Link
                  to='/movies'
                  className='inline-flex h-11 items-center rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
                >
                  Browse movies
                </Link>
              }
            />
          ) : (
            <>
              {result && (
                <p className='mb-6 text-sm text-muted-foreground'>
                  {result.totalResults}{' '}
                  {result.totalResults === 1 ? 'title' : 'titles'} match “{q}”
                </p>
              )}
              <PosterGrid
                items={result?.results ?? []}
                loading={!result || isFetching}
                label='Search results'
              />
              {result && (
                <Pager
                  page={result.page}
                  totalPages={result.totalPages}
                  totalResults={result.totalResults}
                  pageSize={PAGE_SIZE}
                  onPage={(p) => setParam('page', String(p))}
                />
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
