// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: ES modules, cookie-parser, CORS with credentials for the frontend origin(s),
// trust proxy for Render, removed the deprecated xss-clean package.
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import httpStatus from 'http-status';
import config from './config/config.js';
import * as morgan from './config/morgan.js';
import { setupPassport } from './config/passport.js';
import { authLimiter } from './middlewares/rateLimiter.js';
import { errorConverter, errorHandler } from './middlewares/error.js';
import routes from './routes/v1/index.js';
import ApiError from './utils/ApiError.js';

const app = express();

// Render (and most hosts) sit behind a proxy: needed for secure cookies and correct client IPs
if (config.isProd) {
  app.set('trust proxy', 1);
}

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

const corsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server calls and tools like curl (no Origin header)
    if (!origin || config.clientUrls.includes(origin)) return callback(null, true);
    return callback(new ApiError(httpStatus.FORBIDDEN, `Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(setupPassport().initialize());

if (config.isProd) {
  app.use('/v1/auth', authLimiter);
}

app.get('/', (req, res) => res.json({ name: config.appName, docs: '/v1/health' }));
app.use('/v1', routes);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(errorConverter);
app.use(errorHandler);

export default app;
