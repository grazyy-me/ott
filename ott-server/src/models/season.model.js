import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const seasonSchema = new mongoose.Schema(
  {
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true },
    tmdbId: { type: Number },
    seasonNumber: { type: Number, required: true },
    name: { type: String, default: '' },
    overview: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    airDate: { type: Date, default: null },
    episodeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

seasonSchema.index({ title: 1, seasonNumber: 1 }, { unique: true });
seasonSchema.plugin(toJSON);

const Season = mongoose.model('Season', seasonSchema);
export default Season;
