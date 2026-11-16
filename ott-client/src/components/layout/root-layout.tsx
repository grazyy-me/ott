import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AuthBootstrap } from '@/components/auth/auth-bootstrap'
import { NavigationProgress } from '@/components/navigation-progress'

export function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <NavigationProgress />
      <ScrollRestoration />
      <Outlet />
      <Toaster duration={5000} />
    </>
  )
}
