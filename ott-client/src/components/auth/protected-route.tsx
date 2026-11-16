import { Navigate, Outlet, useLocation } from 'react-router'
import { useAppSelector } from '@/app/hooks'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { SessionLoader } from './session-loader'

/** Only signed-in users; everyone else goes to /sign-in and comes back afterwards */
export function ProtectedRoute() {
  const status = useAppSelector(selectAuthStatus)
  const location = useLocation()

  if (status === 'checking') return <SessionLoader />

  if (status === 'unauthenticated') {
    const redirect = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/sign-in?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return <Outlet />
}
