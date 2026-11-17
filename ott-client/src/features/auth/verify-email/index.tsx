import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { getErrorMessage } from '@/lib/handle-server-error'
import { useDocumentTitle } from '@/lib/use-document-title'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVerifyEmailMutation } from '@/features/auth/auth-api'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { AuthLayout } from '../auth-layout'

/** Opened from the link in the verification email; works signed in or out */
export function VerifyEmail() {
  useDocumentTitle('Verify your email')
  const [params] = useSearchParams()
  const token = params.get('token')
  const status = useAppSelector(selectAuthStatus)
  const [verifyEmail, { isLoading, isSuccess, isError, error }] =
    useVerifyEmailMutation()
  const sent = useRef(false)

  useEffect(() => {
    // the token is single-use: never send it twice (StrictMode runs effects twice)
    if (!token || sent.current) return
    sent.current = true
    verifyEmail({ token })
  }, [token, verifyEmail])

  const next =
    status === 'authenticated'
      ? { to: '/', label: 'Go to dashboard' }
      : { to: '/sign-in', label: 'Sign in' }

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4 sm:min-w-sm'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Email verification
          </CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 text-sm' aria-live='polite'>
          {!token && <p>This verification link is incomplete.</p>}
          {token && (isLoading || (!isSuccess && !isError)) && (
            <p className='flex items-center gap-2'>
              <Loader2 className='size-4 animate-spin' /> Verifying your email…
            </p>
          )}
          {isSuccess && (
            <p className='flex items-center gap-2'>
              <CircleCheck className='size-4 text-green-600' /> Your email is
              verified.
            </p>
          )}
          {isError && (
            <p className='flex items-start gap-2'>
              <CircleX className='mt-0.5 size-4 shrink-0 text-destructive' />
              <span>
                {getErrorMessage(error)} You can send a new link from your
                profile page.
              </span>
            </p>
          )}
          <Button asChild variant={isSuccess ? 'default' : 'outline'}>
            <Link to={next.to}>{next.label}</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
