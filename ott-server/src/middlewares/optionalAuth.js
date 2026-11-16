// Attaches req.user when a valid Bearer token is sent, and carries on without one otherwise.
// For public routes that personalise when signed in (e.g. GET /rails adds Continue Watching).
import passport from 'passport';

const optionalAuth = () => (req, res, next) => {
  if (!req.headers.authorization) return next();
  return passport.authenticate('jwt', { session: false }, (err, user) => {
    if (!err && user) req.user = user;
    next();
  })(req, res, next);
};

export default optionalAuth;
