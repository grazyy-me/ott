// Adapted from hagopj13/node-express-boilerplate (MIT).
// Changes: password optional for OAuth users, avatar (Cloudinary), googleId/githubId, Mongoose 8 hooks.
import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import { toJSON, paginate } from './plugins/index.js';
import { roles } from '../config/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      // Users who signed up with Google/GitHub have no password
      required() {
        return !this.googleId && !this.githubId;
      },
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // removed by the toJSON plugin
    },
    role: { type: String, enum: roles, default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '', private: true },
    },
    googleId: { type: String, index: true, sparse: true, private: true },
    githubId: { type: String, index: true, sparse: true, private: true },
  },
  { timestamps: true }
);

userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/** Whether the user can sign in with a password (false for OAuth-only accounts) */
userSchema.virtual('hasPassword').get(function () {
  return Boolean(this.password);
});
userSchema.set('toJSON', { ...userSchema.get('toJSON'), virtuals: true });

userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.methods.isPasswordMatch = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

const User = mongoose.model('User', userSchema);

export default User;
