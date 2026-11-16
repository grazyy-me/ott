# ott-server

Streamly OTT API (Express + MongoDB), built on the MERN starter kit. Pairs with **ott-client**. Project decisions live in `../CLAUDE.md`.

- Email/password auth with JWT: short-lived access token in the response, refresh token in an **httpOnly cookie**, rotated on every refresh and stored hashed
- **Google and GitHub sign-in** (Passport, no sessions), linked to existing accounts by email
- Email verification and password reset, sent with **Resend** (printed to the console when no API key is set)
- Avatar uploads to **Cloudinary** (Multer, 2 MB image limit)
- Roles (`user`, `admin`) with admin user-management routes
- Joi validation, Helmet, CORS with credentials, Mongo sanitizing, rate limiting on auth routes in production, Winston logging

## Quick start

```bash
cp .env.example .env     # fill in MONGODB_URL and JWT_SECRET at minimum
npm install
npm run dev              # http://localhost:5000/v1/health
```

Node 20+ is required. Everything except `MONGODB_URL`, `CLIENT_URL` and `JWT_SECRET` is optional: features without config are switched off with a warning at startup.

## API

All routes are under `/v1`. Success responses are `{ statusCode, data, message, success: true }`; errors are `{ statusCode, message, success: false }`.

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | | Database status, for Render health checks |
| POST | `/auth/register` | | `{ name, email, password }`; sends the verification email |
| POST | `/auth/login` | | `{ email, password }` |
| POST | `/auth/refresh-tokens` | cookie | Returns `{ user, accessToken }` and a new refresh cookie |
| POST | `/auth/logout` | cookie | Deletes the refresh token and clears the cookie |
| POST | `/auth/forgot-password` | | `{ email }`; same response whether or not the account exists |
| POST | `/auth/reset-password?token=` | | `{ password }`; signs out every session |
| POST | `/auth/verify-email?token=` | | |
| POST | `/auth/send-verification-email` | Bearer | |
| GET | `/auth/google`, `/auth/github` | | Browser redirect to the provider |
| GET | `/auth/providers` | | Which OAuth providers are configured |
| GET / PATCH | `/users/me` | Bearer | PATCH `{ name?, password? }` |
| PATCH | `/users/me/avatar` | Bearer | `multipart/form-data`, field `avatar` |
| GET / POST | `/users` | admin | List (paginated) / create |
| GET / PATCH / DELETE | `/users/:userId` | admin | |
| GET | `/titles` | | Query: `type` (movie\|series\|reality), `genre` (slug), `country` (ISO 3166-1), `language` (ISO 639-1), `year`, `sort` (latest\|popular\|rating\|trending), `release` (released\|upcoming), `free`, `page`, `limit` (max 50). Returns `{ results, page, limit, totalPages, totalResults }` |
| GET | `/titles/:slug` | optional Bearer | Full details: genres, cast (ordered), crew grouped as `directors`, `creators` and `writers` (plus the older `director`), seasons, awards, and `inList` (false signed out). Never includes `videoUrl` |
| GET | `/titles/:id/similar` | | Same type, ranked by shared genres. `?limit=` (max 24, default 12) |
| GET | `/titles/:id/seasons/:seasonNumber/episodes` | | Season and its episodes |
| GET | `/genres` | | Genres with title counts; `?type=` counts within one type |
| GET | `/search?q=` | | Substring match on title; `q` needs 2+ characters. Also `type`, `page`, `limit` |
| GET | `/titles/facets` | | FilterBar options: `{ countries: [{ code, count }], languages: [{ code, count }], years: { min, max } }`; `?type=` narrows to one type |
| GET | `/rails?page=` | optional Bearer | Every rail of a page (`home`, `movie`, `series` or `reality`), up to 16 titles each, as `{ rails: [{ key, title, total, items, source? }] }`. Empty rails are left out; Continue Watching and Because You Watched only appear signed in. Shared rails are cached 5 minutes, personal ones 2 minutes (cleared when progress changes) |
| GET | `/recommendations/home` | optional Bearer | Home's ready-made rails, same shape and caching as `/rails?page=home` |
| GET | `/rails/:key/titles` | optional Bearer | One rail's titles, paged (the "Show all" grid). Query: `type`, the FilterBar's `country`, `language`, `genre`, `year`, `sort` (latest\|popular\|rating, overrides the rail's own), `page`, `limit` (max 48). `key` `all` is every published title. Personal rails return 401 signed out |
| GET | `/me/continue-watching` | Bearer | Unfinished titles, last watched first, each with `progress { positionSec, durationSec, percent, updatedAt, episode, upNext }`. A series whose last episode was finished shows its next episode (`upNext`, 0%). `?type=`, `page`, `limit` |
| PUT | `/me/progress` | Bearer | `{ titleId, episodeId?, positionSec, durationSec }`. Past 95% the item counts as finished. Saving brings a removed title back |
| DELETE | `/me/progress/:titleId` | Bearer | Removes a title from Continue Watching (hidden; its history and resume points stay) |
| POST | `/me/progress/:titleId/restore` | Bearer | Undo for the removal, without changing the row order |
| POST | `/playback/:titleId` | optional Bearer | `{ episodeId? }` → `{ resumeAt, isFree, title, episode, next }`, never the video URL. For a series without `episodeId`: the episode in progress, else the one after the last finished, else S1E1 (guests: S1E1). `resumeAt` is 0 for guests, under 30 s or past 95%. 403 when the title has no video yet |
| GET | `/titles/:id/stream` | optional Bearer | `?episodeId=` → `{ src, expiresAt }`: the only response that ever carries a video URL. Free titles: anyone, guests included. Everything else needs an active subscription, otherwise **402** `{ code: 'SUBSCRIPTION_REQUIRED', requires: 'account' \| 'subscription', message, plans }` |
| GET | `/billing/plans` | | `{ plans: [{ code, name, interval, amountPaise, currency, features, available }], yearlySavingPercent }` |
| POST | `/billing/subscribe` | Bearer | `{ plan: 'monthly' \| 'yearly' }` → `{ subscriptionId, keyId, plan, prefill, appName }` for Razorpay Checkout. 409 if already subscribed; a recent unpaid one is reused. 503 until plans are synced |
| POST | `/billing/verify` | Bearer | `{ paymentId, subscriptionId, signature }` from Checkout. Checks the signature, then stores Razorpay's state for the subscription (access unlocks at once) |
| GET | `/billing/me` | Bearer | `{ entitled, subscription: { plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, … }, payments }` |
| POST | `/billing/cancel` | Bearer | Cancels at the end of the period already paid for; access continues until then |
| POST | `/billing/webhook` | Razorpay signature | Raw body, `x-razorpay-signature` (HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`). Idempotent by `x-razorpay-event-id`; late, older events don't change status. Handles subscription `authenticated`, `activated`, `charged`, `pending`, `halted`, `cancelled`, `completed`, `updated` |
| POST | `/playback/:titleId/view` | Bearer | `{ episodeId? }`. Logs one view per viewing session (repeats within 30 minutes are ignored) and adds 1 to `viewCount`. Feeds Most Watched and Trending |
| GET | `/me/watchlist` | Bearer | My List as title cards, newest first, each with `addedAt`. `page`, `limit` (max 48) |
| GET | `/me/watchlist/ids` | Bearer | `{ ids }`: every title id on My List, so cards can show "added" without a request each |
| PUT | `/me/watchlist/:titleId` | Bearer | Adds a title (204; adding twice is fine). 404 for an unknown or unpublished title |
| DELETE | `/me/watchlist/:titleId` | Bearer | Removes a title (204, also when it wasn't there) |

Catalog routes validate with zod (`middlewares/validateZod.js`); bad input returns 400 with the failing fields.

Rails are defined in one registry, `RAILS` in `services/rail.service.js`, and each page's row order in `PAGES`
next to it. A rail is a set of filters plus a sort:

| Key | Rows | Rule |
| --- | --- | --- |
| `continue-watching` | all pages | Signed in: unfinished titles, last watched first (next episode for a finished one) |
| `trending` | all pages | Views in the last 14 days, each worth half as much every 3 days; TMDB popularity fills the rest |
| `latest` | all pages | Released titles, newest first |
| `most-watched` | all pages | Views in the last 30 days; TMDB popularity fills the rest |
| `because-you-watched`, `because-you-watched-2` | home, movie, series | Signed in: the last two titles watched. Other titles of the same type scored by shared genres (3 each), same director or creator (5), shared top-10 cast (2 each), same language (1.5), plus a small rating and popularity tie-break. Finished titles excluded |
| `top-rated` | all pages | By rating, with a vote floor of 1,000 for movies and series and 50 for reality |
| `award-winners` | home, movie, series | Titles with `awards` (curated Oscar / Emmy list in the seed) |
| `free` | all pages | `isFree` |
| `binge-worthy` | home, series | Series with 3+ seasons rated 7.5+ |
| `documentaries` | home | Documentary genre or keyword |
| `coming-soon` | home, movie, series | Release date in the future, soonest first |
| `competition`, `dating`, `docu-reality` | reality | TMDB keywords plus title patterns (admins can correct the tagging) |

The `rating` sort skips titles with under 50 votes, and `latest` skips unreleased titles (those are Coming Soon).

## Seeding the catalog from TMDB

Set `TMDB_API_KEY` (v3 key) or `TMDB_READ_TOKEN` (v4 token) in `.env`, then:

```bash
npm run seed:tmdb                                           # ~300 movies, ~150 series, ~50 reality shows, 15 free
npm run seed:tmdb -- --movies=20 --series=10 --reality=5 --free=3   # a small test run
```

- Safe to re-run: everything is upserted by TMDB id and type. `slug`, `isFree`, `videoUrl`, `isPublished` and `viewCount` are never overwritten, so admin edits survive a re-sync.
- After the global popularity lists it adds regional batches (the `REGIONS` list in the script): Hindi, Tamil, Telugu, Malayalam, Korean, Japanese, Spanish, French, German, Italian, Portuguese, Turkish, Chinese and Thai titles, picked by original language. Skip them with `--regions=false`, or run only them with `--movies=0 --series=0 --reality=0`.
- Reality shows are TMDB TV titles in genre 10764. Talk shows, news and soaps are left out of "series".
- Requests are spaced to stay under TMDB's limit, and a 429 pauses all workers for the `Retry-After` time.
- It also stores TMDB keywords (used by the Documentaries, Competition, Dating and Docu-reality rails) and imports:
  - the award winners in `AWARDS` (TMDB ids with an Oscar or Emmy label; skip with `--awards=false`)
  - upcoming movies and series for Coming Soon (`--upcoming=24`; `0` skips)
  - extra dating and docu-reality shows found by keyword (`--formats=false` skips)
- Series and reality shows import seasons 1 to 10 (`--max-seasons`) with their episodes; "Specials" are skipped.
- The free titles (8 movies, 4 series, 3 reality shows, best-rated first) get an open-licence demo HLS stream as `videoUrl`, and so do all their episodes. Replace them with real video later.

To make someone an admin, set `role: "admin"` on their user document in MongoDB.

## Setting up the services

**MongoDB Atlas:** create a free cluster and a database user, copy the connection string into `MONGODB_URL`. Under Network Access allow `0.0.0.0/0`, because Render's free tier has no fixed IP.

**Resend:** create an API key. Until you verify a domain, Resend only delivers to your own account's email address from `onboarding@resend.dev`. Verify a domain before real users sign up, then set `EMAIL_FROM` to an address on it.

**Google OAuth:** in Google Cloud Console create an OAuth client (Web application). Authorised redirect URI: `{SERVER_URL}/v1/auth/google/callback`.

**GitHub OAuth:** Settings > Developer settings > OAuth Apps. Callback URL: `{SERVER_URL}/v1/auth/github/callback`.

**Cloudinary:** copy the cloud name, API key and secret from the dashboard.

**Razorpay:** see "Testing subscriptions" below. In production, use live keys only after KYC and account activation.

## Testing subscriptions (Razorpay test mode)

Access rule: a user can watch Premium titles while their subscription is `authenticated`, `active` or `pending`
(a renewal being retried), or `cancelled` with `currentPeriodEnd` still in the future. `halted` (renewals
failed), `completed` and `expired` lock Premium. Free titles play for everyone, guests included.

1. **Keys.** In the Razorpay dashboard switch to **Test mode**, then Account & Settings → API Keys → generate a
   key. Put it in `.env` (never commit it):
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=a-long-random-string-you-choose
   ```
2. **Plans.** Create the two plans in your Razorpay test account (prices come from `src/config/plans.js`):
   ```bash
   npm run billing:sync-plans
   ```
   Running it again is safe. Changing a price creates a new Razorpay plan (existing subscribers stay on theirs).
3. **Webhook.** Razorpay must reach your machine:
   ```bash
   cloudflared tunnel --url http://localhost:5000      # or: ngrok http 5000
   ```
   In the dashboard (Test mode) → Webhooks → Add: URL `https://<tunnel-host>/v1/billing/webhook`, secret = your
   `RAZORPAY_WEBHOOK_SECRET`, events: subscription.authenticated, .activated, .charged, .pending, .halted,
   .cancelled, .completed, .updated.
4. **Subscribe.** Open `/pricing` (or play a Premium title to get the paywall), sign in, choose a plan and pay
   with a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-details/) or the test UPI id
   `success@razorpay` (`failure@razorpay` to see a failure). Premium titles play straight after payment; the
   webhook then confirms it.
5. **Check:** `/account` shows the plan and renewal date; **Cancel** keeps access until the period end; replaying a
   webhook (Razorpay dashboard → Webhooks → resend) changes nothing.

**Without a tunnel:** send signed sample events to your local server yourself:

```bash
# give a local test account a subscription (no payment), then charge, cancel or halt it
npm run billing:replay-webhook -- --event=subscription.activated --subscription=sub_localtest1 --user=<user id>
npm run billing:replay-webhook -- --event=subscription.charged --subscription=sub_localtest1 --event-id=evt_1
npm run billing:replay-webhook -- --event=subscription.charged --subscription=sub_localtest1 --event-id=evt_1   # duplicate: ignored
npm run billing:replay-webhook -- --event=subscription.halted --subscription=sub_localtest1                    # Premium locked
```

Payments and security notes: prices live only on the server (the browser sends a plan code); the key secret and
webhook secret never leave the server; Checkout's success callback is only trusted after its signature is checked;
webhooks are verified over the raw body with a constant-time comparison before anything is parsed.

## Deploying to Render

1. Push this repo to GitHub.
2. In Render choose **New > Blueprint** and pick the repo; `render.yaml` creates the service.
3. Fill in the secret values. `CLIENT_URL` is your Vercel URL, `SERVER_URL` is the Render URL.
4. Update the Google and GitHub callback URLs to use the Render URL.

The free tier sleeps after about 15 idle minutes, so the first request afterwards takes 30+ seconds. The client shows a "starting the server" message during that wait.

## Cross-domain cookies

With the client on `*.vercel.app` and the API on `*.onrender.com`, the refresh cookie is a third-party cookie. In production it is sent with `SameSite=None; Secure`, which works in Chrome today, but Safari and Firefox's strict mode block third-party cookies, so users there are signed out on reload.

The fix is a custom domain for both, e.g. `app.example.com` (Vercel) and `api.example.com` (Render). The cookie is then same-site and works everywhere. No code changes are needed: update `CLIENT_URL`, `SERVER_URL`, the client's `VITE_API_URL` and the OAuth callback URLs.

## Project structure

```
src/
├── config/        env validation, logger, passport strategies, roles
├── controllers/   request handlers
├── middlewares/   auth, validation, errors, rate limit, uploads
├── models/        User, Token (+ toJSON and paginate plugins)
├── routes/v1/     route definitions
├── services/      business logic: auth, tokens, users, email, OAuth
├── templates/     email HTML
├── utils/         ApiError, ApiResponse, cookies, Cloudinary
├── validations/   Joi schemas
├── app.js
└── index.js
```

## Credits

Built on [hagopj13/node-express-boilerplate](https://github.com/hagopj13/node-express-boilerplate) (MIT) and [hiteshchoudhary/chai-backend](https://github.com/hiteshchoudhary/chai-backend) (ISC). See `THIRD_PARTY_NOTICES.md`.
