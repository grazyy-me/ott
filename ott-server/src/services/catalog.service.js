import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Title, Genre, Season, Episode } from '../models/index.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cards and rails don't need the credits; videoUrl is private and stripped by toJSON anyway
const CARD_FIELDS = '-cast -crew -videoUrl';

const SORTS = {
  latest: { releaseDate: -1, _id: -1 },
  // viewCount starts at 0 for everything, so TMDB popularity breaks the ties until real views arrive
  popular: { viewCount: -1, popularity: -1, _id: -1 },
  rating: { rating: -1, voteCount: -1, _id: -1 },
};

// Below this many votes a 10/10 is noise, so the "rating" sort ignores such titles
const MIN_VOTES_FOR_RATING_SORT = 50;

const paged = (results, page, limit, totalResults) => ({
  results,
  page,
  limit,
  totalPages: Math.ceil(totalResults / limit),
  totalResults,
});

const emptyPage = (page, limit) => paged([], page, limit, 0);

/** GET /titles */
export const listTitles = async ({ type, genre, country, language, year, sort, free, page, limit }) => {
  const filter = { isPublished: true };
  if (type) filter.type = type;
  if (country) filter.countries = country;
  if (language) filter.languages = language;
  if (year) filter.year = year;
  if (typeof free === 'boolean') filter.isFree = free;
  if (sort === 'rating') filter.voteCount = { $gte: MIN_VOTES_FOR_RATING_SORT };

  if (genre) {
    const genreDoc = await Genre.findOne({ slug: genre }).select('_id').lean();
    if (!genreDoc) return emptyPage(page, limit);
    filter.genres = genreDoc._id;
  }

  const [results, totalResults] = await Promise.all([
    Title.find(filter)
      .select(CARD_FIELDS)
      .populate('genres', 'name slug')
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Title.countDocuments(filter),
  ]);
  return paged(results, page, limit, totalResults);
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
