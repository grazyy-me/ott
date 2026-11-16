import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Title, Genre, Season, Episode } from '../models/index.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cards and rails don't need the credits; videoUrl is private and stripped by toJSON anyway
export const CARD_FIELDS = '-cast -crew -videoUrl -keywords';

export const SORTS = {
  latest: { releaseDate: -1, _id: -1 },
  // "Most watched": viewCount starts at 0 for everything, so TMDB popularity breaks ties until real views arrive
  popular: { viewCount: -1, popularity: -1, _id: -1 },
  rating: { rating: -1, voteCount: -1, _id: -1 },
  // what people are looking at right now on TMDB
  trending: { popularity: -1, _id: -1 },
  // Coming Soon: the nearest release first
  soonest: { releaseDate: 1, _id: 1 },
};

// Below this many votes a 10/10 is noise, so the "rating" sort ignores such titles
const MIN_VOTES_FOR_RATING_SORT = 50;

export const paged = (results, page, limit, totalResults) => ({
  results,
  page,
  limit,
  totalPages: Math.ceil(totalResults / limit),
  totalResults,
});

export const emptyPage = (page, limit) => paged([], page, limit, 0);

const genreIdsFor = async (slugs) =>
  (
    await Genre.find({ slug: { $in: slugs } })
      .select('_id')
      .lean()
  ).map((g) => g._id);

/**
 * The Mongo filter behind every title list: the public filters (type, genre, country, language, year, free)
 * plus the rail-only ones (release, award, minSeasons, minRating, minVotes, and "any of" genres / keywords / text pattern).
 * Returns null when a requested genre doesn't exist, which means an empty result.
 */
export const buildTitleFilter = async ({
  type,
  genre,
  country,
  language,
  year,
  free,
  sort,
  release,
  award,
  minSeasons,
  minRating,
  minVotes,
  genreAny,
  keywordsAny,
  pattern,
  excludeIds,
} = {}) => {
  const filter = { isPublished: true };
  if (type) filter.type = type;
  if (country) filter.countries = country;
  if (language) filter.languages = language;
  if (year) filter.year = year;
  if (typeof free === 'boolean') filter.isFree = free;
  if (sort === 'rating') filter.voteCount = { $gte: MIN_VOTES_FOR_RATING_SORT };
  if (release === 'released') filter.releaseDate = { $lte: new Date() };
  if (release === 'upcoming') filter.releaseDate = { $gt: new Date() };
  // "Latest" means latest out: unreleased titles belong to Coming Soon, not the top of this sort
  if (sort === 'latest' && !release) filter.releaseDate = { $lte: new Date() };
  if (award) filter['awards.0'] = { $exists: true };
  if (minSeasons) filter.numberOfSeasons = { $gte: minSeasons };
  if (minRating) filter.rating = { $gte: minRating };
  // per-type vote floor ({ movie, series, reality }): reality shows get far fewer votes than films
  if (minVotes) {
    const floor = (t) => Math.max(minVotes[t] ?? 0, sort === 'rating' ? MIN_VOTES_FOR_RATING_SORT : 0);
    if (type) filter.voteCount = { $gte: floor(type) };
    else filter.$and = [{ $or: Object.keys(minVotes).map((t) => ({ type: t, voteCount: { $gte: floor(t) } })) }];
  }
  if (excludeIds?.length) filter._id = { $nin: excludeIds };

  if (genre) {
    const [id] = await genreIdsFor([genre]);
    if (!id) return null;
    filter.genres = id;
  }

  // "any of these": a title qualifies through a genre, a keyword, or its title/overview text
  const any = [];
  if (genreAny?.length) any.push({ genres: { $in: await genreIdsFor(genreAny) } });
  if (keywordsAny?.length) any.push({ keywords: { $in: keywordsAny } });
  if (pattern) any.push({ title: pattern }, { overview: pattern });
  if (any.length) filter.$or = any;

  return filter;
};

/** One page of cards for a filter */
export const findTitlesPage = async (filter, sort, page, limit) => {
  const [results, totalResults] = await Promise.all([
    Title.find(filter)
      .select(CARD_FIELDS)
      .populate('genres', 'name slug')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Title.countDocuments(filter),
  ]);
  return paged(results, page, limit, totalResults);
};

/** GET /titles */
export const listTitles = async (params) => {
  const { sort, page, limit } = params;
  const filter = await buildTitleFilter(params);
  if (!filter) return emptyPage(page, limit);
  return findTitlesPage(filter, SORTS[sort], page, limit);
};

/** GET /titles/facets: the countries, languages and year range present, for the filter dropdowns */
export const getFacets = async ({ type }) => {
  const match = { isPublished: true };
  if (type) match.type = type;
  const [result] = await Title.aggregate([
    { $match: match },
    {
      $facet: {
        countries: [{ $unwind: '$countries' }, { $group: { _id: '$countries', count: { $sum: 1 } } }],
        languages: [{ $unwind: '$languages' }, { $group: { _id: '$languages', count: { $sum: 1 } } }],
        years: [
          { $match: { year: { $ne: null } } },
          { $group: { _id: null, min: { $min: '$year' }, max: { $max: '$year' } } },
        ],
      },
    },
  ]);
  const byCount = (rows) => rows.sort((a, b) => b.count - a.count).map((r) => ({ code: r._id, count: r.count }));
  return {
    countries: byCount(result.countries),
    languages: byCount(result.languages),
    years: result.years[0] ? { min: result.years[0].min, max: result.years[0].max } : null,
  };
};

/** GET /titles/:slug — everything the detail page needs, minus episodes (see getEpisodes) */
export const getTitleBySlug = async (slug) => {
  const title = await Title.findOne({ slug, isPublished: true })
    .populate('genres', 'name slug')
    .populate('cast.person', 'name profileUrl')
    .populate('crew.person', 'name profileUrl');
  if (!title) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');

  const seasons = await Season.find({ title: title._id }).sort({ seasonNumber: 1 });

  const json = title.toJSON();
  json.cast = [...json.cast].sort((a, b) => a.order - b.order);
  const directors = json.crew.filter((c) => c.job === 'Director' || c.job === 'Creator');
  return {
    ...json,
    director: directors.map((d) => ({ ...d.person, job: d.job })),
    seasons: seasons.map((s) => s.toJSON()),
  };
};

/** GET /titles/:id/seasons/:seasonNumber/episodes */
export const getEpisodes = async (titleId, seasonNumber) => {
  const season = await Season.findOne({ title: titleId, seasonNumber });
  if (!season) throw new ApiError(httpStatus.NOT_FOUND, 'Season not found');
  const episodes = await Episode.find({ season: season._id }).sort({ episodeNumber: 1 });
  return { season, episodes };
};

/** GET /titles/:id/similar — same type, ranked by how many genres it shares, then popularity */
export const getSimilar = async (titleId, limit) => {
  const source = await Title.findOne({ _id: titleId, isPublished: true }).select('type genres').lean();
  if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');
  if (!source.genres.length) return [];

  const ranked = await Title.aggregate([
    { $match: { _id: { $ne: source._id }, type: source.type, isPublished: true, genres: { $in: source.genres } } },
    { $addFields: { shared: { $size: { $setIntersection: ['$genres', source.genres] } } } },
    { $sort: { shared: -1, popularity: -1, _id: 1 } },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]);

  // Re-read as documents so the toJSON plugin applies (id, private fields), keeping the ranked order
  const ids = ranked.map((r) => r._id);
  const docs = await Title.find({ _id: { $in: ids } })
    .select(CARD_FIELDS)
    .populate('genres', 'name slug');
  const byId = new Map(docs.map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id.toString())).filter(Boolean);
};

/** GET /genres — with how many published titles each has, optionally within one type */
export const listGenres = async ({ type }) => {
  const match = { isPublished: true };
  if (type) match.type = type;

  const counts = await Title.aggregate([
    { $match: match },
    { $unwind: '$genres' },
    { $group: { _id: '$genres', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const genres = await Genre.find({ _id: { $in: counts.map((c) => c._id) } }).sort({ name: 1 });
  return genres.map((g) => ({ ...g.toJSON(), count: countById.get(g.id) ?? 0 }));
};

/** GET /search?q= — case-insensitive substring match on title / original title */
export const searchTitles = async ({ q, type, page, limit }) => {
  const pattern = new RegExp(escapeRegExp(q), 'i');
  const filter = { isPublished: true, $or: [{ title: pattern }, { originalTitle: pattern }] };
  if (type) filter.type = type;

  const [results, totalResults] = await Promise.all([
    Title.find(filter)
      .select(CARD_FIELDS)
      .populate('genres', 'name slug')
      .sort({ viewCount: -1, popularity: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Title.countDocuments(filter),
  ]);
  return paged(results, page, limit, totalResults);
};
