import { useEffect } from 'react'
import { useRefreshMutation } from '@/features/auth/auth-api'

// Module-level guard: React StrictMode runs effects twice in dev, and a second refresh
// would reuse the already-rotated cookie and sign the user out.
let started = false

/** Restores the session from the httpOnly refresh cookie once per page load */
export function AuthBootstrap() {
  const [refresh] = useRefreshMutation()

  useEffect(() => {
    if (started) return
    started = true
    refresh()
  }, [refresh])

  return null
}
