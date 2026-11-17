/** 75 -> "1:15", 3725 -> "1:02:05" */
export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "S1 · E3 · Romance Dawn" */
export const episodeLabel = (e: {
  seasonNumber: number
  episodeNumber: number
  name: string
}) =>
  [`S${e.seasonNumber}`, `E${e.episodeNumber}`, e.name]
    .filter(Boolean)
    .join(' · ')
