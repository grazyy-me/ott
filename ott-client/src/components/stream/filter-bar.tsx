import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { BrowseFilters, TitleType } from '@/types/catalog'
import { countryName, languageName } from '@/lib/locale-names'
import { cn } from '@/lib/utils'
import {
  useGetFacetsQuery,
  useGetGenresQuery,
} from '@/features/catalog/catalog-api'
import { AnimatedChips, type Chip } from './animated-chips'
import { FILTER_KEYS, readFilters, type FilterKey } from './filter-state'
import { GlassSelect, type GlassSelectOption } from './glass-select'

const SORTS: { value: NonNullable<BrowseFilters['sort']>; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Most Watched' },
  { value: 'rating', label: 'Top Rated' },
]

/** The FilterBar's state, read from the URL query (the single source of truth) */

/**
 * Country, Language, Genre and Year dropdowns plus a sort switch, all mirrored in the URL query, so a
 * filtered view can be shared, bookmarked and restored with Back. Active filters show as animated chips.
 */
export function FilterBar({
  type,
  defaultSort,
  className,
}: {
  type?: TitleType
  defaultSort?: BrowseFilters['sort']
  className?: string
}) {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const facets = useGetFacetsQuery(type)
  const genres = useGetGenresQuery(type)
  const loading = facets.isLoading || genres.isLoading

  const options = useMemo(() => {
    const f = facets.data?.data
    const countries: GlassSelectOption[] = (f?.countries ?? [])
      .map((c) => ({
        value: c.code,
        label: countryName(c.code),
        hint: String(c.count),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const languages: GlassSelectOption[] = (f?.languages ?? [])
      .map((l) => ({
        value: l.code,
        label: languageName(l.code),
        hint: String(l.count),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const years: GlassSelectOption[] = f?.years
      ? Array.from({ length: f.years.max - f.years.min + 1 }, (_, i) => {
          const y = String(f.years!.max - i)
          return { value: y, label: y }
        })
      : []
    const genreOptions: GlassSelectOption[] = (
      genres.data?.data.genres ?? []
    ).map((g) => ({
      value: g.slug,
      label: g.name,
      hint: String(g.count),
    }))
    return { countries, languages, years, genres: genreOptions }
  }, [facets.data, genres.data])

  const set = (key: FilterKey, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const clearAll = () => {
    const next = new URLSearchParams(params)
    for (const key of FILTER_KEYS) next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const labelOf = (list: GlassSelectOption[], value?: string) =>
    list.find((o) => o.value === value)?.label ?? value
  const chips: Chip[] = [
    filters.country && {
      id: 'country',
      label: `Country: ${labelOf(options.countries, filters.country)}`,
    },
    filters.language && {
      id: 'language',
      label: `Language: ${labelOf(options.languages, filters.language)}`,
    },
    filters.genre && {
      id: 'genre',
      label: `Genre: ${labelOf(options.genres, filters.genre)}`,
    },
    filters.year && { id: 'year', label: `Year: ${filters.year}` },
  ].filter(Boolean) as Chip[]

  const sort = filters.sort ?? defaultSort

  return (
    <div className={cn('flex shell flex-col gap-4', className)}>
      <div className='flex flex-wrap items-center gap-2'>
        {loading ? (
          // skeleton pills while the options load, the same size as the real controls
          Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              aria-hidden='true'
              className='h-10 w-32 skeleton rounded-full'
            />
          ))
        ) : (
          <>
            <GlassSelect
              label='Country'
              value={filters.country}
              options={options.countries}
              onChange={(v) => set('country', v)}
            />
            <GlassSelect
              label='Language'
              value={filters.language}
              options={options.languages}
              onChange={(v) => set('language', v)}
            />
            <GlassSelect
              label='Genre'
              value={filters.genre}
              options={options.genres}
              onChange={(v) => set('genre', v)}
            />
            <GlassSelect
              label='Year'
              value={filters.year ? String(filters.year) : undefined}
              options={options.years}
              onChange={(v) => set('year', v)}
            />
          </>
        )}

        {/* sort: a segmented switch, Latest / Most Watched / Top Rated */}
        <div
          role='radiogroup'
          aria-label='Sort'
          // full width on phones (it wraps under the dropdowns); pushed right once it fits on one line
          className='flex h-10 w-full items-center rounded-full glass p-1 sm:ml-auto sm:w-auto'
        >
          {SORTS.map((s) => {
            const active = sort === s.value
            return (
              <button
                key={s.value}
                type='button'
                role='radio'
                aria-checked={active}
                onClick={() =>
                  set('sort', s.value === defaultSort ? undefined : s.value)
                }
                className={cn(
                  'h-8 flex-1 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatedChips
        chips={chips}
        onRemove={(id) => set(id as FilterKey, undefined)}
        onClearAll={clearAll}
      />
    </div>
  )
}
