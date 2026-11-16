// JWT strategy from hagopj13/node-express-boilerplate (MIT).
// Google + GitHub strategies written for this kit (stateless: no sessions).
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import config from './config.js';
import logger from './logger.js';
import { tokenTypes } from './tokens.js';
import { User } from '../models/index.js';
import { findOrCreateOAuthUser } from '../services/oauth.service.js';

const jwtStrategy = new JwtStrategy(
  { secretOrKey: config.jwt.secret, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },
  async (payload, done) => {
    try {
      if (payload.type !== tokenTypes.ACCESS) {
        throw new Error('Invalid token type');
      }
      const user = await User.findById(payload.sub);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
);

const oauthVerify = (provider) => async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateOAuthUser(provider, profile);
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
};

export const enabledProviders = { google: false, github: false };

export const setupPassport = () => {
  passport.use('jwt', jwtStrategy);

  const { google, github } = config.oauth;

  if (google.clientID && google.clientSecret) {
    passport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: google.clientID,
          clientSecret: google.clientSecret,
          callbackURL: `${config.serverUrl}/v1/auth/google/callback`,
        },
        oauthVerify('google')
      )
    );
    enabledProviders.google = true;
  } else {
    logger.warn('Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it');
  }

  if (github.clientID && github.clientSecret) {
    passport.use(
      'github',
      new GitHubStrategy(
        {
          clientID: github.clientID,
          clientSecret: github.clientSecret,
          callbackURL: `${config.serverUrl}/v1/auth/github/callback`,
          // user:email lets passport-github2 read private emails, which many GitHub users have
          scope: ['user:email'],
        },
        oauthVerify('github')
      )
    );
    enabledProviders.github = true;
  } else {
    logger.warn('GitHub OAuth disabled: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable it');
  }

  return passport;
};
