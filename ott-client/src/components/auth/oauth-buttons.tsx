import { IconGithub, IconGoogle } from '@/assets/brand-icons'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'

/**
 * OAuth is a full-page redirect, not a fetch: the server sends the user to Google/GitHub,
 * sets the refresh cookie on the way back, then redirects to /oauth/success.
 */
export function OAuthButtons({ disabled }: { disabled?: boolean }) {
  return (
    <>
      <div className='relative my-2'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs'>
          <span className='bg-card px-2 text-muted-foreground'>
            Or continue with
          </span>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Button variant='outline' type='button' disabled={disabled} asChild>
          <a href={`${API_URL}/v1/auth/google`}>
            <IconGoogle className='size-4' /> Google
          </a>
        </Button>
        <Button variant='outline' type='button' disabled={disabled} asChild>
          <a href={`${API_URL}/v1/auth/github`}>
            <IconGithub className='size-4' /> GitHub
          </a>
        </Button>
      </div>
    </>
  )
}
