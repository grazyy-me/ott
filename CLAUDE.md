# Streamly (working name) — OTT streaming platform

Cinematic OTT site (Netflix / Apple TV+ feel) with Movies, TV Series and Reality Shows, monthly and yearly
subscriptions, some free titles, and Continue Watching. Built on the MERN starter kit (`D:\mern-starter-kit`).

The name is a placeholder. It lives in exactly two places: `VITE_APP_NAME` (client) and `APP_NAME` (server,
used by `EMAIL_FROM` and email templates). Never hard-code "Streamly" anywhere else.

## Repos and layout

- `ott-server/`: Express + MongoDB API, deployed to Render. Copied from `mern-starter-server`.
- `ott-client/`: React 19 + Vite + TS + Tailwind 4 + shadcn, deployed to Vercel. Copied from `mern-starter-client`.
- These are two separate git repos, like the kit. Run the server on port 5000, then the client on 5173.
- Secrets go only in `.env` files, never in a README or CLAUDE.md. (The kit's root README once held live
  MongoDB credentials; they must be rotated and never copied here.)

## Reuse the kit, don't rebuild it

Already in the kit, keep using it as is:
- auth (JWT access token in memory, rotating httpOnly refresh cookie), Google/GitHub OAuth, email verify and reset
- RTK Query `baseApi` with mutex re-auth: add endpoints with `baseApi.injectEndpoints`
- shadcn/ui, sonner toasts, react-hook-form + zod forms
- Resend emails (`services/email.service.js`, `templates/email.js`)
- Multer + Cloudinary uploads (`middlewares/upload.js`, `utils/cloudinary.js`)
- `ApiResponse` / `ApiError` / `catchAsync`, the `toJSON` (`private: true`) and `paginate` plugins, roles and rights
- the kit's sidebar `AuthenticatedLayout` and settings pages, reused for `/admin/*` and inside `/account`

## Agreed decisions

1. **Validation:** new catalog routes validate with **zod** (`middlewares/validateZod.js`, schemas in
   `validations/catalog.validation.js`). The kit's auth and user routes keep Joi (`middlewares/validate.js`), so
   both exist on the server; use zod for anything new. The client uses zod for forms.
2. **Video:** TMDB provides metadata and YouTube trailer keys only. Playback is HLS: Cloudinary video with
   streaming profiles and short-lived signed URLs from `POST /v1/playback/:titleId`. Dev uses open-licensed test
   HLS streams. Video files are uploaded straight from the browser to Cloudinary (signed upload); they never
   pass through Render.
3. **Access** (changed 2026-11-16 by the user): browsing is public. **Free titles play for anyone, guests
   included** (guests get no progress or views saved, and a "Sign in to keep your place" note). Everything else
   needs an active subscription. The video URL comes only from `GET /titles/:id/stream` behind
   `requireSubscription` (402 `SUBSCRIPTION_REQUIRED` with `requires: account|subscription`).
4. **Plans:** INR via Razorpay Subscriptions. Prices are ₹199/month and ₹1,999/year (`amountPaise`, in
   `src/config/plans.js` only). The Razorpay webhook is the source of truth; `/billing/verify` only unlocks access
   early. Entitled = authenticated, active, pending, or cancelled with `currentPeriodEnd` in the future.
5. **Reality shows:** a TMDB `tv` title with genre 10764 becomes `type: 'reality'` at import. Admins can override it.
6. **TMDB:** called only from the server, with `TMDB_API_KEY` (v3) or `TMDB_READ_TOKEN` (v4). The catalog is
   **seeded into MongoDB** by `ott-server/scripts/importTmdb.js` (`npm run seed:tmdb`), not fetched live, so
   there is no `TmdbCache` or `tmdb.service.js`. The credentials never reach the client. Titles store full TMDB
   image URLs (`posterUrl` w780, `backdropUrl` w1280). Show TMDB attribution in the footer (not built yet).
7. **Catalog schema:** `Title` (type movie|series|reality, genres as `Genre` refs, `cast` and `crew` as `Person`
   refs), `Season`, `Episode`, `Genre`, `Person`, `WatchProgress`, `Watchlist`, `ViewEvent`. A title is unique by
   `{tmdbType, tmdbId}` (TMDB ids repeat across movies and tv). `videoUrl` is `private` and never in a catalog
   response; clients see `hasVideo` and `isFree`. `viewCount` is incremented by the playback service (phase 4)
   and drives the "popular" sort, with TMDB `popularity` as tie-breaker until real views exist.
8. **Free titles:** 15 (8 movies, 4 series, 3 reality, best-rated first) carry open-licence demo HLS streams
   (Blender / Apple samples) until real video is attached; a free series or reality show has the stream on every
   episode. The import never overwrites `isFree`, `videoUrl`, `isPublished`, `slug` or `viewCount`.

## Stack additions

Client: `three`, `@react-three/fiber`, `@react-three/drei`, `lenis`, `animejs` (v4), `framer-motion`, `hls.js`,
`embla-carousel-react`. zod is already installed.
Server: `razorpay`.

## Design rules

- Dark theme only on stream pages: large display type, glass panels, subtle grain overlay, accent gradient.
  Stream tokens live in `ott-client/src/styles/stream.css`, applied while `StreamLayout` sets
  `html[data-surface='stream']` (so portals get them too); don't put raw colors in components. Utilities:
  `glass`, `glass-strong`, `shell` (page gutter), `scrim-bottom`, `scrim-left`, `bg-stream-gradient`; colours
  `glow-1..3`; type `text-display-1..3`, `text-eyebrow`, `font-display` (Bricolage Grotesque).
- The accent gradient is for accents only (bars, dots, rings, glows), **never on text**.
- Fonts are self-hosted in `public/fonts` and preloaded with `font-display: optional` (no layout shift); no
  Google Fonts request. Refresh with `npm run fonts:copy`.
- TMDB images: resize stored URLs with `tmdbImage(url, size)` (`lib/tmdb-image.ts`), smallest size that covers
  the rendered width at 2x.
- No classic poster grid for main surfaces. Use a pinned hero, spotlight bands, mixed rails (poster, backdrop,
  Top 10 with numerals, coverflow) and editorial collection bands. A paged grid is allowed only as a "see all"
  fallback.
- **Use 21st.dev first.** Before writing any UI from scratch (hero, navbar, carousels, cards, pricing, tabs,
  filters, modals), search the 21st.dev MCP. Adapt what you pick to our tokens and put it in
  `src/components/stream/`, with a header comment giving the source URL and author, plus an entry in
  `THIRD_PARTY_NOTICES.md`. Check the license first, and reject or rewrite components that bring another
  animation library (e.g. GSAP). Fetching code is paid and needs `API_KEY_21ST`.
  **Adapted and in use** (`src/components/stream/`, demoed on `/lab/components`):
  `StreamNav` (Floating Glassmorphic Navbar), `FilmstripHero` (Hero Carousel: the featured-titles hero),
  `InteractiveSelector`, `CoverflowCarousel` (Glassy Coverflow), `EndlessCorridor` (Endless),
  `CurvedLensCarousel` (3D Curved Carousel, WebGL), `ChapterHero` (Scroll-Triggered Video Hero),
  `GlassSelect` (Liquid Select: FilterBar dropdowns, Radix Popover + cmdk), `AnimatedChips` (Animated Tags:
  active-filter chips, anime.js enter/exit).
  Tried and dropped: Scroll media expansion hero (replaced by FilmstripHero as the page hero).
  Searched and not used (written in-house instead): HoverPlayCard (ruixen.ui; built around an MP4 `<video>`,
  while our trailers are YouTube) and Morphing Dialog (patrick-xin; built on framer `layoutId`, while the
  card-to-modal morph uses View Transitions) for the hover preview and title modal.
  Still candidates: PrismaHero, Pricing Plans with Billing Toggle, Pricing Section
  with Frequency Toggle.
  Adapting rules learned so far: never keep scroll hijacking (wheel `preventDefault`, `scrollTo` loops); drive
  scroll effects from `PinnedSection` / anime.js `onScroll`; replace GSAP and framer scroll hooks with anime.js;
  read reduced motion from `useMotion()`, not only the OS query; drop a component's own grain or fonts.

## Motion rules

- **Lenis** is the only smooth-scroll source: one instance, owned by the root `MotionProvider` (mounted in
  `main.tsx`), created by `useSmoothScroll()` in `StreamLayout` so lenis/anime.js stay out of the auth and
  admin bundles. One frame loop drives everything: `lenis.raf()` → anime.js `scrollContainers` re-read the
  position → `engine.update()` (anime.js's own loop is off while the stream shell is mounted). Never start
  a second Lenis or a second rAF loop for scroll effects.
- **Motion hooks** (`components/motion`): `useLenis(cb?)`, `useReveal(ref, opts)`, `useParallax(ref, opts)`,
  `useScrollProgress(trigger, cb, { range })`, `useHideOnScroll()`. Ranges: `through`, `out`, `pin`.
  Write styles directly in scroll callbacks (no React state per frame).
- Scroll hooks create their observers in a passive effect: a trigger ref on a parent component is not
  attached yet when a child's layout effects run (bit us when a prefetched hero mounted with its page).
  `useScrollProgress` also derives progress from the container's scrollY on every scroll event, so jumps
  past either end (Home link, scroll restoration, a fling) settle at exactly 0 or 1.
- `useParallax` writes transforms from `useScrollProgress`; it does **not** use scroll-linked anime.js
  animations (`autoplay: onScroll({ sync })`), which did not advance for a pinned-wrapper trigger.
- `Stagger` / `useReveal({ stagger })` re-run only when the item count changes, never on `children` identity.
- **anime.js v4** handles every scroll-linked effect, parallax, stagger and timeline.
- **framer-motion** is only for `AnimatePresence` route and modal transitions. Use it for nothing else.
- **Three.js** has one canvas only, the home hero scene (`components/three/HeroScene`). It's lazy-loaded, pauses
  when off screen, and falls back to a static image on low-end devices or with reduced motion.
  The one other WebGL canvas allowed is `CurvedLensCarousel` (raw WebGL, no Three.js): it only renders while
  on screen, stops once its spring settles, and falls back to a plain image. Don't put it on the same screen as
  the hero scene.
- Content that is the LCP element (hero titles and copy) uses `<Reveal fade={false}>`: visible at first paint,
  it only slides in. A fading LCP element costs about a second of LCP.
- Start a page's catalog request in its route `loader` (`catalogApi.util.prefetch`), so it runs in parallel
  with the page's code download (see `/lab` in `routes/router.tsx`).
- Every section gets scroll motion: parallax backdrops, staggered reveals, and a pinned or scroll-linked hero.
  Build it from the primitives in `components/motion/` (Reveal, Stagger, Parallax, PinnedSection,
  ScrollProgress, RouteTransition).
- **`prefers-reduced-motion`:** Lenis off, no pinning, static hero, reveals become opacity fades only, no autoplay.
- Call `lenis.stop()` while a modal or the player is open. Embla rails and nested scroll areas get `data-lenis-prevent`.
- Keep pinning short, and shorter on touch devices.
- Trailers use `youtube-nocookie` through the IFrame API (`components/stream/trailer/`). A hover held for 400ms on
  desktop counts as the load action (muted, autoplay, in the hover preview); otherwise they load on click.
  With reduced motion or Save-Data, previews never autoplay. **One trailer iframe at a time**: a player claims
  `trailer-slot.ts` before creating its iframe, which destroys the previous one synchronously.

## Folder additions

```
ott-server/src/
  config/config.js        + TMDB_READ_TOKEN, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
                            PLAYBACK_URL_TTL, APP_NAME (Joi-validated, feature off with a warning when unset)
  config/roles.js         + admin rights: manageContent, manageBilling
  models/                 + title, episode, homeRail, plan, subscription, payment, paymentEvent,
                            watchProgress, tmdbCache, watchlist (optional)
  services/               + tmdb, catalog, rail, playback, entitlement, billing, progress
  controllers/ validations/ routes/v1/  + catalog, playback, me, billing, webhooks, admin
  middlewares/optionalAuth.js   sets req.user when a Bearer token is present
  templates/email.js      + subscription started / renewal failed / cancelled
  scripts/                seed-plans.js, import-tmdb.js, sync-plans.js
  app.js                  mount /v1/webhooks/razorpay with express.raw() BEFORE express.json()

ott-client/src/
  styles/theme.css, styles/motion.css
  context/motion-provider.tsx
  components/motion/  components/three/  components/stream/
  components/layout/stream-layout.tsx     public shell (nav, grain, Lenis, footer)
  features/catalog  title  player  search  billing  account  admin
  lib/tmdb-image.ts  lib/schemas/
```

## Data model (Mongoose, all with toJSON + paginate + timestamps)

- **Title**:
  - `type` (movie|series|reality), `tmdbId`, `tmdbType` (movie|tv), `slug` (unique)
  - `title`, `originalTitle`, `tagline`, `overview`, `genres[{tmdbId,name}]`
  - `releaseDate`, `year`, `runtimeMin`, `certification`, `languages`, `rating{average,count}`
  - `cast[]` (top 10), `creators[]`, `images{poster,backdrop,logo}` (TMDB paths), `accentColor`
  - `trailers[{site,key,name,official}]`, `seasons[{number,name,overview,poster,airDate,episodeCount}]`
  - `isFree`, `isPublished`, `featured{hero,rank}`, `popularity`, `tmdbSyncedAt`
  - `playback{provider,sourceId,durationSec}` (private, movies only)
  - Indexes: `{tmdbId,tmdbType}` unique, `{type,isPublished,popularity:-1}`, text on title + overview.
- **Episode**: `title` ref, `seasonNumber`, `episodeNumber`, `name`, `overview`, `still`, `airDate`, `runtimeMin`,
  `isFree`, `playback` (private). Unique `{title,seasonNumber,episodeNumber}`.
- **HomeRail**: `key` (unique), `heading`, `order`, `isActive`, `kind` (manual|query|continue|top10),
  `layout` (spotlight|poster|backdrop|top10|coverflow), `titles[]`, `query{type,genreId,sort,isFree}`.
- **Plan**: `code` (unique), `name`, `interval` (monthly|yearly), `amountPaise`, `currency` 'INR', `razorpayPlanId`,
  `features[]`, `maxQuality`, `screens`, `isActive`, `sortOrder`.
- **Subscription**: `user` (indexed), `plan`, `razorpaySubscriptionId` (unique), `status`
  (created|authenticated|active|pending|halted|cancelled|completed|expired), `currentStart`, `currentEnd`,
  `cancelAtCycleEnd`, `endedAt`. A user is entitled when `status` is active or authenticated, or when it is
  cancelled and `currentEnd > now`.
- **Payment**: `user`, `subscription`, `razorpayPaymentId` (unique), `invoiceId`, `amountPaise`, `status`, `paidAt`.
- **PaymentEvent**: `eventId` (unique, from `x-razorpay-event-id`), `type`, `payload`, `processedAt`. Makes webhooks idempotent.
- **WatchProgress**: `user`, `title`, `episode` (null for movies), `positionSec`, `durationSec`, `completed`
  (true past 95%). Unique `{user,title,episode}`, index `{user,updatedAt:-1}`.
- **TmdbCache**: `key` (unique), `data`, `expiresAt` (TTL). **Watchlist** (optional): unique `{user,title}`.
- `User` is unchanged.

## API (under /v1; the kit's routes stay as they are)

Public, with optionalAuth:
- `GET /catalog/home`
- `GET /titles?type&genre&year&free&sort&page&limit`
- `GET /titles/:slug` (returns `canPlay` and `reason`)
- `GET /titles/:id/seasons/:n/episodes`
- `GET /titles/:id/similar`
- `GET /genres?type`
- `GET /search?q&type`
- `GET /plans`

Bearer:
- `POST /playback/:titleId` with `{episodeId?}` returns `{src,expiresAt,resumeAt}`, or 402/403 with a reason
- `GET /me/continue-watching`, `PUT /me/progress`, `DELETE /me/progress/:titleId`
- `/me/watchlist[/:titleId]` (optional)
- `POST /billing/subscriptions` with `{planCode}` returns `{subscriptionId,keyId}`
- `POST /billing/verify`, `GET /billing/me`, `POST /billing/cancel` (at cycle end), `GET /billing/payments`

Webhook:
- `POST /webhooks/razorpay`: raw body, HMAC signature check, idempotent.

Admin (`manageContent`):
- `GET /admin/tmdb/search`, `POST /admin/titles/import`
- `PATCH|DELETE /admin/titles/:id`, `POST /admin/titles/:id/refresh`
- `PATCH /admin/episodes/:id`
- `POST /admin/media/signature`
- CRUD `/admin/rails`

Admin (`manageBilling`):
- CRUD `/admin/plans` (creates the Razorpay plan)
- `GET /admin/subscriptions`

Document every new route in the `ott-server` README table, as the kit does.

## Pages

- Home `/`
- Movies `/movies`, Series `/series`, Reality `/reality`
- Title `/title/:slug`: a modal over the background location, or a full page on a direct link
- Watch `/watch/:slug[/:episodeId]` (protected)
- Search `/search`
- Pricing `/pricing` (`/plans` redirects); checkout opens in place, no separate result page
- Account `/account` (protected: kit profile + subscription + payments)
- My List (optional)
- Admin `/admin/*` (kit sidebar layout)
- The kit's auth and error pages, restyled

## Implementation notes

- The progress heartbeat runs every ~10–15s and on pause. On page hide, use `fetch(..., { keepalive: true })`
  with the Bearer header (`sendBeacon` can't send it).
- hls.js is lazy-loaded in the player; Safari uses native HLS.
- The client CSP must allow YouTube (nocookie), `image.tmdb.org`, Razorpay Checkout and the video CDN.
- Budget: initial JS ≤ 250 KB gzipped. Three.js and hls.js are never in the main chunk.
- Local Razorpay webhooks need a tunnel (cloudflared or ngrok).

## Status

- Phase 0 (2026-11-16): the kit is copied and renamed, `APP_NAME` and the OTT env keys are added, the new deps
  are installed, both repos have `git init`, and the database name is `ott`. `/v1/health` is ok and the client
  builds and lints clean.
  Still open: rotate the MongoDB Atlas password, then test email and Google sign-in in the browser.
  Committed in both repos.
- Phase 2, catalog (2026-11-16): models, zod-validated public routes (`/titles`, `/titles/:slug`,
  `/titles/:id/similar`, `/titles/:id/seasons/:n/episodes`, `/genres`, `/search`), the TMDB seed script, and the
  client's types (`src/types/catalog.ts`) and RTK Query hooks (`src/features/catalog/catalog-api.ts`).
  Tested end to end against a fake TMDB server and a throwaway database (49 endpoint checks pass, the import is
  idempotent, a forced 429 is handled).
  The real seed has run on the `ott` database: 500 global titles (300 movies, 150 series, 50 reality), then 156
  regional ones from 14 language groups (`REGIONS` in the script), 656 in total, 15 free. Re-running is safe.
- Phase 1, design system and motion (2026-11-16): stream tokens, self-hosted fonts, grain, glass,
  MotionProvider (Lenis + reduced-motion preference), primitives, StreamLayout with the adapted navbar and
  footer, route transitions; `/lab`, `/lab/next`, `/lab/components`. Six more 21st.dev components adapted;
  `FilmstripHero` is the hero (featured titles in a filmstrip, autoplay that pauses on hover, focus and scroll-away).
  Checked: reduced motion (OS emulation and the /lab toggle) leaves no pin, no Lenis, no hidden content and no
  movement; CLS 0.004. **Not met:** mobile Lighthouse performance on `/lab` is 80 (target 85): FCP 3.1 s,
  LCP 4.0 s, TBT 130 ms. The remaining cost is the 111 KB (gzip) entry bundle, about half unused on stream
  pages. The kit's auth pages are now lazy; next candidates are the kit's root providers and Toaster.
  The kit's top loading bar keeps a static 2° tilt in reduced mode (decorative, not movement).
  Committed in ott-client (`2a0cf35`). The old `TmdbCache` / `Plan` / `Subscription` /
  `HomeRail` models in the data model below are superseded or still to come; the code is the source of truth.

- App shell and Home hero (2026-11-16; the user called it "phase 4", it is the Home part of phase 3 below):
  - Home at `/` (stream shell); the kit dashboard moved to `/dashboard`. `/movies`, `/series`, `/reality`,
    `/my-list`, `/search` are linked from the navbar but not built yet (404).
  - Navbar: Home, Movies, TV Series, Reality Shows, My List, search, profile menu (kit DropdownMenu +
    SignOutDialog); full links from 1024px, menu button below; hides on scroll down, shows on scroll up,
    stays while a menu is open or focus is inside it.
  - Hero: `FilmstripHero` pinned for 35svh while the first rows rise over it (scales to 0.92, fades to 0.15);
    depth parallax backdrop -4% / strip -12% / copy -20% of the wrapper; title words rise with anime.js
    stagger, details follow. Three.js `HeroAtmosphere` / `HeroScene` behind the copy: DPR ≤ 1.5, 1.2k
    particles (500 touch), renders only on screen, idle-loaded (≥ 3.5 s on touch), gradient fallback for
    reduced motion / no WebGL / < 4 cores / < 4 GB / Save-Data.
  - Measured (production build, Intel UHD, Chrome): desktop 1440×900 idle 85 fps, title change 70 fps,
    smooth scroll 110 fps, no frames over 33 ms during change/scroll. Mobile 390×844 @3x with 4× CPU
    throttle: 25–50 fps, worst frames 1.3 s during load. Fixed along the way: per-backdrop blend layers
    (one shared grade now), card height animation (clip-path now), Stagger re-running on every render,
    stuck pin progress after jumps, parallax not running on the hero.
  - Home below the hero is editorial bands, not rows (the user rejected plain poster rails as "classic"):
    01 Trending (CoverflowCarousel with trailers), 02 Top 10 series (TopTenRail: outlined rank numerals),
    03 Moods (InteractiveSelector: the five biggest genres among loaded titles, each with its top backdrop),
    an EndlessCorridor interlude (catalogue size + CTA; vignette keeps the headline readable), 04 Reality
    (LandscapeRail: 16:9 backdrop cards). Each band: `SectionHeader` (numbered eyebrow, display title, pill
    link) and a static token glow. No extra API calls: everything comes from the four home queries.
    The pinned hero now rounds its corners as it recedes. `PosterRail` is no longer used on Home.
  - **Open:** first view of each backdrop still drops to ~50–60 fps (GPU upload of a new 1280px image);
    the Three.js chunk is 245 KB gzip (R3F pulls all of `three`; vanilla three with named imports would
    roughly halve it); first-load React render is ~2.4 s of script at 4× CPU (profile Home's initial render);
    entry bundle 124 KB gzip (was 114; not yet investigated). FPS of the new bands not measured yet.
  - Committed in ott-client (`562af68`).

- Rails, browse pages and FilterBar (2026-11-16; the user called it "phase 5", it is the rest of phase 3's browse UI):
  - Server: one rail registry (`RAILS` / `PAGES` in `services/rail.service.js`) behind `GET /rails?page=`,
    `GET /rails/:key/titles` (the "Show all" grid, FilterBar filters on top), `GET /titles/facets`, and
    `GET /me/continue-watching`, `PUT /me/progress`, `DELETE /me/progress/:titleId` (WatchProgress; finished
    past 92%). `optionalAuth` adds the personal rails (Continue Watching, Because You Watched [Title]).
    `Title` gained `keywords` and `awards`; the seed imports a curated Oscar/Emmy list, upcoming titles and
    extra dating / docu-reality shows (720 titles now). Reality formats (Competition, Dating, Docu-reality) are
    keyword + title-pattern heuristics. Top Rated has a per-type vote floor (1,000 movie/series, 50 reality);
    the `latest` sort excludes unreleased titles. Routes documented in the server README.
  - Client: `RailsView` (one request per page, layout per rail from `rail-layout.ts`: coverflow, Top 10,
    poster, landscape, continue with progress bar, coming-soon date badge), `BrowsePage` for `/movies`,
    `/series`, `/reality` (rails, or an infinite grid once a filter or sort is set), `ShowAllPage` at
    `/browse/:key?type=`, `TitleGrid` (RTK `infiniteQuery`, sentinel 800px ahead, skeletons on every new filter
    set via `currentData`). `FilterBar`: Country, Language, Genre, Year dropdowns + Latest / Most Watched /
    Top Rated, all in URL params (`replace`, no scroll reset). Home keeps the hero, Moods and Corridor bands as
    interludes between rails.
  - Fixed along the way: the kit's toJSON plugin crashed `/titles/:slug` on `_id`-less cast/crew subdocs;
    `ScrollRestoration` reused the `'default'` key across full page loads (new URLs opened mid-page); the
    navbar pill always sat at the left edge (links' offset parent is their own `li`).
  - Checked: 31 endpoint checks on the real DB; personal rails and progress on a throwaway DB (13 checks,
    dropped after); browser at 1440×900 and 390×844 (no horizontal overflow), reduced motion (fades only),
    URL sync, chip exit animation, skeletons, infinite scroll to the end with no duplicates.
  - **Open:** no playback yet, so progress only comes from `PUT /me/progress`; no Home loader prefetch for
    `/rails` yet (Home still prefetches the old `getTitles` queries for the hero); FPS of the new rails not
    measured; React Router logs a `HydrateFallback` warning for the lazy stream layout.
  - Committed in ott-server (`6e0b5df`) and ott-client (`a63f444`).

- Hover preview and title details (2026-11-16; the user called it "phase 6"):
  - `TitleLink` (every card: poster, landscape, Top 10, grids, More Like This) opens `/title/:slug` as a modal
    over the current page and, on desktop (`hover: hover` + fine pointer), arms the hover preview.
  - `PreviewProvider` (in StreamLayout) renders the one floating preview in a portal: it grows out of the card
    after 400ms (anime.js), crossfades the backdrop to the muted trailer once it plays, and has Play, My List
    and More info. Any scroll closes it at once, and no preview opens within 200ms of a scroll. Moving the
    pointer over a card counts as arriving. Keyboard focus shows it without video (aria-hidden, not
    clickable). Titles without a trailer get a slow push-in. Touch devices get no preview; a tap opens the
    details.
  - Title modal: the link puts `backgroundLocation` in history state. StreamLayout keeps that page rendered,
    reading its own location through `RouteTransition`'s location override, and renders `TitleModal` (Radix
    Dialog, own scroller, Lenis stopped) on top. `depth` lets Close go back past titles opened inside it. A
    reload renders the route's `TitlePage` instead. Title links use `preventScrollReset`. The card-to-modal
    morph is a View Transition (`viewTransition` on the Link, RouterProvider from `react-router/dom`, shared
    name `title-media`). The modal code preloads when idle and is rendered without `React.lazy` once loaded,
    so the backdrop exists in the navigation's own commit. Inside a modal and with reduced motion there is no
    morph, just a framer fade.
  - Details: backdrop parallax (modal scroller or page), logline (tagline, or a first sentence of 30+
    characters), facts (genres, directors / creators, writers, countries, languages, runtime or episodes,
    rating and votes, release), awards, seasons (tabs, a GlassSelect past six) with lazily loaded episodes,
    cast photos (initials fallback), More Like This, an in-place trailer with sound.
  - My List: `/me/watchlist` routes (list, ids, PUT, DELETE), `useWatchlistToggle` with an optimistic update.
    Signed out, it goes to sign-in and back. Play goes to `/watch/:slug` (ProtectedRoute), a placeholder
    until the player phase.
  - Checked: one iframe at most while moving between cards and during 3s of fast rail and page scrolling
    (rail 143 fps, worst frame 31ms; page 122 fps, one frame over 33ms; no preview opened mid-scroll). The
    morph animates the card into the modal's backdrop. Modal over a filtered page keeps its filters and scroll;
    Esc / Close / More Like This / reload-as-page all work; focus returns to the card. Touch (390px): no
    preview, tap opens the modal, no overflow. Reduced motion: no iframe, no movement. My List: 12 API
    checks on a throwaway DB. Entry bundle 114.9 KB gzip; modal, page and trailer code are separate chunks.
  - **Open:** the morph needs the modal code preloaded (idle or on hover); a click before that just fades.
    The signed-in My List UI is not checked in the browser (no test account in the real DB). No `/my-list`
    page yet. YouTube can still show its own captions or end screen in rare cases. Certification isn't in
    the data, so it isn't shown.
  - Sections are full width: `shell` is only the side gutter now (no 88rem cap).
  - Committed in ott-server (`7613840`) and ott-client (`38b9980`).

- Player, Continue Watching and recommendations (2026-11-16; the user called it "phase 7 and 8"):
  - Agreed: `/watch/:slug[/:episodeId]` (slug, not id) and `PUT /me/progress` keep their names. Until billing
    exists, any signed-in user may play anything that has video (only the 15 free titles do today).
  - Server: `POST /playback/:titleId` (src, resumeAt, episode, next; 403 without video), `POST
    /playback/:titleId/view` (one ViewEvent per 30-minute session, `viewCount` +1). Finished = **95%**.
    Remove from Continue Watching sets `WatchProgress.dismissed` (history kept, row order kept); restore =
    `POST /me/progress/:titleId/restore`. A series whose episode was finished stays in the row as "up next".
  - Recommendations (`services/recommendation.service.js`): Trending = views over 14 days, half-life 3 days;
    Most Watched = views in 30 days; both fill the rest from TMDB popularity (cold start). Because You
    Watched (two rows, last two titles): genres 3 each, director/creator 5, top-10 cast 2 each, language 1.5,
    small rating/popularity tie-break, finished titles excluded. `GET /recommendations/home` = Home's rails.
    Rails cached in-process (`utils/ttlCache.js`): shared 5 min, personal 2 min, cleared on progress change.
  - Client: `PlayerPage` outside StreamLayout (no nav, footer or Lenis; stream tokens set itself). hls.js in its
    own chunk (Safari native HLS), custom controls that hide after 3s, scrubber, quality / speed / captions,
    episodes panel, PiP, fullscreen, shortcuts (Space/K, ←→/J L, ↑↓, M, F, C, N, 0–9, Esc, ?). Panels and
    notices render inside the player, never in portals (fullscreen only shows the player element).
    Progress saves every 10s, on pause, after seeking and on leaving (`fetch` keepalive). Captions stay off
    unless chosen. Next episode: button in the last 30s / 95%, then a 10s countdown (none with reduced
    motion). Continue Watching cards resume on click and have ✕ with an Undo toast. Home reads
    `/recommendations/home`; rail queries carry a `Rails` tag that progress changes invalidate.
  - Checked: 35 API checks on a throwaway DB (resume rules, episode choice, season finale → next season, view
    session dedupe, ranking order and decay, scoring order and exclusions, cache clearing, remove/restore).
    In the browser with a throwaway account: sign-in redirect back to the player, hls.js playback, saves
    exactly every 10s, one view per session, resume after reload, every shortcut, captions off by default,
    settings (deduplicated qualities and captions), episodes panel, up-next countdown into the next episode,
    Continue Watching / Because You Watched on Home, remove + Undo keeping order. Phone (390px): controls fit;
    reduced motion: no countdown, no spinner movement. Main bundle 115 KB gzip; hls.js 180 KB gzip, player only.
  - **Open:** no signed URLs yet (the demo streams are public); no paywall (billing phase); no thumbnails on
    the scrubber; the rails cache is per server instance.
  - Trailers (follow-up): previews stay behind the backdrop until YouTube's own overlay has cleared (3.2s of
    clean playback), hide again on buffering or pause, and loop by restarting out of sight. The title
    details hero autoplays the trailer muted (unmute button); the Trailer button remains only when autoplay
    is off (reduced motion, Save-Data). YouTube's terms forbid hiding their branding: the zoom-crop is a grey
    area; self-hosted trailer files would remove it.
  - Committed in ott-server (`dfbac48`) and ott-client (`8269272`).

- Subscriptions with Razorpay (2026-11-16):
  - Server: `config/plans.js`; models Plan (Razorpay plan ids), Subscription, Payment, PaymentEvent;
    `services/razorpay.client.js` (fetch-based REST client, base URL configurable via `RAZORPAY_API_URL` for tests;
    the `razorpay` npm package is no longer used); `services/billing.service.js` (entitlement, subscribe, verify,
    cancel, webhook); `middlewares/requireSubscription.js`; routes `/billing/plans|subscribe|verify|me|cancel` and
    `POST /v1/billing/webhook` registered in `app.js` before `express.json()` with `express.raw()`.
    Webhooks: HMAC over the raw body (constant-time), event id stored first (duplicates ignored; removed again if
    processing fails, so Razorpay's retry works), `lastEventAt` keeps late, older events from changing status,
    payments unique by Razorpay id, emails on start / cancel / halted. Scripts: `billing:sync-plans`,
    `billing:replay-webhook` (signed sample events; `--user` creates a subscription for a test account).
  - Client: `/pricing` (`PricingPlans`, adapted from 21st.dev ink-orbit-pricing by kedhareswer: Free vs Premium,
    Monthly/Yearly pill, anime.js price count), `useCheckout` (loads Razorpay Checkout on click, subscribe → pay
    → verify), `/account` (plan, status, renewal / access-until date, cancel with confirmation, payments, link to
    profile settings), `PaywallDialog` on a 402 in the player, Play button shows a lock + "Subscribe to watch" on
    Premium titles without a subscription. `/watch` is public now (server decides); the footer and profile menu
    point at `/pricing` and `/account`.
  - Checked: 36 API checks against a fake Razorpay on a throwaway DB (sync, signatures, duplicate and late
    webhooks, every access state, 402 shape, no `videoUrl` in any public response, cancel at period end,
    halted, pending). Browser on a throwaway DB with the fake Razorpay: pricing toggle and count, guest paywall,
    guest free playback (no saves), signed-in paywall, unlock after a signed webhook, account page active /
    cancelling / halted. The 35 phase 7 + 8 checks still pass.
  - **Open:** real Razorpay test checkout not run yet (the `.env` keys are empty: add test keys, run
    `billing:sync-plans`, then follow the README guide); no admin plans/subscribers screens; prices shown as
    entered (GST handling depends on the Razorpay account); CSP must allow checkout.razorpay.com when added.
  - Committed in ott-server (`7956283`) and ott-client (`5d38d8a`).

- antislop audit fixes, HIGH 1 to 12 (2026-11-17). The audit is `anti-slop/audit-001-2026-11-17.md` and the follow-up with evidence is `anti-slop/audit-001-2026-11-17-followup.md`.
  - New pages: `/search`, `/my-list` (protected), and `/terms`, `/privacy`, `/refunds`. The legal pages are drafts with `[TO DECIDE]` markers.
  - Footer: the TMDB notice (text only, no logo yet) and legal links.
  - `plans.js` claims now match what the code does. Every page sets its own title with `useDocumentTitle`.
  - The hero has a pause button. The Coverflow card's name now matches its visible text. Auth pages show `APP_NAME` instead of the kit logo.
  - Cursors are set in the base layer. On touch screens every control is at least 44 px, on every surface (`stream.css`).
  - Text over images was measured at the worst spot, so the scrim tokens are denser and `--glass-bg` is 72%.
  - MEDIUM and LOW items 13 to 23 are untouched. Not committed.

- Logo (2026-11-17): the user's bird mark, cropped from their file into `public/images/logo.webp` (291×160), shown by `Logo` (`src/assets/logo.tsx`) in the navbar, footer, auth pages and admin sidebar. Icons: `icon-32.png`, `icon-64.png`, `apple-touch-icon.png`. The kit favicons are deleted. Not committed.

## Phases (do them in order; each has a "done when" check)

0. **Setup:** copy the kit, `git init` both repos, rotate the DB credentials, new DB name, env additions, deps, `APP_NAME`.
   Done when: both apps run, `/v1/health` is ok, email and Google sign-in work.
1. **Design system and motion:** tokens, display font, grain, glass, MotionProvider, motion primitives, StreamLayout
   and navbar, route transitions.
   Done when: a `/lab` page shows every primitive; reduced-motion emulation removes all transforms; no CLS;
   mobile Lighthouse perf ≥ 85.
2. **Catalog backend:** models, TMDB service and cache, admin import, seed script, public catalog endpoints.
   Done when: the seed imports ~40 titles across all 3 types; `/catalog/home` returns rails; the TMDB token is
   absent from the client bundle.
3. **Browse UI:** home with hero scene and rails, three browse pages, title modal and page, search, trailers.
   Done when: all data comes from the API; rails work by keyboard; the layout holds at 375px; `/title/:slug` works
   as both page and modal.
4. **Playback and Continue Watching:** player, playback endpoint, free gating, heartbeat, resume, next episode.
   Done when: resume lands within 10s of the stopping point on another browser; finished items leave the row;
   the next episode appears; locked titles show the paywall.
5. **Subscriptions:** plan seeding and sync, plans page, checkout, verify, webhook, entitlement, account billing, emails.
   Done when, in Razorpay test mode: subscribing makes premium titles play; replaying a webhook changes nothing;
   cancel keeps access until `currentEnd`; a halted subscription locks access.
6. **Admin:** import, publish/free toggles, direct video upload, rails editor, plans, subscribers.
   Done when: an admin can publish a new title end to end without touching the DB.
7. **Polish and ship:** a11y, perf budgets, skeletons and error states, meta tags, TMDB attribution, deploy, custom domain.
   Done when: initial JS ≤ 250 KB gzipped; axe has no serious issues; production checkout works on the custom domain.

## Known risks

- **Content:** TMDB gives no full videos, so you need licensed or your own HLS content. Cloudinary's free video
  bandwidth is small.
- **TMDB terms:** commercial use needs a commercial agreement; attribution is required.
- **No DRM:** signed URLs only stop link sharing. Real DRM means moving to a provider like Mux.
- **Razorpay:** needs KYC and account activation; the webhook needs the raw body; UPI Autopay mandate states
  need their own tests.
- **Render free tier** sleeps, so cold starts take 30s or more.
- **Cross-site refresh cookie:** Safari and Firefox sign users out on reload until both apps share one custom domain.
- **Bundle and GPU weight**, and **motion overload or scroll-jacking** on touch devices. Keep the budgets and the
  reduced-motion rules above.
- **Lenis conflicts** with embla, modals and nested scroll areas. Always apply the stop/prevent rules.
- **21st.dev:** varying licenses and dependencies, and paid code fetches.
- **Reality tagging** by genre is imperfect, so admins can override it.
