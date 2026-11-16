// Adapted from hiteshchoudhary/chai-backend (ISC).
// Changes: throws instead of silently returning null, safe temp-file cleanup, delete helper.
import fs from 'node:fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import config from '../config/config.js';
import logger from '../config/logger.js';

const { cloudName, apiKey, apiSecret } = config.cloudinary;
export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
} else {
  logger.warn('Cloudinary disabled: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
}

const removeTempFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch {
    // already gone
  }
};

/**
 * Upload a temp file (written by multer) to Cloudinary, then delete the temp file.
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadOnCloudinary = async (localFilePath, { folder = 'uploads', ...options } = {}) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: 'auto',
      ...options,
    });
    return { url: response.secure_url, publicId: response.public_id };
  } finally {
    await removeTempFile(localFilePath);
  }
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.warn(`Could not delete Cloudinary asset ${publicId}: ${error.message}`);
  }
};
