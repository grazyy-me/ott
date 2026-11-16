import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { Episode, Title, WatchProgress } from '../models/index.js';
import { CARD_FIELDS, SORTS, buildTitleFilter, emptyPage, findTitlesPage, paged } from './catalog.service.js';
import {
  GLOBAL_TTL,
  PERSONAL_TTL,
  becauseYouWatched,
  cache,
  rankedTitlesPage,
  recentSources,
  viewRanking,
} from './recommendation.service.js';

/*
 * The rail registry. Each rail is a named query; each page is an ordered list of rail keys.
 * A rail's own query sets what it is (e.g. Coming Soon = upcoming, soonest first); the FilterBar's
 * country / language / genre / year / sort are applied on top in "Show all".
 * Reality formats (Competition, Dating, Docu-reality) match TMDB keywords or the title/overview text: TMDB
 * has no format field, so this is a heuristic an admin can correct later.
 */
export const RAILS = {
  'continue-watching': { title: 'Continue Watching', personal: true },
  // ranked by recent views (time-decayed) and by views in the last 30 days; TMDB popularity fills the rest
  trending: { title: 'Trending Now', query: { sort: 'trending', release: 'released' }, ranking: 'trending' },
  latest: { title: 'Latest Releases', query: { sort: 'latest', release: 'released' } },
  'most-watched': {
    title: 'Most Watched',
    query: { sort: 'trending', release: 'released' },
    ranking: 'most-watched',
  },
  // the user's last and second-to-last watched titles
  'because-you-watched': { title: 'Because You Watched', personal: true, source: 0 },
  'because-you-watched-2': { title: 'Because You Watched', personal: true, source: 1 },
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
    'because-you-watched-2',
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
    'because-you-watched-2',
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
    'because-you-watched-2',
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

/** The episode after `episode`: next in its season, else the first of the next season */
export const nextEpisodeOf = (titleId, episode) =>
  Episode.findOne({
    title: titleId,
    $or: [
      { seasonNumber: episode.seasonNumber, episodeNumber: { $gt: episode.episodeNumber } },
      { seasonNumber: { $gt: episode.seasonNumber } },
    ],
  }).sort({ seasonNumber: 1, episodeNumber: 1 });

const episodeInfo = (e) =>
  e ? { id: String(e._id), seasonNumber: e.seasonNumber, episodeNumber: e.episodeNumber, name: e.name } : null;

/**
 * Continue Watching: unfinished titles, most recently watched first. A movie or episode in progress shows its
 * progress; a series whose last episode was finished shows the next one (`upNext`, 0%) while there is one.
 * Rows the user removed (dismissed) are left out until they watch the title again.
 */
export const continueWatching = async (user, { type, page = 1, limit = RAIL_SIZE } = {}) => {
  const latest = await WatchProgress.aggregate([
    { $match: { user: toObjectId(user.id), dismissed: { $ne: true } } },
    { $sort: { updatedAt: -1 } },
    // one entry per title: the latest progress (for a series, the latest episode)
    { $group: { _id: '$title', progress: { $first: '$$ROOT' } } },
    { $sort: { 'progress.updatedAt': -1 } },
    { $limit: 200 },
  ]);

  const titles = await Title.find({
    _id: { $in: latest.map((r) => r._id) },
    isPublished: true,
    ...(type ? { type } : {}),
  })
    .select(CARD_FIELDS)
    .populate('genres', 'name slug');
  const byId = new Map(titles.map((t) => [t.id, t]));
  const episodes = await Episode.find({ _id: { $in: latest.map((r) => r.progress.episode).filter(Boolean) } })
    .select('seasonNumber episodeNumber name')
    .lean();
  const episodeById = new Map(episodes.map((e) => [String(e._id), e]));

  const rows = (
    await Promise.all(
      latest.map(async ({ _id, progress }) => {
        const title = byId.get(String(_id));
        if (!title) return null;
        const episode = progress.episode ? episodeById.get(String(progress.episode)) : null;
        if (!progress.completed) {
          if (progress.positionSec <= 0) return null;
          return {
            title,
            progress: {
              positionSec: progress.positionSec,
              durationSec: progress.durationSec,
              percent: progress.durationSec
                ? Math.min(100, Math.round((progress.positionSec / progress.durationSec) * 100))
                : 0,
              updatedAt: progress.updatedAt,
              episode: episodeInfo(episode),
              upNext: false,
            },
          };
        }
        // finished: a movie is done; a series moves on to its next episode, if any
        if (!episode) return null;
        const next = await nextEpisodeOf(_id, episode);
        if (!next) return null;
        return {
          title,
          progress: {
            positionSec: 0,
            durationSec: (next.runtime ?? 0) * 60,
            percent: 0,
            updatedAt: progress.updatedAt,
            episode: episodeInfo(next),
            upNext: true,
          },
        };
      })
    )
  ).filter(Boolean);

  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit).map(({ title, progress }) => ({ ...title.toJSON(), progress }));
  return paged(items, page, limit, rows.length);
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
    const source = (await recentSources(user, type))[rail.source];
    if (!source) return { ...meta, source: null, ...emptyPage(page, limit) };
    return {
      ...meta,
      title: `Because You Watched ${source.title}`,
      source: { id: String(source._id), title: source.title, slug: source.slug },
      ...(await becauseYouWatched(user, source, { page, limit })),
    };
  }

  // a rail fixed to one type (Binge-worthy = series) is empty on another type's page
  if (rail.query.type && type && rail.query.type !== type) return { ...meta, ...emptyPage(page, limit) };
  const params = { ...rail.query, ...filters, type: rail.query.type ?? type };
  const sort = filters.sort ?? rail.query.sort;
  const filter = await buildTitleFilter({ ...params, sort });
  if (!filter) return { ...meta, ...emptyPage(page, limit) };
  // view-ranked rails keep their ranking unless the FilterBar asks for another sort
  if (rail.ranking && !filters.sort) {
    const ranked = await viewRanking(rail.ranking);
    return { ...meta, ...(await rankedTitlesPage(ranked, filter, SORTS[sort], page, limit)) };
  }
  return { ...meta, ...(await findTitlesPage(filter, SORTS[sort], page, limit)) };
};

const toRail = (key, result) => ({
  key,
  title: result.title,
  source: result.source ?? null,
  items: result.results,
  total: result.totalResults,
});

const loadRails = (keys, pageKey, user) => {
  const type = pageKey === 'home' ? undefined : pageKey;
  return Promise.all(keys.map(async (key) => toRail(key, await railTitles(key, { user, type, limit: RAIL_SIZE }))));
};

/**
 * GET /rails?page= and GET /recommendations/home: every rail of a page, first 16 titles each, in the page's
 * order; empty rails are left out. Shared rails are cached for 5 minutes, a user's personal rails (Continue
 * Watching, Because You Watched) for 2 minutes and dropped as soon as their progress changes.
 */
export const railsForPage = async (pageKey, user) => {
  const keys = PAGES[pageKey];
  const shared = keys.filter((key) => !RAILS[key].personal);
  const personal = user ? keys.filter((key) => RAILS[key].personal) : [];
  const [sharedRails, personalRails] = await Promise.all([
    cache.get(`rails:${pageKey}`, GLOBAL_TTL, () => loadRails(shared, pageKey)),
    personal.length
      ? cache.get(`user:${user.id}:${pageKey}`, PERSONAL_TTL, () => loadRails(personal, pageKey, user))
      : [],
  ]);
  const byKey = new Map([...sharedRails, ...personalRails].map((rail) => [rail.key, rail]));
  return keys.map((key) => byKey.get(key)).filter((rail) => rail && rail.items.length > 0);
};

/** Drops a user's cached personal rails (their progress or history changed) */
export const clearUserRails = (user) => cache.clear(`user:${user.id}:`);

// ---------------------------------------------------------------- progress (written by the player)

/** Past this share of the running time a title or episode counts as finished */
export const COMPLETE_AT = 0.95;

/** PUT /me/progress */
export const saveProgress = async (user, { titleId, episodeId = null, positionSec, durationSec }) => {
  const title = await Title.exists({ _id: titleId, isPublished: true });
  if (!title) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');
  const completed = durationSec > 0 && positionSec / durationSec >= COMPLETE_AT;
  const progress = await WatchProgress.findOneAndUpdate(
    { user: user.id, title: titleId, episode: episodeId },
    // watching again brings a removed title back to Continue Watching
    { $set: { positionSec, durationSec, completed, dismissed: false } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  clearUserRails(user);
  return progress;
};

/**
 * DELETE /me/progress/:titleId ("Remove from Continue Watching"). Hides the title from the row but keeps its
 * history (resume points, recommendations); saving progress for it again brings it back.
 */
export const removeProgress = async (user, titleId) => {
  // timestamps off: hiding (and Undo) must not move the title in "last watched" order
  await WatchProgress.updateMany(
    { user: user.id, title: titleId },
    { $set: { dismissed: true } },
    { timestamps: false }
  );
  clearUserRails(user);
};

/** POST /me/progress/:titleId/restore: Undo for Remove (the title is back in Continue Watching as it was) */
export const restoreProgress = async (user, titleId) => {
  await WatchProgress.updateMany(
    { user: user.id, title: titleId },
    { $set: { dismissed: false } },
    { timestamps: false }
  );
  clearUserRails(user);
};
