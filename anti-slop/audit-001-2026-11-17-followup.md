# antislop audit 001 follow-up: HIGH items 1 to 12, 2026-11-17

Approved: HIGH 1 to 12. Items 13 to 23 (MEDIUM and LOW) were not touched.
Nothing is committed. Both repos have uncommitted changes.

## Delivery Gate

| # | Rule | Result | Evidence |
|---|------|--------|----------|
| 1 | R-24 / R-26 dead links | PASS | `/search` and `/my-list` exist. Browser: typing "breaking" puts `?q=breaking` in the URL and shows "1 title match"; the Series filter adds `&type=series`; one letter shows "Keep typing"; "zzzzqqq" shows "No titles match" with a Browse movies link. As a guest, `/my-list` goes to `/sign-in?redirect=%2Fmy-list`. All 12 footer links point at real routes. |
| 2 | R-36 / R-38 unbacked plan claims | PASS | `plans.js` now claims only what the code does: catalogue access, resume on any device, cancel and keep access until the period ends, and "₹389 less than paying monthly" (12 × 19,900 − 199,900 = 38,900 paise). `GET /v1/billing/plans` serves the new text. |
| 3 | R-38 / C-5 no legal pages | PASS, as drafts | `/terms`, `/privacy` and `/refunds` render with their own h1 and title, a visible "Draft" note, and no em dash. Business and legal choices are left as visible markers (4, 3 and 2 `[TO DECIDE]`), not invented. They are linked from the footer and the pricing note. |
| 4 | C-5 TMDB attribution | PASS (text) | The footer carries TMDB's required notice and links to themoviedb.org (new tab, `noopener noreferrer`). The TMDB logo is **not** added: it would be a downloaded asset, which needs your OK. |
| 5 | R-39 page titles | PASS | Measured: "Streamly" (Home), "Movies · Streamly", "Search: breaking · Streamly", "Terms of Service · Streamly", "Sign in · Streamly", "Create an account · Streamly", "Watching The Godfather · Streamly". Error, account, pricing, details and Show all pages are set in code. |
| 6 | R-39 hero pause control | PASS | A 44×44 "Pause slideshow" button: pressing it sets `aria-pressed="true"` and the label to "Resume slideshow", and the slide did not change over the next 9 s. Pressing it again resumes. The button is hidden when autoplay is off (reduced motion). |
| 7 | R-39 name and label mismatch | PASS | The selected Coverflow card is named "Watch trailer: The Lord of the Rings: The Rings of Power", and its visible chip reads "Watch trailer". |
| 8 | R-03 tap targets | PASS | 375×812 with touch emulation (`pointer: coarse`): no control under 44×44 on Home (165 controls), Movies (119), Search (28), title details (35), Pricing (21), Terms (20), player (8), Sign in (8) or Sign up (10). The only smaller items are links inside a sentence, which are exempt. No horizontal overflow on Movies. |
| 9 | R-02 em dash | PASS | Account shows "Not available" for a missing date and "Not recorded" for a missing payment method. Checked in code only (see Caveats). |
| 10 | R-25 text over images | PASS | Worst case: every image and video forced to pure white, then the brightest pixel behind each text box measured. Results are in the table below. |
| 11 | R-23 / R-39 kit logo | PASS | The auth pages show the app name as the h1 ("Streamly"). The page has no "Shadcn" left in it. |
| 12 | R-39 cursors | PASS | The base layer sets `cursor: pointer` on enabled buttons, `select`, `summary`, `label[for]`, checkboxes, radios and the tab, radio, switch, option and menuitem roles, and `not-allowed` on disabled controls. On the details page all 7 such controls show the pointer. |

Checks: `tsc -b`, `eslint src` (client and server) and `prettier --check src` are clean.

### Item 10: worst-case contrast, after the fix

| Surface | Lowest text | Ratio | Needs |
|---|---|---|---|
| Home hero (eyebrow, title, copy, facts) | facts "2026 · 7.5 ★ · Horror" | 5.61 | 4.5 |
| Landscape cards (Award Winners, 12 texts) | genre eyebrow | 6.48 | 4.5 |
| "Free" badges on posters | badge text | 5.95 | 4.5 |
| Mood band (open panel) | "Starring tonight" line | 9.23 | 4.5 |
| Title details hero | eyebrow "Series · Free" | 5.49 | 4.5 |
| Player top bar and time | "Sign in to keep your place" | 5.27 | 4.5 |

Before the fix: hero copy 2.00, hero title 2.85, card meta 1.97, details eyebrow 2.50, player title 1.80.

What changed:
- The `--scrim-bottom` and `--scrim-left` tokens are denser.
- The hero uses the full left scrim plus a band under the copy and the facts, and the hero copy is now at 90% opacity.
- The card gradient (landscape, Continue Watching, mood panels) is now `from-background from-10% via-background/80 via-50%`.
- The player's top and bottom bars have stronger gradients.
- `--glass-bg` went from 55% to 72%, so small text on glass chips holds 4.5:1 over a white backdrop. This makes glass panels a little darker everywhere.

## Changes found during verification

- **Footer links:** they were 17 px tall on phones. They are now 44 px on touch screens, with no change on desktop.
- **Touch-size rule:** it now applies on every surface, not only stream pages, and covers text fields too. The kit's sign-in and sign-up forms had 36 px inputs and buttons.
- **"Forgot password?":** on touch screens it moves below the password field as a 44 px target. On desktop it keeps its place.

## Caveats

- **Item 3:** the legal pages are drafts. Fill in the `[TO DECIDE]` items (acceptable use, liability and governing law, contact email, data retention and deletion, refunds), then have a lawyer review them before taking real payments.
- **Item 2:** "Every movie, series and reality show in the catalogue" is true of access, but most Premium titles have no video attached yet.
- **Items 1 and 9, signed in:** the signed-in My List page and the Account fallbacks were not clicked through. There is no test account in the real database. They type-check and share their states with Search, which was clicked through.
- **Item 10 coverage:** measured at 1440×900 on the surfaces above. The `/lab` pages and `ChapterHero` use the same scrim tokens but were not measured.
