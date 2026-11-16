// Adapted from hagopj13/node-express-boilerplate (MIT) — env validation with Joi, extended for
// cookies, OAuth, Resend and Cloudinary.
import 'dotenv/config';
import Joi from 'joi';

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(5000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    CLIENT_URL: Joi.string().required().description('Frontend URL(s), comma separated'),
    SERVER_URL: Joi.string().default('http://localhost:5000').description('Public URL of this API'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(15),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number().default(10),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number().default(60),
    RESEND_API_KEY: Joi.string().allow('').description('Resend API key; empty = log emails to console'),
    APP_NAME: Joi.string().default('Streamly').description('Product name (placeholder, rename here)'),
    EMAIL_FROM: Joi.string().allow('').description('Defaults to "<APP_NAME> <onboarding@resend.dev>"'),
    GOOGLE_CLIENT_ID: Joi.string().allow(''),
    GOOGLE_CLIENT_SECRET: Joi.string().allow(''),
    GITHUB_CLIENT_ID: Joi.string().allow(''),
    GITHUB_CLIENT_SECRET: Joi.string().allow(''),
    CLOUDINARY_CLOUD_NAME: Joi.string().allow(''),
    CLOUDINARY_API_KEY: Joi.string().allow(''),
    CLOUDINARY_API_SECRET: Joi.string().allow(''),
    // ---- OTT additions ----
    TMDB_API_KEY: Joi.string().allow('').description('TMDB v3 API key; server-side only'),
    TMDB_READ_TOKEN: Joi.string().allow('').description('TMDB v4 read access token (used instead of the key if set)'),
    RAZORPAY_KEY_ID: Joi.string().allow(''),
    RAZORPAY_KEY_SECRET: Joi.string().allow(''),
    RAZORPAY_WEBHOOK_SECRET: Joi.string().allow(''),
    PLAYBACK_URL_TTL_SECONDS: Joi.number()
      .integer()
      .min(60)
      .default(4 * 60 * 60),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const clientUrls = envVars.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''));
const isProd = envVars.NODE_ENV === 'production';

const config = {
  appName: envVars.APP_NAME,
  env: envVars.NODE_ENV,
  isProd,
  port: envVars.PORT,
  clientUrls,
  clientUrl: clientUrls[0],
  serverUrl: envVars.SERVER_URL.replace(/\/$/, ''),
  mongoose: {
    url: envVars.MONGODB_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  // Refresh token cookie. Frontend (Vercel) and API (Render) live on different sites in production,
  // so the cookie must be SameSite=None + Secure there. See README "Cross-domain cookies".
  refreshCookie: {
    name: 'refreshToken',
    options: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/v1/auth',
      maxAge: envVars.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    },
  },
  email: {
    resendApiKey: envVars.RESEND_API_KEY,
    from: envVars.EMAIL_FROM || `${envVars.APP_NAME} <onboarding@resend.dev>`,
  },
  oauth: {
    google: { clientID: envVars.GOOGLE_CLIENT_ID, clientSecret: envVars.GOOGLE_CLIENT_SECRET },
    github: { clientID: envVars.GITHUB_CLIENT_ID, clientSecret: envVars.GITHUB_CLIENT_SECRET },
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
  tmdb: {
    apiKey: envVars.TMDB_API_KEY,
    readToken: envVars.TMDB_READ_TOKEN,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET,
    webhookSecret: envVars.RAZORPAY_WEBHOOK_SECRET,
  },
  playback: {
    urlTtlSeconds: envVars.PLAYBACK_URL_TTL_SECONDS,
  },
};

export default config;
