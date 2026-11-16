import { createSlice } from '@reduxjs/toolkit'
import type { User } from '@/types/api'
import type { RootState } from '@/app/store'
import { loggedOut, setCredentials, userUpdated } from './auth-actions'

/**
 * The access token lives only in memory (never localStorage or a readable cookie).
 * On page load the app calls POST /auth/refresh-tokens; the httpOnly refresh cookie
 * restores the session. Until that call settles, status is 'checking'.
 */
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: User | null
  accessToken: string | null
  status: AuthStatus
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'checking',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setCredentials, (state, { payload }) => {
        state.user = payload.user
        state.accessToken = payload.accessToken
        state.status = 'authenticated'
      })
      .addCase(userUpdated, (state, { payload }) => {
        state.user = payload
      })
      .addCase(loggedOut, () => ({
        ...initialState,
        status: 'unauthenticated',
      }))
  },
})

export default authSlice.reducer

export const selectAuth = (state: RootState) => state.auth
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthStatus = (state: RootState) => state.auth.status
