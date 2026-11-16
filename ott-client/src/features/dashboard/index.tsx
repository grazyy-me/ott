import { Link } from 'react-router'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { selectCurrentUser } from '@/features/auth/auth-slice'

/** Placeholder home page: replace with your app's first real screen */
export function Dashboard() {
  const user = useAppSelector(selectCurrentUser)
  const firstName = user?.name.split(' ')[0]

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='max-w-2xl space-y-6'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>
              Hi {firstName}, you're signed in.
            </h1>
            <p className='text-muted-foreground'>
              This page is a placeholder. Build your first feature in{' '}
              <code className='rounded bg-muted px-1 py-0.5 text-sm'>
                src/features
              </code>{' '}
              and add it to{' '}
              <code className='rounded bg-muted px-1 py-0.5 text-sm'>
                src/routes/router.tsx
              </code>
              .
            </p>
          </div>

          {user && !user.isEmailVerified && (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-4 text-sm'>
              <span>Verify {user.email} to secure your account.</span>
              <Button asChild size='sm' variant='outline'>
                <Link to='/settings'>Go to profile</Link>
              </Button>
            </div>
          )}
        </div>
      </Main>
    </>
  )
}
