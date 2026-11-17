import type { TitleType } from '@/types/catalog'

export const BROWSE_COPY: Record<
  TitleType,
  { title: string; description: string }
> = {
  movie: {
    title: 'Movies',
    description:
      'Blockbusters, award winners and hidden gems from fourteen languages.',
  },
  series: {
    title: 'TV Series',
    description:
      'Box sets to binge, new seasons and the shows everyone talks about.',
  },
  reality: {
    title: 'Reality Shows',
    description:
      'Competitions, dating, real lives: unscripted television from around the world.',
  },
}
