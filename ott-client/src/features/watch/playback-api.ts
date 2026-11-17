import { useCallback } from 'react'
import type { ApiResponse } from '@/types/api'
import type { Rail, RailItem } from '@/types/catalog'
import type { Playback, ProgressUpdate, Stream } from '@/types/playback'
import { toast } from 'sonner'
import { store, type RootState } from '@/app/store'
import { baseApi } from '@/services/base-api'
import { API_URL } from '@/lib/config'
import { railsApi } from '@/features/catalog/catalog-api'

const api = baseApi.enhanceEndpoints({ addTagTypes: ['Rails'] })

export const playbackApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Where to stream from and where to start. Never cached: the URL is short-lived and resumeAt changes. */
    getPlayback: build.query<
      ApiResponse<Playback>,
      { titleId: string; episodeId?: string }
    >({
      query: ({ titleId, episodeId }) => ({
        url: `/playback/${titleId}`,
        method: 'POST',
        body: { episodeId: episodeId ?? null },
      }),
      keepUnusedDataFor: 0,
    }),
    /** The video URL, behind the subscription check (402 → paywall). Never cached. */
    getStream: build.query<
      ApiResponse<Stream>,
      { titleId: string; episodeId?: string }
    >({
      query: ({ titleId, episodeId }) => ({
        url: `/titles/${titleId}/stream`,
        params: episodeId ? { episodeId } : undefined,
      }),
      keepUnusedDataFor: 0,
    }),
    /** One view per viewing session (the server ignores repeats within 30 minutes) */
    logView: build.mutation<
      ApiResponse<{ counted: boolean }>,
      { titleId: string; episodeId?: string | null }
    >({
      query: ({ titleId, episodeId }) => ({
        url: `/playback/${titleId}/view`,
        method: 'POST',
        body: { episodeId: episodeId ?? null },
      }),
    }),
    saveProgress: build.mutation<unknown, ProgressUpdate>({
      query: (body) => ({ url: '/me/progress', method: 'PUT', body }),
      invalidatesTags: ['Rails'],
    }),
    removeFromContinueWatching: build.mutation<void, string>({
      query: (titleId) => ({
        url: `/me/progress/${titleId}`,
        method: 'DELETE',
      }),
      // gone from every loaded rail at once; back if the request fails
      async onQueryStarted(titleId, { dispatch, getState, queryFulfilled }) {
        const entries = railsApi.util
          .selectInvalidatedBy(getState() as RootState, ['Rails'])
          .filter((e) => e.endpointName === 'getRails')
        const patches = entries.map((e) =>
          dispatch(
            railsApi.util.updateQueryData(
              'getRails',
              e.originalArgs,
              (draft) => {
                draft.data.rails = draft.data.rails
                  .map((rail: Rail) =>
                    rail.key === 'continue-watching'
                      ? {
                          ...rail,
                          total: Math.max(0, rail.total - 1),
                          items: rail.items.filter(
                            (t: RailItem) => t.id !== titleId
                          ),
                        }
                      : rail
                  )
                  .filter((rail: Rail) => rail.items.length > 0)
              }
            )
          )
        )
        try {
          await queryFulfilled
        } catch {
          patches.forEach((p) => p.undo())
          toast.error('That didn’t work. Try again.')
        }
      },
    }),
    restoreToContinueWatching: build.mutation<void, string>({
      query: (titleId) => ({
        url: `/me/progress/${titleId}/restore`,
        method: 'POST',
      }),
      invalidatesTags: ['Rails'],
    }),
  }),
})

export const {
  useGetPlaybackQuery,
  useGetStreamQuery,
  useLogViewMutation,
  useSaveProgressMutation,
  useRemoveFromContinueWatchingMutation,
  useRestoreToContinueWatchingMutation,
} = playbackApi

/** "Remove from Continue Watching", with an Undo toast */
export function useRemoveFromContinueWatching() {
  const [remove] = useRemoveFromContinueWatchingMutation()
  const [restore] = useRestoreToContinueWatchingMutation()
  return useCallback(
    (titleId: string, titleName: string) => {
      remove(titleId)
      toast(`Removed ${titleName} from Continue Watching`, {
        action: { label: 'Undo', onClick: () => restore(titleId) },
      })
    },
    [remove, restore]
  )
}

/**
 * Saves progress while the page is going away (tab closed, navigation). `fetch` with keepalive survives the
 * unload and, unlike sendBeacon, can send the Bearer header.
 */
export function saveProgressOnExit(update: ProgressUpdate) {
  const token = (store.getState() as RootState).auth.accessToken
  if (!token) return
  void fetch(`${API_URL}/v1/me/progress`, {
    method: 'PUT',
    keepalive: true,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  }).catch(() => {
    // the page is gone; nothing to tell anyone
  })
}
