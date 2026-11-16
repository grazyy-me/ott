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

/** POST /playback/:titleId */
export interface Playback {
  /** HLS manifest URL */
  src: string
  expiresAt: string
  /** Seconds to start from (0: from the beginning) */
  resumeAt: number
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
