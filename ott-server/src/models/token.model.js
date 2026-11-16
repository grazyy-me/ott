// Adapted from hagopj13/node-express-boilerplate (MIT).
// Change: stores a SHA-256 hash of the token, never the raw token, and lets MongoDB expire old docs.
import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';
import { tokenTypes } from '../config/tokens.js';

const tokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, index: true },
    user: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL],
      required: true,
    },
    expires: { type: Date, required: true },
    blacklisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index: MongoDB deletes the document once `expires` has passed
tokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

tokenSchema.plugin(toJSON);

const Token = mongoose.model('Token', tokenSchema);

export default Token;
