import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AuthBootstrap } from '@/components/auth/auth-bootstrap'
import { NavigationProgress } from '@/components/navigation-progress'

export function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <NavigationProgress />
      {/* The first entry of every full page load has key 'default', so keying by it alone would restore
          the last page's offset on a new URL typed into the same tab. Key that entry by path instead. */}
      <ScrollRestoration
        getKey={(location) =>
          location.key === 'default' ? location.pathname : location.key
        }
      />
      <Outlet />
      <Toaster duration={5000} />
    </>
  )
}
