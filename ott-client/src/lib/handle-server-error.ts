import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { ApiErrorBody } from '@/types/api'
import { toast } from 'sonner'

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

/** Turns an RTK Query / server error into one sentence a user can act on */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.'
): string {
  if (isFetchBaseQueryError(error)) {
    if (error.status === 'FETCH_ERROR') {
      return "Can't reach the server. Check your connection and try again."
    }
    if (error.status === 'TIMEOUT_ERROR') {
      return 'The server took too long to respond. Try again.'
    }
    const body = error.data as Partial<ApiErrorBody> | undefined
    if (body?.message) return body.message
    if (error.status === 429)
      return 'Too many attempts. Wait a few minutes and try again.'
    return fallback
  }
  const serialized = error as SerializedError | undefined
  return serialized?.message || fallback
}

export function handleServerError(error: unknown, fallback?: string) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(error)
  }
  toast.error(getErrorMessage(error, fallback))
}
