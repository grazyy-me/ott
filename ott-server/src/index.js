// From hagopj13/node-express-boilerplate (MIT), Mongoose 8 connection (no legacy options).
import dns from 'node:dns';
import mongoose from 'mongoose';
import app from './app.js';
import config from './config/config.js';
import logger from './config/logger.js';

// Some routers/ISPs refuse the SRV lookups that mongodb+srv:// needs (querySrv ECONNREFUSED).
// Set DNS_SERVERS=8.8.8.8,1.1.1.1 to resolve through public DNS instead.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

let server;

mongoose
  .connect(config.mongoose.url)
  .then(() => {
    logger.info('Connected to MongoDB');
    server = app.listen(config.port, () => {
      logger.info(`Listening on port ${config.port}`);
    });
  })
  .catch((error) => {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
