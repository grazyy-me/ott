import type { ApiResponse } from '@/types/api'
import type {
  Episode,
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

export const {
  useGetTitlesQuery,
  useGetTitleQuery,
  useGetSimilarTitlesQuery,
  useGetEpisodesQuery,
  useGetGenresQuery,
  useSearchTitlesQuery,
} = catalogApi
