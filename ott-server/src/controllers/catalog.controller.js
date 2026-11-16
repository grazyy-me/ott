import httpStatus from 'http-status';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import * as catalogService from '../services/catalog.service.js';

export const listTitles = catchAsync(async (req, res) => {
  const result = await catalogService.listTitles(req.query);
  res.json(new ApiResponse(httpStatus.OK, result));
});

export const getTitle = catchAsync(async (req, res) => {
  const title = await catalogService.getTitleBySlug(req.params.slug);
  res.json(new ApiResponse(httpStatus.OK, { title }));
});

export const getSimilar = catchAsync(async (req, res) => {
  const results = await catalogService.getSimilar(req.params.id, req.query.limit);
  res.json(new ApiResponse(httpStatus.OK, { results }));
});

export const getEpisodes = catchAsync(async (req, res) => {
  const { season, episodes } = await catalogService.getEpisodes(req.params.id, req.params.seasonNumber);
  res.json(new ApiResponse(httpStatus.OK, { season, episodes }));
});

export const listGenres = catchAsync(async (req, res) => {
  const genres = await catalogService.listGenres(req.query);
  res.json(new ApiResponse(httpStatus.OK, { genres }));
});

export const search = catchAsync(async (req, res) => {
  const result = await catalogService.searchTitles(req.query);
  res.json(new ApiResponse(httpStatus.OK, result));
});
