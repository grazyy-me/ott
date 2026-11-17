import { Navigate, Outlet, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/hooks'
import { safeRedirect } from '@/lib/redirect'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { SessionLoader } from './session-loader'

/** Pages for signed-out users (sign in, sign up…); signed-in users skip past them */
export function GuestRoute() {
  const status = useAppSelector(selectAuthStatus)
  const [params] = useSearchParams()

  if (status === 'checking') return <SessionLoader />
  if (status === 'authenticated') {
    return <Navigate to={safeRedirect(params.get('redirect'))} replace />
  }
  return <Outlet />
}
