import { Link, useSearchParams } from 'react-router'
import { AlertCircle } from 'lucide-react'
import { safeRedirect } from '@/lib/redirect'
import { useDocumentTitle } from '@/lib/use-document-title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

const OAUTH_ERRORS: Record<string, string> = {
  oauth_failed:
    "We couldn't sign you in with that account. Try again, or use your email and password.",
  google_not_configured: 'Google sign-in is not set up on the server yet.',
  github_not_configured: 'GitHub sign-in is not set up on the server yet.',
}

export function SignIn() {
  useDocumentTitle('Sign in')
  const [params] = useSearchParams()
  const redirect = params.get('redirect')
  const error = params.get('error')

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4 sm:min-w-sm'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
          <CardDescription>
            New here?{' '}
            <Link
              to='/sign-up'
              className='text-nowrap underline underline-offset-4 hover:text-primary'
            >
              Create an account
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertCircle />
              <AlertDescription>
                {OAUTH_ERRORS[error] ?? OAUTH_ERRORS.oauth_failed}
              </AlertDescription>
            </Alert>
          )}
          <UserAuthForm redirectTo={safeRedirect(redirect)} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
