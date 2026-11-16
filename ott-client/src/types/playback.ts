import type { TitleType } from './catalog'

export interface PlaybackEpisode {
  id: string
  seasonNumber: number
  episodeNumber: number
  name: string
  stillUrl: string
  runtime: number | null
  hasVideo: boolean
}

/** POST /playback/:titleId: what to play and where to start (never the video URL) */
export interface Playback {
  /** Seconds to start from (0: from the beginning, and always for guests) */
  resumeAt: number
  isFree: boolean
  title: {
    id: string
    slug: string
    title: string
    type: TitleType
    backdropUrl: string
    posterUrl: string
    runtime: number | null
  }
  /** Null for movies */
  episode: PlaybackEpisode | null
  /** The episode after this one, if any */
  next: PlaybackEpisode | null
}

/** PUT /me/progress */
export interface ProgressUpdate {
  titleId: string
  episodeId?: string | null
  positionSec: number
  durationSec: number
}

/** GET /titles/:id/stream: the only place the video URL comes from (402 without access) */
export interface Stream {
  /** HLS manifest URL */
  src: string
  expiresAt: string
}
