import express from 'express';
import auth from '../../middlewares/auth.js';
import optionalAuth from '../../middlewares/optionalAuth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as playbackValidation from '../../validations/playback.validation.js';
import * as playbackController from '../../controllers/playback.controller.js';

// Mounted at /v1/playback.
const router = express.Router();

// guests may start free titles (no resume point for them); the video URL itself comes from /titles/:id/stream
router.post(
  '/:titleId',
  optionalAuth(),
  validateZod(playbackValidation.startPlayback),
  playbackController.startPlayback
);
router.post('/:titleId/view', auth(), validateZod(playbackValidation.logView), playbackController.logView);

export default router;
