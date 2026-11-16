// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: Mongoose 8 (deleteOne instead of remove), avatar update via Cloudinary.
import httpStatus from 'http-status';
import { User, Token } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { uploadOnCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../utils/cloudinary.js';

export const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

export const queryUsers = async (filter, options) => User.paginate(filter, options);

export const getUserById = async (id) => User.findById(id);

export const getUserByEmail = async (email) => User.findOne({ email: email.toLowerCase() });

export const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

export const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await deleteFromCloudinary(user.avatar?.publicId);
  await Token.deleteMany({ user: user.id });
  await user.deleteOne();
  return user;
};

/** Upload a new avatar (temp file from multer) and remove the previous one from Cloudinary */
export const updateAvatar = async (user, file) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Avatar image is required');
  }
  if (!isCloudinaryConfigured) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'File uploads are not configured on the server');
  }
  const previousPublicId = user.avatar?.publicId;
  const { url, publicId } = await uploadOnCloudinary(file.path, {
    folder: 'avatars',
    transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
  });

  user.avatar = { url, publicId };
  await user.save();
  await deleteFromCloudinary(previousPublicId);
  return user;
};
