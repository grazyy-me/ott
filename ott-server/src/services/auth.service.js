// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: Mongoose 8, logout is idempotent, refresh returns the user too (one call restores a session).
import httpStatus from 'http-status';
import { Token } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { tokenTypes } from '../config/tokens.js';
import * as tokenService from './token.service.js';
import * as userService from './user.service.js';

export const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

export const logout = async (refreshToken) => {
  if (!refreshToken) return;
  await Token.deleteOne({ tokenHash: tokenService.hashToken(refreshToken), type: tokenTypes.REFRESH });
};

/** Rotates the refresh token: the old one is deleted and a new pair is issued */
export const refreshAuth = async (refreshToken) => {
  try {
    if (!refreshToken) throw new Error('Missing refresh token');
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    await refreshTokenDoc.deleteOne();
    const tokens = await tokenService.generateAuthTokens(user);
    return { user, tokens };
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

export const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    await userService.updateUserById(user.id, { password: newPassword });
    // sign out every session after a password reset
    await Token.deleteMany({ user: user.id, type: { $in: [tokenTypes.RESET_PASSWORD, tokenTypes.REFRESH] } });
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed. The link may have expired.');
  }
};

export const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    return userService.updateUserById(user.id, { isEmailVerified: true });
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed. The link may have expired.');
  }
};
