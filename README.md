# Streamly

A streaming site for movies, series and reality shows, with free titles, monthly and yearly subscriptions,
Continue Watching and recommendations. "Streamly" is a working name.

| Folder | What | Stack | Deploys to |
|---|---|---|---|
| [`ott-server/`](ott-server) | REST API | Express, MongoDB, Razorpay, Resend, Cloudinary | Render |
| [`ott-client/`](ott-client) | Web app | React 19, Vite, TypeScript, Tailwind 4, hls.js, anime.js, Three.js | Vercel |

## Run locally

Each folder has a `.env.example`. Copy it to `.env` and fill in your own values. Secrets never go in the repo.

```bash
cd ott-server && npm install && npm run dev     # http://localhost:5000
cd ott-client && npm install && npm run dev     # http://localhost:5173
```

The catalog is seeded from TMDB with `npm run seed:tmdb` in `ott-server` (needs a TMDB key).
The server README lists every route and the Razorpay test setup.

## Notes

- Title data and images come from [The Movie Database (TMDB)](https://www.themoviedb.org/). This product
  uses the TMDB API but is not endorsed or certified by TMDB.
- Playback uses open-licence demo streams. No commercial video is included.
- The Terms, Privacy and Refunds pages are drafts.
- `CLAUDE.md` holds the project's design decisions; `anti-slop/` holds the UI audits.
