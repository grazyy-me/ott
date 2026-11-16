import httpStatus from 'http-status';
import config from '../config/config.js';
import ApiError from '../utils/ApiError.js';
import { Episode, Title, ViewEvent, WatchProgress } from '../models/index.js';
import { COMPLETE_AT, nextEpisodeOf } from './rail.service.js';

/** Resume only past this point (earlier, starting over is what people expect) */
const MIN_RESUME_SEC = 30;
/** Views from the same user of the same title (or episode) within this window are one session */
const VIEW_SESSION_MS = 30 * 60 * 1000;

const episodeCard = (e) =>
  e && {
    id: e.id ?? String(e._id),
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    name: e.name,
    stillUrl: e.stillUrl,
    runtime: e.runtime,
    hasVideo: e.hasVideo,
  };

/**
 * Which episode "Play" on a series means: the one in progress, else the one after the last finished, else
 * the very first.
 */
const episodeToPlay = async (user, title) => {
  const latest = await WatchProgress.findOne({ user: user.id, title: title._id, episode: { $ne: null } }).sort({
    updatedAt: -1,
  });
  if (latest) {
    const episode = await Episode.findById(latest.episode);
    if (episode && !latest.completed) return episode;
    if (episode) {
      const next = await nextEpisodeOf(title._id, episode);
      if (next) return next;
    }
  }
  return Episode.findOne({ title: title._id }).sort({ seasonNumber: 1, episodeNumber: 1 });
};

/**
 * POST /playback/:titleId: what to play and where to start (episode, resume point, next episode). It never
 * returns the video URL: that comes only from GET /titles/:id/stream, behind requireSubscription.
 * Guests (no user) get the first episode and no resume point; they can only stream free titles.
 */
export const startPlayback = async (user, titleId, { episodeId } = {}) => {
  const title = await Title.findOne({ _id: titleId, isPublished: true });
  if (!title) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');

  let episode = null;
  if (title.type !== 'movie') {
    episode = episodeId
      ? await Episode.findOne({ _id: episodeId, title: title._id })
      : user
        ? await episodeToPlay(user, title)
        : await Episode.findOne({ title: title._id }).sort({ seasonNumber: 1, episodeNumber: 1 });
    if (!episode) throw new ApiError(httpStatus.NOT_FOUND, 'Episode not found');
  }

  const hasVideo = Boolean(episode ? episode.videoUrl : title.videoUrl);
  if (!hasVideo) throw new ApiError(httpStatus.FORBIDDEN, 'This title isn’t available to stream yet');

  const progress = user
    ? await WatchProgress.findOne({ user: user.id, title: title._id, episode: episode?._id ?? null })
    : null;
  const nearEnd = progress?.durationSec && progress.positionSec / progress.durationSec >= COMPLETE_AT;
  const resumeAt =
    progress && !progress.completed && !nearEnd && progress.positionSec >= MIN_RESUME_SEC ? progress.positionSec : 0;
  const next = episode ? await nextEpisodeOf(title._id, episode) : null;

  return {
    resumeAt,
    isFree: title.isFree,
    title: {
      id: title.id,
      slug: title.slug,
      title: title.title,
      type: title.type,
      backdropUrl: title.backdropUrl,
      posterUrl: title.posterUrl,
      runtime: title.runtime,
    },
    episode: episodeCard(episode),
    next: episodeCard(next),
  };
};

/**
 * GET /titles/:id/stream (after requireSubscription, which loaded the title and episode): the only place the
 * video URL is ever returned. The demo streams are public URLs; with Cloudinary this becomes a short-lived
 * signed URL.
 */
export const streamFor = ({ title, episode }) => {
  const src = episode ? episode.videoUrl : title.videoUrl;
  if (!src) throw new ApiError(httpStatus.FORBIDDEN, 'This title isn’t available to stream yet');
  return { src, expiresAt: new Date(Date.now() + config.playback.urlTtlSeconds * 1000) };
};

/**
 * POST /playback/:titleId/view: one view per viewing session (sent when playback really starts). Repeats
 * within 30 minutes (reloads, seeks, pausing) don't count again. Feeds Most Watched and Trending.
 */
export const logView = async (user, titleId, { episodeId = null } = {}) => {
  const exists = await Title.exists({ _id: titleId, isPublished: true });
  if (!exists) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');
  const since = new Date(Date.now() - VIEW_SESSION_MS);
  const recent = await ViewEvent.exists({
    user: user.id,
    title: titleId,
    episode: episodeId,
    createdAt: { $gte: since },
  });
  if (recent) return { counted: false };
  await ViewEvent.create({ user: user.id, title: titleId, episode: episodeId });
  await Title.updateOne({ _id: titleId }, { $inc: { viewCount: 1 } });
  return { counted: true };
};
