import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const episodeSchema = new mongoose.Schema(
  {
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true },
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    tmdbId: { type: Number },
    seasonNumber: { type: Number, required: true },
    episodeNumber: { type: Number, required: true },
    name: { type: String, default: '' },
    overview: { type: String, default: '' },
    stillUrl: { type: String, default: '' },
    airDate: { type: Date, default: null },
    runtime: { type: Number, default: null },
    isFree: { type: Boolean, default: false },
    videoUrl: { type: String, default: '', private: true },
    hasVideo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

episodeSchema.index({ title: 1, seasonNumber: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ season: 1, episodeNumber: 1 });
episodeSchema.plugin(toJSON);

const Episode = mongoose.model('Episode', episodeSchema);
export default Episode;
