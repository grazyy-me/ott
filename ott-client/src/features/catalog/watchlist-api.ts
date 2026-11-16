import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ApiResponse } from '@/types/api'
import type { Paginated, TitleCard } from '@/types/catalog'
import { toast } from 'sonner'
import { useAppSelector } from '@/app/hooks'
import { baseApi } from '@/services/base-api'
import { selectAuthStatus } from '@/features/auth/auth-slice'

const api = baseApi.enhanceEndpoints({ addTagTypes: ['Watchlist'] })

export const watchlistApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Every title id on My List: cards read "added" from this instead of a request each */
    getWatchlistIds: build.query<ApiResponse<{ ids: string[] }>, void>({
      query: () => '/me/watchlist/ids',
      providesTags: ['Watchlist'],
    }),
    getWatchlist: build.query<
      ApiResponse<Paginated<TitleCard & { addedAt: string }>>,
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/me/watchlist',
        params: params ?? undefined,
      }),
      providesTags: ['Watchlist'],
    }),
    setInWatchlist: build.mutation<void, { titleId: string; inList: boolean }>({
      query: ({ titleId, inList }) => ({
        url: `/me/watchlist/${titleId}`,
        method: inList ? 'PUT' : 'DELETE',
      }),
      // the button flips at once, and flips back if the request fails
      async onQueryStarted({ titleId, inList }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          watchlistApi.util.updateQueryData(
            'getWatchlistIds',
            undefined,
            (draft) => {
              const ids = new Set(draft.data.ids)
              if (inList) ids.add(titleId)
              else ids.delete(titleId)
              draft.data.ids = [...ids]
            }
          )
        )
        try {
          await queryFulfilled
          dispatch(watchlistApi.util.invalidateTags(['Watchlist']))
        } catch {
          patch.undo()
          toast.error('My List couldn’t be updated. Try again.')
        }
      },
    }),
  }),
})

export const {
  useGetWatchlistIdsQuery,
  useGetWatchlistQuery,
  useSetInWatchlistMutation,
} = watchlistApi

/** My List state for one title. Signed out, toggling goes to sign-in and comes back to this page. */
export function useWatchlistToggle(titleId: string, titleName: string) {
  const status = useAppSelector(selectAuthStatus)
  const signedIn = status === 'authenticated'
  const { data } = useGetWatchlistIdsQuery(undefined, { skip: !signedIn })
  const [setInWatchlist, { isLoading }] = useSetInWatchlistMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const inList = Boolean(data?.data.ids.includes(titleId))

  const toggle = useCallback(() => {
    if (!signedIn) {
      const back = `${location.pathname}${location.search}`
      navigate(`/sign-in?redirect=${encodeURIComponent(back)}`)
      return
    }
    setInWatchlist({ titleId, inList: !inList })
    toast.success(
      inList
        ? `Removed ${titleName} from My List`
        : `Added ${titleName} to My List`
    )
  }, [signedIn, inList, titleId, titleName, setInWatchlist, navigate, location])

  return { inList, toggle, busy: isLoading }
}
