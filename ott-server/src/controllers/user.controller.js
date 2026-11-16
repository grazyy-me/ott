// Adapted from hagopj13/node-express-boilerplate (MIT) + "me" and avatar endpoints for this kit.
import httpStatus from 'http-status';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import { userService } from '../services/index.js';

// ---- Current user ----
export const getMe = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, { user: req.user }));
});

export const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.user.id, req.body);
  res.json(new ApiResponse(httpStatus.OK, { user }, 'Profile updated'));
});

export const updateMyAvatar = catchAsync(async (req, res) => {
  const user = await userService.updateAvatar(req.user, req.file);
  res.json(new ApiResponse(httpStatus.OK, { user }, 'Avatar updated'));
});

// ---- Admin ----
export const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).json(new ApiResponse(httpStatus.CREATED, { user }, 'User created'));
});

export const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.json(new ApiResponse(httpStatus.OK, result));
});

export const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.json(new ApiResponse(httpStatus.OK, { user }));
});

export const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.json(new ApiResponse(httpStatus.OK, { user }, 'User updated'));
});

export const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});
