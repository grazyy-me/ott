// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: dayjs instead of moment, tokens stored as SHA-256 hashes, access token returned
// separately from the refresh token (which the controller puts in a cookie).
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import config from '../config/config.js';
import { Token } from '../models/index.js';
import { tokenTypes } from '../config/tokens.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * @param {ObjectId|string} userId
 * @param {dayjs.Dayjs} expires
 * @param {string} type
 */
export const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId.toString(),
    iat: dayjs().unix(),
    exp: expires.unix(),
    type,
    // makes two tokens issued in the same second for the same user unique
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, secret);
};

export const saveToken = async (token, userId, expires, type, blacklisted = false) =>
  Token.create({ tokenHash: hashToken(token), user: userId, expires: expires.toDate(), type, blacklisted });

/** Verify the JWT and that it still exists in the DB; returns the token doc or throws */
export const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.type !== type) {
    throw new Error('Invalid token type');
  }
  const tokenDoc = await Token.findOne({ tokenHash: hashToken(token), type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/** @returns {Promise<{ accessToken: string, accessTokenExpires: Date, refreshToken: string }>} */
export const generateAuthTokens = async (user) => {
  const accessTokenExpires = dayjs().add(config.jwt.accessExpirationMinutes, 'minute');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = dayjs().add(config.jwt.refreshExpirationDays, 'day');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return { accessToken, accessTokenExpires: accessTokenExpires.toDate(), refreshToken };
};

/** Only one active reset link per user: older ones are invalidated */
export const generateResetPasswordToken = async (user) => {
  const expires = dayjs().add(config.jwt.resetPasswordExpirationMinutes, 'minute');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

export const generateVerifyEmailToken = async (user) => {
  const expires = dayjs().add(config.jwt.verifyEmailExpirationMinutes, 'minute');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};
