// Written for this kit. Stateless OAuth: after Google/GitHub signs the user in, we set the refresh
// cookie and redirect to the frontend, which calls POST /v1/auth/refresh-tokens to get an access token.
import passport from 'passport';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { enabledProviders } from '../config/passport.js';
import { tokenService } from '../services/index.js';
import { setRefreshCookie } from '../utils/cookies.js';

const failureRedirect = (reason) => `${config.clientUrl}/sign-in?error=${encodeURIComponent(reason)}`;

export const start = (provider) => (req, res, next) => {
  if (!enabledProviders[provider]) {
    return res.redirect(failureRedirect(`${provider}_not_configured`));
  }
  const scope = provider === 'google' ? ['profile', 'email'] : ['user:email'];
  return passport.authenticate(provider, { scope, session: false, prompt: 'select_account' })(req, res, next);
};

export const callback = (provider) => (req, res, next) => {
  if (!enabledProviders[provider]) {
    return res.redirect(failureRedirect(`${provider}_not_configured`));
  }
  return passport.authenticate(provider, { session: false }, async (err, user) => {
    if (err || !user) {
      if (err) logger.warn(`${provider} OAuth failed: ${err.message}`);
      return res.redirect(failureRedirect('oauth_failed'));
    }
    try {
      const tokens = await tokenService.generateAuthTokens(user);
      setRefreshCookie(res, tokens.refreshToken);
      return res.redirect(`${config.clientUrl}/oauth/success`);
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
};

export const providers = (req, res) => res.json({ data: enabledProviders, success: true });
