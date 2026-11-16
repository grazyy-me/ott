// Adapted from hiteshchoudhary/chai-backend (ISC).
// Changes: writes to the OS temp dir (Render's disk is ephemeral anyway), unique file names
// so parallel uploads can't overwrite each other, size limit and image-only filter.
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const imageFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new ApiError(httpStatus.BAD_REQUEST, 'Only JPG, PNG, WEBP or GIF images are allowed'));
};

/** Single image field, max 2 MB. Usage: uploadImage('avatar') */
export const uploadImage = (fieldName) =>
  multer({ storage, fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } }).single(fieldName);

/** Any file type; pass your own limits. Usage: upload({ fileSize: 10e6 }).single('file') */
export const upload = (limits = { fileSize: 10 * 1024 * 1024 }) => multer({ storage, limits });
