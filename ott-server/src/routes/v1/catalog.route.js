import express from 'express';
import optionalAuth from '../../middlewares/optionalAuth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as catalogValidation from '../../validations/catalog.validation.js';
import * as catalogController from '../../controllers/catalog.controller.js';

// Public catalog: no sign-in needed. Mounted at the /v1 root (see routes/v1/index.js).
const router = express.Router();

router.get('/titles', validateZod(catalogValidation.listTitles), catalogController.listTitles);
// "/:id/..." routes first; "/:slug" only matches a single path segment, so there is no clash
router.get('/titles/:id/similar', validateZod(catalogValidation.getSimilar), catalogController.getSimilar);
router.get(
  '/titles/:id/seasons/:seasonNumber/episodes',
  validateZod(catalogValidation.getEpisodes),
  catalogController.getEpisodes
);
// signed in, the detail also says whether the title is on My List
router.get('/titles/:slug', optionalAuth(), validateZod(catalogValidation.getTitle), catalogController.getTitle);

router.get('/genres', validateZod(catalogValidation.listGenres), catalogController.listGenres);
router.get('/search', validateZod(catalogValidation.search), catalogController.search);

export default router;
