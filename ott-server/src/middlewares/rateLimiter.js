// From hagopj13/node-express-boilerplate (MIT), updated to express-rate-limit v7 options.
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many attempts, please try again later', success: false },
});
