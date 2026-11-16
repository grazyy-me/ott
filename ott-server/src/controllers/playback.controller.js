import httpStatus from 'http-status';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import * as playbackService from '../services/playback.service.js';

export const startPlayback = catchAsync(async (req, res) => {
  const playback = await playbackService.startPlayback(req.user, req.params.titleId, req.body);
  res.json(new ApiResponse(httpStatus.OK, playback));
});

export const logView = catchAsync(async (req, res) => {
  const result = await playbackService.logView(req.user, req.params.titleId, req.body);
  res.json(new ApiResponse(httpStatus.OK, result));
});
