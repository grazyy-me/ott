import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Full-screen state while the app checks for a session on load.
 * Render's free tier sleeps after ~15 idle minutes, so the first request can take
 * 30+ seconds: after a few seconds we say why the wait is long.
 */
export function SessionLoader() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      role='status'
      aria-live='polite'
      className='flex h-svh flex-col items-center justify-center gap-3 px-6 text-center'
    >
      <Loader2 className='size-6 animate-spin text-muted-foreground' />
      <p className='text-sm text-muted-foreground'>
        {slow
          ? 'Starting the server. After a quiet spell this can take up to a minute.'
          : 'Loading your account…'}
      </p>
    </div>
  )
}
