/** Shapes returned by ott-server */
export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isEmailVerified: boolean
  hasPassword: boolean
  avatar: { url: string }
  createdAt: string
  updatedAt: string
}

/** Every successful JSON response: see server/src/utils/ApiResponse.js */
export interface ApiResponse<T> {
  statusCode: number
  data: T
  message: string
  success: true
}

/** Every error response: see server/src/middlewares/error.js */
export interface ApiErrorBody {
  statusCode: number
  message: string
  success: false
}

export interface AuthData {
  user: User
  accessToken: string
  accessTokenExpires: string
}
