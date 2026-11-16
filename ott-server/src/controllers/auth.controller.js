// Adapted from hagopj13/node-express-boilerplate (MIT) + cookie handling from hiteshchoudhary/chai-backend (ISC).
// Response for login/register/refresh: { user, accessToken, accessTokenExpires }; refresh token goes in an httpOnly cookie.
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import logger from '../config/logger.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../utils/cookies.js';
import { authService, userService, tokenService, emailService } from '../services/index.js';

const sendAuthResponse = (res, statusCode, user, tokens, message) => {
  setRefreshCookie(res, tokens.refreshToken);
  return res
    .status(statusCode)
    .json(
      new ApiResponse(
        statusCode,
        { user, accessToken: tokens.accessToken, accessTokenExpires: tokens.accessTokenExpires },
        message
      )
    );
};

const sendVerificationEmailSafely = async (user) => {
  try {
    const token = await tokenService.generateVerifyEmailToken(user);
    await emailService.sendVerificationEmail(user.email, token);
  } catch (error) {
    // registration should still succeed if the email provider is down
    logger.error(`Verification email to ${user.email} failed: ${error.message}`);
  }
};

export const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  await sendVerificationEmailSafely(user);
  sendAuthResponse(res, httpStatus.CREATED, user, tokens, 'Account created. Check your inbox to verify your email.');
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  sendAuthResponse(res, httpStatus.OK, user, tokens, 'Signed in');
});

export const logout = catchAsync(async (req, res) => {
  await authService.logout(getRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(httpStatus.NO_CONTENT).send();
});

export const refreshTokens = catchAsync(async (req, res) => {
  try {
    const { user, tokens } = await authService.refreshAuth(getRefreshCookie(req));
    sendAuthResponse(res, httpStatus.OK, user, tokens, 'Session refreshed');
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
});

export const forgotPassword = catchAsync(async (req, res) => {
  const user = await userService.getUserByEmail(req.body.email);
  // Same response whether or not the account exists, so the endpoint can't be used to find users
  if (user) {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(user);
    await emailService.sendResetPasswordEmail(user.email, resetPasswordToken);
  }
  res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, null, 'If that email has an account, a reset link is on its way.'));
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  clearRefreshCookie(res);
  res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, null, 'Password updated. Sign in with your new password.'));
});

export const sendVerificationEmail = catchAsync(async (req, res) => {
  if (req.user.isEmailVerified) {
    return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, null, 'Email is already verified'));
  }
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  return res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, null, 'Verification email sent'));
});

export const verifyEmail = catchAsync(async (req, res) => {
  const user = await authService.verifyEmail(req.query.token);
  res.status(httpStatus.OK).json(new ApiResponse(httpStatus.OK, { user }, 'Email verified'));
});
