import type { TitleListParams } from '@/types/catalog'

/** Shared by the "/" route loader (prefetch) and the page, so both hit the same RTK Query cache entries */
export const HOME_QUERIES = {
  movies: { type: 'movie', sort: 'popular', limit: 16 },
  series: { type: 'series', sort: 'popular', limit: 16 },
  reality: { type: 'reality', sort: 'popular', limit: 12 },
  topRated: { sort: 'rating', limit: 16 },
} satisfies Record<string, TitleListParams>
