import type { TitleListParams } from '@/types/catalog'

/** Shared by the /lab route loader (prefetch) and the page, so both hit the same RTK Query cache entry */
export const LAB_TITLES_QUERY: TitleListParams = { sort: 'popular', limit: 16 }
