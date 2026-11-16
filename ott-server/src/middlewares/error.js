// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: fixed an operator-precedence bug in errorConverter, Multer errors become 400s,
// Mongo duplicate-key errors become 409s, response matches ApiResponse ({ success: false }).
import mongoose from 'mongoose';
import multer from 'multer';
import httpStatus from 'http-status';
import config from '../config/config.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    if (error instanceof mongoose.Error || error instanceof multer.MulterError) {
      statusCode = httpStatus.BAD_REQUEST;
    } else if (error.code === 11000) {
      statusCode = httpStatus.CONFLICT;
    }
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    statusCode,
    message,
    success: false,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') {
    logger.error(err);
  }

  res.status(statusCode).send(response);
};
