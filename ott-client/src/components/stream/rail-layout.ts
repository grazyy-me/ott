import type { RailKey, TitleType } from '@/types/catalog'

export type RailLayout =
  'poster' | 'landscape' | 'top10' | 'continue' | 'coverflow' | 'coming'

/** Each rail gets the layout that suits it, so a page of rails never reads as one repeated grid */
export const RAIL_LAYOUT: Record<RailKey, RailLayout> = {
  'continue-watching': 'continue',
  trending: 'coverflow',
  latest: 'poster',
  'most-watched': 'top10',
  'because-you-watched': 'poster',
  'top-rated': 'poster',
  'award-winners': 'landscape',
  free: 'poster',
  'binge-worthy': 'landscape',
  documentaries: 'poster',
  'coming-soon': 'coming',
  competition: 'poster',
  dating: 'landscape',
  'docu-reality': 'poster',
  all: 'poster',
}

export const showAllHref = (key: RailKey, type?: TitleType) =>
  `/browse/${key}${type ? `?type=${type}` : ''}`

/** Rail names for headers that render before data arrives (the server sends the same, personalised ones) */
export const RAIL_TITLES: Record<RailKey, string> = {
  'continue-watching': 'Continue Watching',
  trending: 'Trending Now',
  latest: 'Latest Releases',
  'most-watched': 'Most Watched',
  'because-you-watched': 'Because You Watched',
  'top-rated': 'Top Rated',
  'award-winners': 'Award Winners',
  free: 'Free to Watch',
  'binge-worthy': 'Binge-worthy Series',
  documentaries: 'Documentaries',
  'coming-soon': 'Coming Soon',
  competition: 'Competition',
  dating: 'Dating',
  'docu-reality': 'Docu-reality',
  all: 'Everything',
}
