import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const genreSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true }
);

genreSchema.plugin(toJSON);

const Genre = mongoose.model('Genre', genreSchema);
export default Genre;
