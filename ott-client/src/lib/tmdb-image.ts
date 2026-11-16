export type TmdbImageSize =
  'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

/**
 * Re-sizes a stored TMDB image URL (the seed stores posters at w780 and backdrops at w1280).
 * Use the smallest size that covers the rendered width at 2x, e.g. w342 for a 160px poster card.
 */
export function tmdbImage(url: string | undefined, size: TmdbImageSize) {
  if (!url) return ''
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`)
}

/** Official trailer page on YouTube for a TMDB trailer key */
export function youtubeWatchUrl(key: string | undefined) {
  return key ? `https://www.youtube.com/watch?v=${key}` : undefined
}
