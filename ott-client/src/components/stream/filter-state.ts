import type { BrowseFilters } from '@/types/catalog'

export const FILTER_KEYS = [
  'country',
  'language',
  'genre',
  'year',
  'sort',
] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export function readFilters(params: URLSearchParams): BrowseFilters {
  const sort = params.get('sort')
  const year = Number(params.get('year'))
  return {
    country: params.get('country') ?? undefined,
    language: params.get('language') ?? undefined,
    genre: params.get('genre') ?? undefined,
    year: Number.isInteger(year) && year > 0 ? year : undefined,
    sort:
      sort === 'latest' || sort === 'popular' || sort === 'rating'
        ? sort
        : undefined,
  }
}

/** Whether any filter other than the sort is set */
export const hasFilters = (f: BrowseFilters) =>
  Boolean(f.country || f.language || f.genre || f.year)
