import express from 'express';
import auth from '../../middlewares/auth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as playbackValidation from '../../validations/playback.validation.js';
import * as playbackController from '../../controllers/playback.controller.js';

// Mounted at /v1/playback. Playing anything needs an account (progress needs a user).
const router = express.Router();

router.use(auth());
router.post('/:titleId', validateZod(playbackValidation.startPlayback), playbackController.startPlayback);
router.post('/:titleId/view', validateZod(playbackValidation.logView), playbackController.logView);

export default router;
