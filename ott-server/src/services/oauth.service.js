// Written for this kit. Finds or creates a user from a Google/GitHub profile and links
// the provider to an existing account with the same email.
import httpStatus from 'http-status';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

const pickEmail = (profile) => {
  const emails = profile.emails || [];
  // passport-github2 marks the primary email; Google lists the account email first
  const primary = emails.find((e) => e.primary) || emails.find((e) => e.verified !== false) || emails[0];
  return primary?.value?.toLowerCase();
};

export const findOrCreateOAuthUser = async (provider, profile) => {
  const idField = provider === 'google' ? 'googleId' : 'githubId';
  const providerId = String(profile.id);

  const existingByProvider = await User.findOne({ [idField]: providerId });
  if (existingByProvider) return existingByProvider;

  const email = pickEmail(profile);
  if (!email) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Your ${provider} account has no email address we can read. Add one, or sign up with email.`
    );
  }

  const avatarUrl = profile.photos?.[0]?.value || '';
  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    existingByEmail[idField] = providerId;
    existingByEmail.isEmailVerified = true;
    if (!existingByEmail.avatar?.url && avatarUrl) {
      existingByEmail.avatar = { url: avatarUrl, publicId: '' };
    }
    await existingByEmail.save();
    return existingByEmail;
  }

  return User.create({
    name: profile.displayName || profile.username || email.split('@')[0],
    email,
    [idField]: providerId,
    isEmailVerified: true,
    avatar: { url: avatarUrl, publicId: '' },
  });
};
