// Cookie pattern from hiteshchoudhary/chai-backend (ISC), refresh token only.
// The access token is never stored in a cookie: the client keeps it in memory.
import config from '../config/config.js';

const { name, options } = config.refreshCookie;

export const setRefreshCookie = (res, refreshToken) => res.cookie(name, refreshToken, options);

export const clearRefreshCookie = (res) => {
  // clearCookie must get the same options as res.cookie, minus maxAge
  const clearOptions = { ...options };
  delete clearOptions.maxAge;
  return res.clearCookie(name, clearOptions);
};

export const getRefreshCookie = (req) => req.cookies?.[name];
