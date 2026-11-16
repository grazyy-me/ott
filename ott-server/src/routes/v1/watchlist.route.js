import express from 'express';
import auth from '../../middlewares/auth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as watchlistValidation from '../../validations/watchlist.validation.js';
import * as watchlistController from '../../controllers/watchlist.controller.js';

// My List. Mounted at /v1/me/watchlist (see routes/v1/index.js)
const router = express.Router();

router.use(auth());
router.get('/', validateZod(watchlistValidation.listWatchlist), watchlistController.list);
router.get('/ids', watchlistController.ids);
router.put('/:titleId', validateZod(watchlistValidation.titleParam), watchlistController.add);
router.delete('/:titleId', validateZod(watchlistValidation.titleParam), watchlistController.remove);

export default router;
