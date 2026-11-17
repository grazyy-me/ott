/**
 * RTK Query base with automatic re-authentication.
 * Pattern from the official Redux Toolkit docs ("Preventing multiple unauthorized errors"):
 * https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#preventing-multiple-unauthorized-errors
 * A mutex makes parallel 401s share ONE refresh call instead of each starting its own.
 */
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { ApiResponse, AuthData } from '@/types/api'
import { Mutex } from 'async-mutex'
import type { RootState } from '@/app/store'
import { API_URL } from '@/lib/config'
import { loggedOut, setCredentials } from '@/features/auth/auth-actions'

const mutex = new Mutex()

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/v1`,
  credentials: 'include', // sends the httpOnly refresh cookie
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

// A 401 from these endpoints means bad input (wrong password, expired link), not an expired access token
const NO_REAUTH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-tokens',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
]

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // wait until any refresh in progress has finished
  await mutex.waitForUnlock()
  let result = await rawBaseQuery(args, api, extraOptions)

  const url = typeof args === 'string' ? args : args.url
  const canReauth = !NO_REAUTH.some((path) => url.startsWith(path))

  if (result.error?.status === 401 && canReauth) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire()
      try {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh-tokens', method: 'POST' },
          api,
          extraOptions
        )
        if (refreshResult.data) {
          api.dispatch(
            setCredentials((refreshResult.data as ApiResponse<AuthData>).data)
          )
          result = await rawBaseQuery(args, api, extraOptions)
        } else {
          api.dispatch(loggedOut())
        }
      } finally {
        release()
      }
    } else {
      // another request is refreshing: wait for it, then retry with the new token
      await mutex.waitForUnlock()
      result = await rawBaseQuery(args, api, extraOptions)
    }
  }
  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me'],
  endpoints: () => ({}),
})
