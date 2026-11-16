import { createBrowserRouter } from 'react-router'
import { GuestRoute } from '@/components/auth/guest-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RootLayout } from '@/components/layout/root-layout'
import { ForgotPassword } from '@/features/auth/forgot-password'
import { OAuthSuccess } from '@/features/auth/oauth-success'
import { ResetPassword } from '@/features/auth/reset-password'
import { SignIn } from '@/features/auth/sign-in'
import { SignUp } from '@/features/auth/sign-up'
import { VerifyEmail } from '@/features/auth/verify-email'
import { ForbiddenError } from '@/features/errors/forbidden'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { UnauthorisedError } from '@/features/errors/unauthorized-error'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <GeneralError />,
    children: [
      // Signed-out pages
      {
        element: <GuestRoute />,
        children: [
          { path: '/sign-in', element: <SignIn /> },
          { path: '/sign-up', element: <SignUp /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/reset-password', element: <ResetPassword /> },
        ],
      },

      // Work signed in or out
      { path: '/verify-email', element: <VerifyEmail /> },
      { path: '/oauth/success', element: <OAuthSuccess /> },

      // Signed-in app
      {
        element: <ProtectedRoute />,
        children: [
          {
            // Signed-in pages load on demand, so the sign-in page stays small
            lazy: async () => ({
              Component: (
                await import('@/components/layout/authenticated-layout')
              ).AuthenticatedLayout,
            }),
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/dashboard')).Dashboard,
                }),
              },
              {
                path: '/settings',
                lazy: async () => ({
                  Component: (await import('@/features/settings')).Settings,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/settings/profile'))
                        .SettingsProfile,
                    }),
                  },
                  {
                    path: 'appearance',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/settings/appearance')
                      ).SettingsAppearance,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },

      // Error pages
      { path: '/401', element: <UnauthorisedError /> },
      { path: '/403', element: <ForbiddenError /> },
      { path: '/500', element: <GeneralError /> },
      { path: '*', element: <NotFoundError /> },
    ],
  },
])
