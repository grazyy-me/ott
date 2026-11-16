import httpStatus from 'http-status';
import { Episode, Title } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { listPlans, userIsEntitled } from '../services/billing.service.js';

/**
 * Gate for the stream endpoint (`/titles/:id/stream?episodeId=`), after optionalAuth:
 * - free titles stream for anyone, guests included;
 * - everything else needs a signed-in user with an active subscription (billing.service isEntitled).
 * Otherwise it answers 402 with a structured error the client turns into the paywall:
 *   { statusCode: 402, success: false, code: 'SUBSCRIPTION_REQUIRED', requires: 'account' | 'subscription',
 *     message, plans }
 * On success it leaves the loaded title (and episode) on `req.stream` for the controller.
 */
const requireSubscription = () =>
  catchAsync(async (req, res, next) => {
    const title = await Title.findOne({ _id: req.params.id, isPublished: true });
    if (!title) throw new ApiError(httpStatus.NOT_FOUND, 'Title not found');

    let episode = null;
    if (title.type !== 'movie') {
      episode = req.query.episodeId
        ? await Episode.findOne({ _id: req.query.episodeId, title: title._id })
        : await Episode.findOne({ title: title._id }).sort({ seasonNumber: 1, episodeNumber: 1 });
      if (!episode) throw new ApiError(httpStatus.NOT_FOUND, 'Episode not found');
    }
    req.stream = { title, episode };

    if (title.isFree) return next();
    if (req.user && (await userIsEntitled(req.user.id))) return next();

    const signedIn = Boolean(req.user);
    const { plans } = await listPlans();
    return res.status(httpStatus.PAYMENT_REQUIRED).json({
      statusCode: httpStatus.PAYMENT_REQUIRED,
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      requires: signedIn ? 'subscription' : 'account',
      message: signedIn ? 'Subscribe to watch' : 'Sign in and subscribe to watch',
      plans,
    });
  });

export default requireSubscription;
