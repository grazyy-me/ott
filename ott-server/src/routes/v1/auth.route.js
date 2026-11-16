import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import * as authValidation from '../../validations/auth.validation.js';
import * as authController from '../../controllers/auth.controller.js';
import * as oauthController from '../../controllers/oauth.controller.js';

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-tokens', authController.refreshTokens);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);
router.post('/send-verification-email', auth(), authController.sendVerificationEmail);
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);

// OAuth (browser redirects, not fetch calls)
router.get('/providers', oauthController.providers);
router.get('/google', oauthController.start('google'));
router.get('/google/callback', oauthController.callback('google'));
router.get('/github', oauthController.start('github'));
router.get('/github/callback', oauthController.callback('github'));

export default router;
