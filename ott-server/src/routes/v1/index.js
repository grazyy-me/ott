import express from 'express';
import mongoose from 'mongoose';
import authRoute from './auth.route.js';
import userRoute from './user.route.js';
import catalogRoute from './catalog.route.js';
import railRoute from './rail.route.js';
import watchlistRoute from './watchlist.route.js';

const router = express.Router();

// Health check for Render and uptime monitors
router.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp, uptime: process.uptime() });
});

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/me/watchlist', watchlistRoute);
// rail routes first: '/titles/facets' must win over the catalog's '/titles/:slug'
router.use('/', railRoute);
router.use('/', catalogRoute);

export default router;
