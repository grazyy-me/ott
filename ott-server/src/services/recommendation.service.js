import mongoose from 'mongoose';
import { Title, ViewEvent, WatchProgress } from '../models/index.js';
import { createTtlCache } from '../utils/ttlCache.js';
import { CARD_FIELDS, emptyPage, paged } from './catalog.service.js';

/*
 * Recommendations without ML: weighted overlap for "Because you watched", view counts for Most Watched,
 * time-decayed views for Trending. TMDB popularity fills the slots views can't (cold start).
 */

const DAY = 24 * 60 * 60 * 1000;
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

export const cache = createTtlCache();
export const GLOBAL_TTL = 5 * 60 * 1000;
export const PERSONAL_TTL = 2 * 60 * 1000;

// ---------------------------------------------------------------- view rankings

/** Most Watched: views per title in the last 30 days */
const MOST_WATCHED_DAYS = 30;
/** Trending: views in the last 14 days, each worth half as much every 3 days */
const TRENDING_DAYS = 14;
const TRENDING_HALF_LIFE_DAYS = 3;

/**
 * Title ids ranked by views, best first (at most 1000). `kind`: 'most-watched' or 'trending'.
 * Cached for 5 minutes: a new view shows up in the ranking within that time.
 */
export const viewRanking = (kind) =>
  cache.get(`views:${kind}`, GLOBAL_TTL, async () => {
    const now = Date.now();
    const trending = kind === 'trending';
    const since = new Date(now - (trending ? TRENDING_DAYS : MOST_WATCHED_DAYS) * DAY);
    const score = trending
      ? {
          $sum: {
            $pow: [0.5, { $divide: [{ $subtract: [new Date(now), '$createdAt'] }, TRENDING_HALF_LIFE_DAYS * DAY] }],
          },
        }
      : { $sum: 1 };
    const rows = await ViewEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$title', score } },
      { $sort: { score: -1, _id: 1 } },
      { $limit: 1000 },
    ]);
    return rows.map((r) => r._id);
  });

/**
 * One page of titles: first the ranked ones that match `filter` (in rank order), then everything else that
 * matches, by `fallbackSort`. The ranking leads as soon as it has views; until then the fallback fills the rail.
 */
export const rankedTitlesPage = async (rankedIds, filter, fallbackSort, page, limit) => {
  const matching = rankedIds.length
    ? await Title.find({ ...filter, _id: { ...(filter._id ?? {}), $in: rankedIds } })
        .select('_id')
        .lean()
    : [];
  const matchingSet = new Set(matching.map((m) => String(m._id)));
  const head = rankedIds.filter((id) => matchingSet.has(String(id)));

  const restFilter = { ...filter, _id: { $nin: [...(filter._id?.$nin ?? []), ...head] } };
  const restCount = await Title.countDocuments(restFilter);
  const start = (page - 1) * limit;

  const headIds = head.slice(start, start + limit);
  const headDocs = headIds.length
    ? await Title.find({ _id: { $in: headIds } })
        .select(CARD_FIELDS)
        .populate('genres', 'name slug')
    : [];
  const byId = new Map(headDocs.map((d) => [d.id, d]));
  const results = headIds.map((id) => byId.get(String(id))).filter(Boolean);

  if (results.length < limit) {
    const rest = await Title.find(restFilter)
      .sort(fallbackSort)
      .skip(Math.max(0, start - head.length))
      .limit(limit - results.length)
      .select(CARD_FIELDS)
      .populate('genres', 'name slug');
    results.push(...rest);
  }
  return paged(results, page, limit, head.length + restCount);
};

// ---------------------------------------------------------------- because you watched

/** Points for each kind of overlap with the source title */
export const WEIGHTS = { genre: 3, director: 5, cast: 2, language: 1.5, rating: 0.05, popularity: 0.05 };
const TOP_CAST = 10;
const CREATIVE_JOBS = ['Director', 'Creator'];

/** The user's most recently watched distinct titles (finished or not), newest first, optionally of one type */
export const recentSources = async (user, type, count = 2) => {
  const history = await WatchProgress.find({ user: user.id }).sort({ updatedAt: -1 }).select('title').limit(300).lean();
  const ids = [...new Set(history.map((h) => String(h.title)))].map(toObjectId);
  if (!ids.length) return [];
  const titles = await Title.find({ _id: { $in: ids }, isPublished: true, ...(type ? { type } : {}) })
    .select('title slug type genres languages cast crew')
    .lean();
  const order = new Map(ids.map((id, i) => [String(id), i]));
  return titles.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id))).slice(0, count);
};

/** Titles the user has finished (movies watched past 95%) */
const finishedTitleIds = (user) =>
  WatchProgress.distinct('title', { user: toObjectId(user.id), episode: null, completed: true });

/**
 * "Because you watched X": every other released title of the same type, scored by overlap with X:
 * shared genres (3 each), same director or creator (5), shared top-billed cast (2 each), same language (1.5),
 * plus a small rating and popularity boost to break ties. Excludes X and the user's finished titles.
 */
export const becauseYouWatched = async (user, source, { page = 1, limit = 16 } = {}) => {
  const creators = source.crew.filter((c) => CREATIVE_JOBS.includes(c.job)).map((c) => c.person);
  const castIds = source.cast
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, TOP_CAST)
    .map((c) => c.person);
  const finished = await finishedTitleIds(user);

  const overlap = (field, values) => ({ $size: { $setIntersection: [field, values] } });
  const creatorsOf = {
    $map: {
      input: { $filter: { input: '$crew', as: 'c', cond: { $in: ['$$c.job', CREATIVE_JOBS] } } },
      as: 'c',
      in: '$$c.person',
    },
  };
  const castOf = { $map: { input: { $slice: ['$cast', TOP_CAST] }, as: 'c', in: '$$c.person' } };

  const [result] = await Title.aggregate([
    {
      $match: {
        _id: { $nin: [source._id, ...finished] },
        type: source.type,
        isPublished: true,
        releaseDate: { $lte: new Date() },
        $or: [
          { genres: { $in: source.genres } },
          { 'cast.person': { $in: castIds } },
          { 'crew.person': { $in: creators } },
          { languages: { $in: source.languages } },
        ],
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: [WEIGHTS.genre, overlap('$genres', source.genres)] },
            { $cond: [{ $gt: [overlap(creatorsOf, creators), 0] }, WEIGHTS.director, 0] },
            { $multiply: [WEIGHTS.cast, overlap(castOf, castIds)] },
            { $cond: [{ $gt: [overlap('$languages', source.languages), 0] }, WEIGHTS.language, 0] },
            { $multiply: [WEIGHTS.rating, '$rating'] },
            { $multiply: [WEIGHTS.popularity, { $ln: { $add: [1, '$popularity'] } }] },
          ],
        },
      },
    },
    { $sort: { score: -1, popularity: -1, _id: 1 } },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1, score: 1 } }],
        total: [{ $count: 'n' }],
      },
    },
  ]);

  const ids = result.rows.map((r) => r._id);
  if (!ids.length) return emptyPage(page, limit);
  const docs = await Title.find({ _id: { $in: ids } })
    .select(CARD_FIELDS)
    .populate('genres', 'name slug');
  const byId = new Map(docs.map((d) => [d.id, d]));
  return paged(ids.map((id) => byId.get(String(id))).filter(Boolean), page, limit, result.total[0]?.n ?? 0);
};
