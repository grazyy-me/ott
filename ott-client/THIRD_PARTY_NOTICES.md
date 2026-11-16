# Third-party notices

This client started from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin):
the UI components, layout, sidebar, theme/font/direction settings, auth page designs and
error pages. Its demo pages and Clerk integration were removed, TanStack Router was replaced
with React Router, and Zustand/TanStack Query were replaced with Redux Toolkit + RTK Query.

```
MIT License

Copyright (c) 2024 Sat Naing

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The automatic re-authentication in `src/services/base-api.ts` follows the pattern in the
official Redux Toolkit documentation ("Preventing multiple unauthorized errors").

## 21st.dev community components

The files below are adapted from public components on 21st.dev, retrieved through the 21st.dev registry with
this project's paid account. Each file's header names the original, its author and URL, and what was changed.
The registry entries carry no explicit licence text; confirm the terms on each component's page (or with the
author) before a commercial launch.

| File | Original | Author |
| --- | --- | --- |
| `src/components/stream/stream-nav.tsx` | Floating Glassmorphic Navbar with Morphing Pill Indicator | themeocean |
| `src/components/stream/filmstrip-hero.tsx` | Hero Carousel | crafterui |
| `src/components/stream/interactive-selector.tsx` | Interactive Selector | minhxthanh |
| `src/components/stream/coverflow-carousel.tsx` | Glassy Coverflow Carousel (geometry from educalvolpz/coverflow-carousel) | automate_flows |
| `src/components/stream/endless-corridor.tsx` | Endless | helloweblisy |
| `src/components/stream/curved-lens-carousel.tsx` | 3D Curved Carousel | kedhareswer |
| `src/components/stream/chapter-hero.tsx` | Scroll-Triggered Video Hero | daiwiikharihar |
| `src/components/motion/use-hide-on-scroll.ts` | Hide On Scroll (its useHideOnScroll hook) | ddoemonn |
| `src/components/stream/glass-select.tsx` | Liquid Select | liquefy-ui |
| `src/components/stream/animated-chips.tsx` | Animated Tags | socolled |

## Fonts

`public/fonts/` holds Inter, Bricolage Grotesque and Manrope (latin, variable weight), copied from the
`@fontsource-variable` packages by `npm run fonts:copy`. All three are licensed under the SIL Open Font
License 1.1 (see each package's `LICENSE` file in `node_modules/@fontsource-variable/`).
