import { Link, Navigate } from 'react-router'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/button'
import { SessionLoader } from '@/components/auth/session-loader'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { AuthLayout } from '../auth-layout'

/**
 * The server redirects here after Google/GitHub sign-in, with the refresh cookie set.
 * The app-wide bootstrap (AuthBootstrap) exchanges it for a session on load.
 */
export function OAuthSuccess() {
  const status = useAppSelector(selectAuthStatus)

  if (status === 'checking') return <SessionLoader />
  if (status === 'authenticated') return <Navigate to='/' replace />

  return (
    <AuthLayout>
      <div className='mx-auto grid max-w-sm gap-4 text-center text-sm'>
        <p>
          We couldn't finish signing you in. If your browser blocks third-party
          cookies, allow them for this site or use email and password.
        </p>
        <Button asChild>
          <Link to='/sign-in'>Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
