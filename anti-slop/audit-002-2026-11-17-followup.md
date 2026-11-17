# antislop audit 002 follow-up: code comments 1 to 12, 2026-11-17

Approved: 1 to 12 (all). Only comment text changed. Nothing is committed.

| # | File | Before | After |
|---|------|--------|-------|
| 1 | `coverflow-carousel.tsx` | Said the centre card plays the trailer (wrong since it opens details) | "the centre card's chip: More info when it opens details, Watch trailer otherwise" |
| 2 | `filmstrip-hero.tsx` header | 3 lines on the trailer | 2 lines |
| 3 | `filmstrip-hero.tsx` scrims | 2 lines narrating three layers | 1 line |
| 4 | `stream.css` touch rule | 4 lines | 1 line |
| 5 | `legal-pages.tsx` | 4 lines | 2 lines, still with the "lawyer review" warning |
| 6 | `use-title-link.ts` | 4 lines | 2 lines |
| 7 | `youtube-trailer.tsx` `cover` | 3 lines | 1 line |
| 8 | `search-page.tsx` | 3 lines | 2 lines |
| 9 | `use-document-title.ts` | 3 lines | 2 lines |
| 10 | `auth-layout.tsx` | Ended with the kit logo's history | History dropped |
| 11 | `filmstrip-hero.tsx` | Comment restating the settle effect | Removed |
| 12 | `poster-grid.tsx` | Doc echoing `Pager` | Removed |

## Delivery Gate

| Check | Result | Evidence |
|-------|--------|----------|
| Only comments changed | PASS | Each edited file was compared against a copy with the 12 rewrites reversed, comments stripped. Nine files have identical code tokens. In `coverflow-carousel.tsx` the 23 differing tokens are exactly the old and new comment words between `{/*` and `*/}`; the tool isn't JSX-aware, so it counted them as code. |
| Builds and lints | PASS | `tsc -b`, `eslint src` and `prettier` are clean. |
| Every comment adds information (R-31) | PASS | The kept comments state a reason, constraint or contract. |
| No comment over two lines among those changed | PASS | The longest is now two lines. |
