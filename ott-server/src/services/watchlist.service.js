import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Title, Watchlist } from '../models/index.js';
import { CARD_FIELDS, paged } from './catalog.service.js';

/** GET /me/watchlist — My List, most recently added first, as title cards */
export const listWatchlist = async (user, { page = 1, limit = 24 } = {}) => {
  const filter = { user: user._id };
  const [rows, total] = await Promise.all([
    Watchlist.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'title',
        select: CARD_FIELDS,
        match: { isPublished: true },
        populate: { path: 'genres', select: 'name slug' },
      }),
    Watchlist.countDocuments(filter),
  ]);
  // a title unpublished after it was added is skipped (populate leaves null)
  const results = rows.filter((r) => r.title).map((r) => ({ ...r.title.toJSON(), addedAt: r.createdAt }));
  return paged(results, page, limit, total);
};

/** GET /me/watchlist/ids — every title id on My List, so cards can show "added" without a request each */
export const watchlistIds = async (user) => {
  const rows = await Watchlist.find({ user: user._id }).select('title').lean();
  return rows.map((r) => r.title.toString());
};

/** PUT /me/watchlist/:titleId — idempotent */
export const addToWatchlist = async (user, titleId) => {
  const exists = await Title.exists({ _id: titleId, isPublished: true });
  if (!exists) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');
  await Watchlist.updateOne(
    { user: user._id, title: titleId },
    { $setOnInsert: { user: user._id, title: titleId } },
    { upsert: true }
  );
};

/** DELETE /me/watchlist/:titleId — idempotent */
export const removeFromWatchlist = async (user, titleId) => {
  await Watchlist.deleteOne({ user: user._id, title: titleId });
};
