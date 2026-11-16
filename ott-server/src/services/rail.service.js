import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { Title, WatchProgress } from '../models/index.js';
import { CARD_FIELDS, SORTS, buildTitleFilter, emptyPage, findTitlesPage, paged } from './catalog.service.js';

/*
 * The rail registry. Each rail is a named query; each page is an ordered list of rail keys.
 * A rail's own query sets what it is (e.g. Coming Soon = upcoming, soonest first); the FilterBar's
 * country / language / genre / year / sort are applied on top in "Show all".
 * Reality formats (Competition, Dating, Docu-reality) match TMDB keywords or the title/overview text: TMDB
 * has no format field, so this is a heuristic an admin can correct later.
 */
export const RAILS = {
  'continue-watching': { title: 'Continue Watching', personal: true },
  trending: { title: 'Trending Now', query: { sort: 'trending', release: 'released' } },
  latest: { title: 'Latest Releases', query: { sort: 'latest', release: 'released' } },
  'most-watched': { title: 'Most Watched', query: { sort: 'popular', release: 'released' } },
  'because-you-watched': { title: 'Because You Watched', personal: true },
  'top-rated': {
    title: 'Top Rated',
    // a 9.6 from 400 votes shouldn't outrank Breaking Bad
    query: { sort: 'rating', minVotes: { movie: 1000, series: 1000, reality: 50 } },
  },
  'award-winners': { title: 'Award Winners', query: { award: true, sort: 'rating' } },
  free: { title: 'Free to Watch', query: { free: true, sort: 'popular' } },
  'binge-worthy': {
    title: 'Binge-worthy Series',
    query: { type: 'series', minSeasons: 3, minRating: 7.5, sort: 'popular' },
  },
  documentaries: {
    title: 'Documentaries',
    query: { genreAny: ['documentary'], keywordsAny: ['documentary', 'docuseries'], sort: 'popular' },
  },
  'coming-soon': { title: 'Coming Soon', query: { release: 'upcoming', sort: 'soonest' } },
  competition: {
    title: 'Competition',
    query: {
      type: 'reality',
      keywordsAny: ['competition', 'game show', 'talent show', 'singing competition', 'cooking competition'],
      pattern: /compet|contest|challenge|tournament|elimination|talent|idol|game show|quiz|showdown|vie for/i,
      sort: 'popular',
    },
  },
  dating: {
    title: 'Dating',
    query: {
      type: 'reality',
      keywordsAny: ['dating', 'dating show', 'matchmaking', 'romance', 'love', 'relationship'],
      pattern: /dating|romance|romantic|couples?\b|singles|\blove\b|tempt|matchmak|marriage/i,
      sort: 'popular',
    },
  },
  'docu-reality': {
    title: 'Docu-reality',
    query: {
      type: 'reality',
      keywordsAny: ['docuseries', 'docudrama', 'reality documentary', 'documentary'],
      pattern: /\bfollows?\b|lives of|life of|real-life|inside the|behind the scenes|peek inside|day in the life/i,
      sort: 'popular',
    },
  },
  // not shown as a rail: backs the filtered browse grid ("everything, filtered")
  all: { title: 'All titles', query: { sort: 'latest' }, hidden: true },
};

export const PAGES = {
  home: [
    'continue-watching',
    'trending',
    'latest',
    'most-watched',
    'because-you-watched',
    'top-rated',
    'award-winners',
    'free',
    'binge-worthy',
    'documentaries',
    'coming-soon',
  ],
  movie: [
    'continue-watching',
    'trending',
    'latest',
    'most-watched',
    'because-you-watched',
    'top-rated',
    'award-winners',
    'free',
    'documentaries',
    'coming-soon',
  ],
  series: [
    'continue-watching',
    'trending',
    'latest',
    'most-watched',
    'because-you-watched',
    'top-rated',
    'award-winners',
    'binge-worthy',
    'free',
    'coming-soon',
  ],
  reality: [
    'continue-watching',
    'trending',
    'latest',
    'most-watched',
    'competition',
    'dating',
    'docu-reality',
    'top-rated',
    'free',
    'coming-soon',
  ],
};

const RAIL_SIZE = 16;
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// ---------------------------------------------------------------- personal rails

/** Titles the user is part-way through, most recent first, each with its progress (and episode for series) */
export const continueWatching = async (user, { type, page = 1, limit = RAIL_SIZE } = {}) => {
  const [result] = await WatchProgress.aggregate([
    { $match: { user: toObjectId(user.id), completed: false, positionSec: { $gt: 0 } } },
    { $sort: { updatedAt: -1 } },
    // one entry per title: the latest progress (for a series, the latest episode)
    { $group: { _id: '$title', progress: { $first: '$$ROOT' } } },
    {
      $lookup: {
        from: 'titles',
        localField: '_id',
        foreignField: '_id',
        as: 'title',
        pipeline: [{ $project: { type: 1, isPublished: 1 } }],
      },
    },
    { $unwind: '$title' },
    { $match: { 'title.isPublished': true, ...(type ? { 'title.type': type } : {}) } },
    { $sort: { 'progress.updatedAt': -1 } },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'n' }] } },
  ]);
  const rows = result.rows;
  const titles = await Title.find({ _id: { $in: rows.map((r) => r._id) } })
    .select(CARD_FIELDS)
    .populate('genres', 'name slug');
  const episodes = await mongoose
    .model('Episode')
    .find({ _id: { $in: rows.map((r) => r.progress.episode).filter(Boolean) } })
    .select('seasonNumber episodeNumber name')
    .lean();
  const byId = new Map(titles.map((t) => [t.id, t]));
  const episodeById = new Map(episodes.map((e) => [String(e._id), e]));

  const items = rows
    .map(({ _id, progress }) => {
      const title = byId.get(String(_id));
      if (!title) return null;
      const episode = progress.episode ? episodeById.get(String(progress.episode)) : null;
      return {
        ...title.toJSON(),
        progress: {
          positionSec: progress.positionSec,
          durationSec: progress.durationSec,
          percent: progress.durationSec
            ? Math.min(100, Math.round((progress.positionSec / progress.durationSec) * 100))
            : 0,
          updatedAt: progress.updatedAt,
          episode: episode
            ? {
                id: String(episode._id),
                seasonNumber: episode.seasonNumber,
                episodeNumber: episode.episodeNumber,
                name: episode.name,
              }
            : null,
        },
      };
    })
    .filter(Boolean);
  return paged(items, page, limit, result.total[0]?.n ?? 0);
};

/** "Because you watched X": titles sharing the most genres with the user's most recent title, minus what they've seen */
export const becauseYouWatched = async (user, { type, page = 1, limit = RAIL_SIZE } = {}) => {
  const history = await WatchProgress.find({ user: user.id }).sort({ updatedAt: -1 }).select('title').limit(200).lean();
  if (!history.length) return { source: null, ...emptyPage(page, limit) };

  const watchedIds = [...new Set(history.map((h) => String(h.title)))].map(toObjectId);
  const sourceFilter = { _id: { $in: watchedIds }, isPublished: true, ...(type ? { type } : {}) };
  // the most recent watched title of this page's type
  const candidates = await Title.find(sourceFilter).select('title slug type genres').lean();
  const order = new Map(watchedIds.map((id, i) => [String(id), i]));
  const source = candidates.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)))[0];
  if (!source || !source.genres.length) return { source: null, ...emptyPage(page, limit) };

  const match = { _id: { $nin: watchedIds }, type: source.type, isPublished: true, genres: { $in: source.genres } };
  const [result] = await Title.aggregate([
    { $match: match },
    { $addFields: { shared: { $size: { $setIntersection: ['$genres', source.genres] } } } },
    { $sort: { shared: -1, popularity: -1, _id: 1 } },
    {
      $facet: {
        ids: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1 } }],
        total: [{ $count: 'n' }],
      },
    },
  ]);
  const ids = result.ids.map((r) => r._id);
  const docs = await Title.find({ _id: { $in: ids } })
    .select(CARD_FIELDS)
    .populate('genres', 'name slug');
  const byId = new Map(docs.map((d) => [d.id, d]));
  return {
    source: { id: String(source._id), title: source.title, slug: source.slug },
    ...paged(ids.map((id) => byId.get(String(id))).filter(Boolean), page, limit, result.total[0]?.n ?? 0),
  };
};

// ---------------------------------------------------------------- resolution

/**
 * One page of a rail. `filters` are the FilterBar's (country, language, genre, year, sort); a sort there
 * replaces the rail's own sort.
 */
export const railTitles = async (key, { user, type, filters = {}, page = 1, limit = RAIL_SIZE }) => {
  const rail = RAILS[key];
  if (!rail) throw new ApiError(httpStatus.NOT_FOUND, 'Rail not found');
  const meta = { key, title: rail.title };

  if (rail.personal) {
    if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Sign in to see this rail');
    if (key === 'continue-watching') return { ...meta, ...(await continueWatching(user, { type, page, limit })) };
    const result = await becauseYouWatched(user, { type, page, limit });
    return { ...meta, title: result.source ? `Because You Watched ${result.source.title}` : rail.title, ...result };
  }

  // a rail fixed to one type (Binge-worthy = series) is empty on another type's page
  if (rail.query.type && type && rail.query.type !== type) return { ...meta, ...emptyPage(page, limit) };
  const params = { ...rail.query, ...filters, type: rail.query.type ?? type };
  const sort = filters.sort ?? rail.query.sort;
  const filter = await buildTitleFilter({ ...params, sort });
  if (!filter) return { ...meta, ...emptyPage(page, limit) };
  return { ...meta, ...(await findTitlesPage(filter, SORTS[sort], page, limit)) };
};

/** GET /rails?page=: every rail of a page, first 16 titles each; empty rails are left out */
export const railsForPage = async (pageKey, user) => {
  const type = pageKey === 'home' ? undefined : pageKey;
  const keys = PAGES[pageKey].filter((key) => !RAILS[key].personal || user);
  const rails = await Promise.all(
    keys.map(async (key) => {
      const result = await railTitles(key, { user, type, limit: RAIL_SIZE });
      return {
        key,
        title: result.title,
        source: result.source ?? null,
        items: result.results,
        total: result.totalResults,
      };
    })
  );
  return rails.filter((rail) => rail.items.length > 0);
};

// ---------------------------------------------------------------- progress (used by the player in phase 4)

const COMPLETE_AT = 0.92;

/** PUT /me/progress */
export const saveProgress = async (user, { titleId, episodeId = null, positionSec, durationSec }) => {
  const title = await Title.exists({ _id: titleId, isPublished: true });
  if (!title) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');
  const completed = durationSec > 0 && positionSec / durationSec >= COMPLETE_AT;
  return WatchProgress.findOneAndUpdate(
    { user: user.id, title: titleId, episode: episodeId },
    { $set: { positionSec, durationSec, completed } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/** DELETE /me/progress/:titleId ("remove from Continue Watching") */
export const removeProgress = async (user, titleId) => {
  await WatchProgress.deleteMany({ user: user.id, title: titleId });
};
