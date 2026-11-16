import type { TitleCard } from '@/types/catalog'

/** 152 -> "2h 32m", 45 -> "45m" */
export const formatRuntime = (minutes: number | null | undefined) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

/** The length shown on cards: running time for films, season count for series and reality */
export const lengthLabel = (
  t: Pick<TitleCard, 'type' | 'runtime' | 'numberOfSeasons'>
) =>
  t.type === 'movie'
    ? formatRuntime(t.runtime)
    : t.numberOfSeasons
      ? `${t.numberOfSeasons} ${t.numberOfSeasons === 1 ? 'season' : 'seasons'}`
      : null

export const ratingLabel = (rating: number) =>
  rating ? rating.toFixed(1) : null
