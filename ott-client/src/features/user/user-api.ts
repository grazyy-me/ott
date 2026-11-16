import type { ApiResponse, User } from '@/types/api'
import { baseApi } from '@/services/base-api'
import { userUpdated } from '@/features/auth/auth-actions'

type UserResponse = ApiResponse<{ user: User }>

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<UserResponse, void>({
      query: () => '/users/me',
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(userUpdated(data.data.user))
        } catch {
          // handled by the caller
        }
      },
    }),
    updateMe: build.mutation<
      UserResponse,
      Partial<{ name: string; password: string }>
    >({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(userUpdated(data.data.user))
        } catch {
          // handled by the caller
        }
      },
    }),
    updateAvatar: build.mutation<UserResponse, File>({
      query: (file) => {
        const body = new FormData()
        body.append('avatar', file)
        return { url: '/users/me/avatar', method: 'PATCH', body }
      },
      invalidatesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(userUpdated(data.data.user))
        } catch {
          // handled by the caller
        }
      },
    }),
  }),
})

export const { useGetMeQuery, useUpdateMeMutation, useUpdateAvatarMutation } =
  userApi
