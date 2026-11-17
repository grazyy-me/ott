import type { ApiResponse, AuthData, User } from '@/types/api'
import { baseApi } from '@/services/base-api'
import { loggedOut, setCredentials, userUpdated } from './auth-actions'

type MessageResponse = ApiResponse<null>

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<
      ApiResponse<AuthData>,
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials(data.data))
        } catch {
          // errors are shown by the form that called the mutation
        }
      },
    }),
    register: build.mutation<
      ApiResponse<AuthData>,
      { name: string; email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials(data.data))
        } catch {
          // errors are shown by the form that called the mutation
        }
      },
    }),
    /** Restores the session from the httpOnly refresh cookie */
    refresh: build.mutation<ApiResponse<AuthData>, void>({
      query: () => ({ url: '/auth/refresh-tokens', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials(data.data))
        } catch {
          dispatch(loggedOut())
        }
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } finally {
          // sign out locally even if the server call fails
          dispatch(loggedOut())
          dispatch(baseApi.util.resetApiState())
        }
      },
    }),
    forgotPassword: build.mutation<MessageResponse, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: build.mutation<
      MessageResponse,
      { token: string; password: string }
    >({
      query: ({ token, password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        params: { token },
        body: { password },
      }),
    }),
    verifyEmail: build.mutation<ApiResponse<{ user: User }>, { token: string }>(
      {
        query: ({ token }) => ({
          url: '/auth/verify-email',
          method: 'POST',
          params: { token },
        }),
        async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
          try {
            const { data } = await queryFulfilled
            // only update the store if this browser is signed in as that user
            const state = getState() as unknown as {
              auth: { user: User | null }
            }
            if (state.auth.user?.id === data.data.user.id) {
              dispatch(userUpdated(data.data.user))
            }
          } catch {
            // shown by the page
          }
        },
      }
    ),
    sendVerificationEmail: build.mutation<MessageResponse, void>({
      query: () => ({ url: '/auth/send-verification-email', method: 'POST' }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useSendVerificationEmailMutation,
} = authApi
