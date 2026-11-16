# ott-client

Streamly OTT frontend (React + Vite), built on the MERN starter kit. Pairs with **ott-server**. Project decisions live in `../CLAUDE.md`.

- React 19 + Vite + TypeScript, Tailwind CSS 4, shadcn/ui
- Redux Toolkit + RTK Query, with automatic token refresh: when the access token expires, one refresh call runs and the failed requests retry, even if several fail at once
- React Router 7 with protected and guest routes, and a return to the requested page after sign-in
- Pages: sign in, sign up, forgot password, reset password, verify email, Google/GitHub sign-in, dashboard, profile (photo upload, name, password, email verification), appearance
- Light/dark theme, font choice, collapsible sidebar, ⌘K command menu

## Quick start

Start the server first, then:

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # http://localhost:5173
```

## How sign-in works

1. Sign-in returns an **access token** (kept only in Redux memory, never in localStorage) and sets a **refresh token** in an httpOnly cookie that JavaScript can't read.
2. On every page load, `AuthBootstrap` calls `/auth/refresh-tokens`. The cookie restores the session, so reloading keeps you signed in. Until that call finishes, protected pages show a loading screen.
3. When an API call returns 401, `base-api.ts` refreshes the token once and retries the call. A mutex makes parallel requests share that one refresh.
4. Google/GitHub sign-in is a full-page redirect: the server sets the cookie and sends the user to `/oauth/success`, where the bootstrap takes over.

## Adding a page

1. Create it in `src/features/<name>/index.tsx`.
2. Add a route in `src/routes/router.tsx` inside the `ProtectedRoute` block (signed-in) or the `GuestRoute` block (signed-out).
3. Add it to `src/components/layout/data/sidebar-data.ts` to show it in the sidebar and ⌘K menu.

## Adding an API call

Inject endpoints into the shared API, as in `src/features/user/user-api.ts`:

```ts
export const postsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPosts: build.query<ApiResponse<Post[]>, void>({ query: () => '/posts' }),
  }),
})
export const { useGetPostsQuery } = postsApi
```

The access token and the 401 refresh are handled for you.

## Project structure

```
src/
├── app/            Redux store and typed hooks
├── services/       base-api.ts: RTK Query + re-auth
├── features/
│   ├── auth/       slice, auth endpoints, sign-in/up, password and email pages
│   ├── user/       profile endpoints
│   ├── dashboard/
│   ├── settings/   profile and appearance
│   └── errors/
├── components/
│   ├── auth/       route guards, session bootstrap, OAuth buttons
│   ├── layout/     sidebar, header, root layout
│   └── ui/         shadcn/ui components
├── routes/         router.tsx
├── lib/            config, error messages, validation, utils
└── types/          API response types
```

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Vite).
2. Set `VITE_API_URL` to your Render URL (and optionally `VITE_APP_NAME`).
3. Put the Vercel URL in the server's `CLIENT_URL`.

`vercel.json` rewrites every path to `index.html`, so refreshing on `/settings` doesn't 404.

Read **Cross-domain cookies** in the server README: on `vercel.app` + `onrender.com`, Safari users are signed out on reload until you use a custom domain for both.

## Credits

Built on [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT). See `THIRD_PARTY_NOTICES.md`.
