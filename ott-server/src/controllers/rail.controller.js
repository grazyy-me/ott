import httpStatus from 'http-status';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import * as railService from '../services/rail.service.js';
import * as catalogService from '../services/catalog.service.js';

export const listRails = catchAsync(async (req, res) => {
  const rails = await railService.railsForPage(req.query.page, req.user);
  res.json(new ApiResponse(httpStatus.OK, { page: req.query.page, rails }));
});

/** GET /recommendations/home: the same rails as GET /rails?page=home (shared rails cached 5 min, personal 2 min) */
export const homeRecommendations = catchAsync(async (req, res) => {
  const rails = await railService.railsForPage('home', req.user);
  res.json(new ApiResponse(httpStatus.OK, { page: 'home', rails }));
});

export const railTitles = catchAsync(async (req, res) => {
  const { type, page, limit, ...filters } = req.query;
  const result = await railService.railTitles(req.params.key, { user: req.user, type, filters, page, limit });
  res.json(new ApiResponse(httpStatus.OK, result));
});

export const facets = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await catalogService.getFacets(req.query)));
});

export const continueWatching = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await railService.continueWatching(req.user, req.query)));
});

export const saveProgress = catchAsync(async (req, res) => {
  const progress = await railService.saveProgress(req.user, req.body);
  res.json(new ApiResponse(httpStatus.OK, { progress }));
});

export const removeProgress = catchAsync(async (req, res) => {
  await railService.removeProgress(req.user, req.params.titleId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const restoreProgress = catchAsync(async (req, res) => {
  await railService.restoreProgress(req.user, req.params.titleId);
  res.status(httpStatus.NO_CONTENT).send();
});
