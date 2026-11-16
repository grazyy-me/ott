import httpStatus from 'http-status';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import * as watchlistService from '../services/watchlist.service.js';

export const list = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await watchlistService.listWatchlist(req.user, req.query)));
});

export const ids = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, { ids: await watchlistService.watchlistIds(req.user) }));
});

export const add = catchAsync(async (req, res) => {
  await watchlistService.addToWatchlist(req.user, req.params.titleId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const remove = catchAsync(async (req, res) => {
  await watchlistService.removeFromWatchlist(req.user, req.params.titleId);
  res.status(httpStatus.NO_CONTENT).send();
});
