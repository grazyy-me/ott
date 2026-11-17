// Copies the self-hosted variable fonts (OFL 1.1) from @fontsource-variable into public/fonts.
// Run after upgrading a font package: npm run fonts:copy
import { copyFileSync, mkdirSync } from 'node:fs'

const FILES = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin-wght.woff2'],
  ['@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2', 'bricolage-grotesque-latin-wght.woff2'],
  ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'manrope-latin-wght.woff2'],
]

mkdirSync('public/fonts', { recursive: true })
for (const [from, to] of FILES) {
  copyFileSync(`node_modules/${from}`, `public/fonts/${to}`)
  console.log(`public/fonts/${to}`)
}
