/** Catalog shapes returned by ott-server (src/services/catalog.service.js). Responses are wrapped in ApiResponse. */

export type TitleType = 'movie' | 'series' | 'reality'
export type TitleSort = 'latest' | 'popular' | 'rating'

/** Genre as embedded in a title */
export interface GenreRef {
  id: string
  name: string
  slug: string
}

/** Genre from GET /genres, with the number of published titles that have it */
export interface Genre extends GenreRef {
  tmdbId: number
  count: number
}

export interface PersonRef {
  id: string
  name: string
  profileUrl: string
}

export interface CastMember {
  person: PersonRef
  character: string
  order: number
}

export interface CrewMember {
  person: PersonRef
  job: string
}

/** Director (movies) or creator (series): a person plus the job they are credited for */
export interface Credit extends PersonRef {
  job: string
}

/**
 * What lists, rails, search and "similar" return: everything except cast and crew.
 * The video URL is never sent; `hasVideo` and `isFree` say what the player can expect.
 */
export interface TitleCard {
  id: string
  type: TitleType
  tmdbId: number
  tmdbType: 'movie' | 'tv'
  slug: string
  title: string
  originalTitle: string
  tagline: string
  overview: string
  genres: GenreRef[]
  /** ISO 3166-1 alpha-2, e.g. "IN" */
  countries: string[]
  /** ISO 639-1, e.g. "hi" */
  languages: string[]
  /** ISO date string, or null when TMDB has none */
  releaseDate: string | null
  year: number | null
  /** Minutes: the film's length, or a typical episode's */
  runtime: number | null
  /** 0 to 10 */
  rating: number
  voteCount: number
  popularity: number
  posterUrl: string
  backdropUrl: string
  /** YouTube video key; empty when there is no trailer */
  trailerKey: string
  numberOfSeasons: number
  numberOfEpisodes: number
  isFree: boolean
  hasVideo: boolean
  isPublished: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface Season {
  id: string
  title: string
  seasonNumber: number
  name: string
  overview: string
  posterUrl: string
  airDate: string | null
  episodeCount: number
}

export interface Episode {
  id: string
  title: string
  season: string
  seasonNumber: number
  episodeNumber: number
  name: string
  overview: string
  stillUrl: string
  airDate: string | null
  runtime: number | null
  isFree: boolean
  hasVideo: boolean
}

/** GET /titles/:slug */
export interface TitleDetail extends TitleCard {
  /** Top-billed cast, in billing order */
  cast: CastMember[]
  crew: CrewMember[]
  /** Directors, or creators for series (kept for older code; prefer the three lists below) */
  director: Credit[]
  directors: Credit[]
  creators: Credit[]
  /** Screenplay, writer and story credits, each person once */
  writers: Credit[]
  /** On the signed-in user's My List (false signed out) */
  inList: boolean
  /** e.g. "Oscar · Best Picture (1973)"; empty for most titles */
  awards: string[]
  /** Empty for movies; season 0 ("Specials") is not imported */
  seasons: Season[]
}

/** Same envelope as the kit's paginate plugin */
export interface Paginated<T> {
  results: T[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
}

export interface TitleListParams {
  type?: TitleType
  /** Genre slug, e.g. "science-fiction" */
  genre?: string
  /** ISO 3166-1 alpha-2 */
  country?: string
  /** ISO 639-1 */
  language?: string
  year?: number
  /** Default on the server: "latest" */
  sort?: TitleSort
  free?: boolean
  /** Default 1 */
  page?: number
  /** Default 20, max 50 */
  limit?: number
}

export interface SearchParams {
  /** At least 2 characters */
  q: string
  type?: TitleType
  page?: number
  limit?: number
}

// ---------------------------------------------------------------- rails (GET /rails, GET /rails/:key/titles)

export type RailPageKey = 'home' | 'movie' | 'series' | 'reality'

export type RailKey =
  | 'continue-watching'
  | 'trending'
  | 'latest'
  | 'most-watched'
  | 'because-you-watched'
  | 'top-rated'
  | 'award-winners'
  | 'free'
  | 'binge-worthy'
  | 'documentaries'
  | 'coming-soon'
  | 'competition'
  | 'dating'
  | 'docu-reality'
  | 'all'

/** Continue Watching only: where the viewer stopped */
export interface WatchProgressInfo {
  positionSec: number
  durationSec: number
  /** 0 to 100 */
  percent: number
  updatedAt: string
  episode: {
    id: string
    seasonNumber: number
    episodeNumber: number
    name: string
  } | null
}

export interface RailItem extends TitleCard {
  progress?: WatchProgressInfo
  /** award labels, e.g. "Oscar · Best Picture (2020)" */
  awards?: string[]
}

export interface Rail {
  key: RailKey
  /** e.g. "Because You Watched Breaking Bad" */
  title: string
  /** Because You Watched only: the title it is based on */
  source: { id: string; title: string; slug: string } | null
  items: RailItem[]
  /** how many titles "Show all" has */
  total: number
}

export interface RailPage extends Paginated<RailItem> {
  key: RailKey
  title: string
  source?: Rail['source']
}

/** The FilterBar's filters, mirrored in the URL query */
export interface BrowseFilters {
  country?: string
  language?: string
  genre?: string
  year?: number
  /** Latest, Most Watched, Top Rated */
  sort?: 'latest' | 'popular' | 'rating'
}

export interface Facets {
  countries: { code: string; count: number }[]
  languages: { code: string; count: number }[]
  years: { min: number; max: number } | null
}
