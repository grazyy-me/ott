import { createAction } from '@reduxjs/toolkit'
import type { AuthData, User } from '@/types/api'

// Kept outside the slice so base-api.ts can dispatch them without an import cycle
export const setCredentials = createAction<AuthData>('auth/setCredentials')
export const userUpdated = createAction<User>('auth/userUpdated')
export const loggedOut = createAction('auth/loggedOut')
