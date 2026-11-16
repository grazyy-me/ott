import type { ApiResponse } from '@/types/api'
import type {
  BrowseFilters,
  Episode,
  Facets,
  Rail,
  RailKey,
  RailPage,
  RailPageKey,
  Genre,
  Paginated,
  SearchParams,
  Season,
  TitleCard,
  TitleDetail,
  TitleListParams,
  TitleType,
} from '@/types/catalog'
import { baseApi } from '@/services/base-api'

// The catalog is public and changes rarely: keep results around a while after a component unmounts,
// so going back to a page or reopening a title modal is instant.
const KEEP_FOR_SECONDS = 300

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Filterable, sortable, paginated list: home rails, browse pages, "see all" */
    getTitles: build.query<
      ApiResponse<Paginated<TitleCard>>,
      TitleListParams | void
    >({
      query: (params) => ({ url: '/titles', params: params ?? undefined }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    /** Detail page / modal: cast, director, seasons */
    getTitle: build.query<ApiResponse<{ title: TitleDetail }>, string>({
      query: (slug) => `/titles/${slug}`,
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    getSimilarTitles: build.query<
      ApiResponse<{ results: TitleCard[] }>,
      { id: string; limit?: number }
    >({
      query: ({ id, limit }) => ({
        url: `/titles/${id}/similar`,
        params: { limit },
      }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    getEpisodes: build.query<
      ApiResponse<{ season: Season; episodes: Episode[] }>,
      { titleId: string; seasonNumber: number }
    >({
      query: ({ titleId, seasonNumber }) =>
        `/titles/${titleId}/seasons/${seasonNumber}/episodes`,
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    /** Genres with title counts; pass a type to count within movies, series or reality only */
    getGenres: build.query<ApiResponse<{ genres: Genre[] }>, TitleType | void>({
      query: (type) => ({
        url: '/genres',
        params: { type: type ?? undefined },
      }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    /** Search by title. The server rejects queries shorter than 2 characters, so `skip` those. */
    searchTitles: build.query<ApiResponse<Paginated<TitleCard>>, SearchParams>({
      query: (params) => ({ url: '/search', params }),
      keepUnusedDataFor: 60,
    }),
  }),
})

/** Args for one rail's grid: the rail, the page type it's shown on, and the FilterBar's filters */
export interface RailTitlesArg extends BrowseFilters {
  key: RailKey
  type?: TitleType
}

const GRID_PAGE_SIZE = 24

export const railsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Every rail of a page in one request. `signedIn` is part of the cache key, so signing in or out
     * refetches (personal rails appear or disappear); the token itself is added by baseApi.
     */
    getRails: build.query<
      ApiResponse<{ page: RailPageKey; rails: Rail[] }>,
      { page: RailPageKey; signedIn: boolean }
    >({
      query: ({ page }) => ({ url: '/rails', params: { page } }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    /** "Show all" and filtered browse: one rail's titles, page after page (infinite scroll) */
    getRailTitles: build.infiniteQuery<
      ApiResponse<RailPage>,
      RailTitlesArg,
      number
    >({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (last) =>
          last.data.page < last.data.totalPages
            ? last.data.page + 1
            : undefined,
      },
      query: ({ queryArg: { key, ...params }, pageParam }) => ({
        url: `/rails/${key}/titles`,
        params: { ...params, page: pageParam, limit: GRID_PAGE_SIZE },
      }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),

    /** Countries, languages and year range present, for the FilterBar */
    getFacets: build.query<ApiResponse<Facets>, TitleType | void>({
      query: (type) => ({
        url: '/titles/facets',
        params: { type: type ?? undefined },
      }),
      keepUnusedDataFor: KEEP_FOR_SECONDS,
    }),
  }),
})

export const {
  useGetRailsQuery,
  useGetRailTitlesInfiniteQuery,
  useGetFacetsQuery,
} = railsApi

export const {
  useGetTitlesQuery,
  useGetTitleQuery,
  useGetSimilarTitlesQuery,
  useGetEpisodesQuery,
  useGetGenresQuery,
  useSearchTitlesQuery,
} = catalogApi
