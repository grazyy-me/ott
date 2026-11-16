import { createBrowserRouter } from 'react-router'
import { store } from '@/app/store'
import { GuestRoute } from '@/components/auth/guest-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RootLayout } from '@/components/layout/root-layout'
import { catalogApi } from '@/features/catalog/catalog-api'
import { ForbiddenError } from '@/features/errors/forbidden'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { UnauthorisedError } from '@/features/errors/unauthorized-error'
import { HOME_QUERIES } from '@/features/home/queries'
import { LAB_TITLES_QUERY } from '@/features/lab/query'

// Fires the request into the RTK Query cache without waiting; the page's hook picks up the same entry
const prefetchHomeData = () => {
  for (const query of Object.values(HOME_QUERIES)) {
    store.dispatch(catalogApi.util.prefetch('getTitles', query, {}))
  }
}

const prefetchLabData = () => {
  store.dispatch(catalogApi.util.prefetch('getTitles', LAB_TITLES_QUERY, {}))
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <GeneralError />,
    children: [
      // Signed-out pages. Lazy, like everything else: the forms (react-hook-form, zod, Radix) would
      // otherwise sit in the entry bundle that every stream page downloads first.
      {
        element: <GuestRoute />,
        children: [
          {
            path: '/sign-in',
            lazy: async () => ({
              Component: (await import('@/features/auth/sign-in')).SignIn,
            }),
          },
          {
            path: '/sign-up',
            lazy: async () => ({
              Component: (await import('@/features/auth/sign-up')).SignUp,
            }),
          },
          {
            path: '/forgot-password',
            lazy: async () => ({
              Component: (await import('@/features/auth/forgot-password'))
                .ForgotPassword,
            }),
          },
          {
            path: '/reset-password',
            lazy: async () => ({
              Component: (await import('@/features/auth/reset-password'))
                .ResetPassword,
            }),
          },
        ],
      },

      // Work signed in or out
      {
        path: '/verify-email',
        lazy: async () => ({
          Component: (await import('@/features/auth/verify-email')).VerifyEmail,
        }),
      },
      {
        path: '/oauth/success',
        lazy: async () => ({
          Component: (await import('@/features/auth/oauth-success'))
            .OAuthSuccess,
        }),
      },

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
                path: '/dashboard',
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

      // Stream pages: public, dark, smooth-scrolled shell (lazy, so motion libraries stay out of other bundles)
      {
        lazy: async () => ({
          Component: (await import('@/components/layout/stream-layout'))
            .StreamLayout,
        }),
        children: [
          {
            path: '/',
            // the hero and first rows' data starts loading in parallel with the page's code
            loader: () => {
              prefetchHomeData()
              return null
            },
            lazy: async () => ({
              Component: (await import('@/features/home')).Home,
            }),
          },
          // browse: rails per type, filtered infinite grids, and each rail's "Show all"
          ...(['movie', 'series', 'reality'] as const).map((type) => ({
            path: type === 'movie' ? '/movies' : `/${type}`,
            lazy: async () => {
              const { BrowsePage } =
                await import('@/features/browse/browse-page')
              return { Component: () => <BrowsePage type={type} /> }
            },
          })),
          {
            path: '/browse/:key',
            lazy: async () => ({
              Component: (await import('@/features/browse/show-all-page'))
                .ShowAllPage,
            }),
          },
          {
            path: '/lab',
            // start the catalog request now, in parallel with downloading the page's code
            loader: () => {
              prefetchLabData()
              return null
            },
            lazy: async () => ({
              Component: (await import('@/features/lab')).Lab,
            }),
          },
          {
            path: '/lab/components',
            lazy: async () => ({
              Component: (await import('@/features/lab/components'))
                .LabComponents,
            }),
          },
          {
            path: '/lab/next',
            lazy: async () => ({
              Component: (await import('@/features/lab/next')).LabNext,
            }),
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
