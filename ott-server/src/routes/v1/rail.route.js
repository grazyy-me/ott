import express from 'express';
import auth from '../../middlewares/auth.js';
import optionalAuth from '../../middlewares/optionalAuth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as railValidation from '../../validations/rail.validation.js';
import * as railController from '../../controllers/rail.controller.js';

// Mounted at the /v1 root (see routes/v1/index.js)
const router = express.Router();

// public, personalised when signed in (Continue Watching, Because You Watched)
router.get('/rails', optionalAuth(), validateZod(railValidation.listRails), railController.listRails);
router.get('/rails/:key/titles', optionalAuth(), validateZod(railValidation.railTitles), railController.railTitles);

// Home's ready-made rails: view-ranked Trending / Most Watched, scored Because You Watched, Continue Watching
router.get('/recommendations/home', optionalAuth(), railController.homeRecommendations);

// the FilterBar's country / language / year options
router.get('/titles/facets', validateZod(railValidation.facets), railController.facets);

// watch progress: read by Continue Watching now, written by the player (phase 4)
router.get(
  '/me/continue-watching',
  auth(),
  validateZod(railValidation.continueWatching),
  railController.continueWatching
);
router.put('/me/progress', auth(), validateZod(railValidation.saveProgress), railController.saveProgress);
router.delete(
  '/me/progress/:titleId',
  auth(),
  validateZod(railValidation.removeProgress),
  railController.removeProgress
);

router.post(
  '/me/progress/:titleId/restore',
  auth(),
  validateZod(railValidation.removeProgress),
  railController.restoreProgress
);

export default router;
