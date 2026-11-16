import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const watchProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', default: null }, // null for movies
    positionSec: { type: Number, default: 0, min: 0 },
    durationSec: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false }, // set once past 95% of the duration
    // "Remove from Continue Watching": hidden from the row, history kept; watching again clears it
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

watchProgressSchema.index({ user: 1, title: 1, episode: 1 }, { unique: true });
watchProgressSchema.index({ user: 1, updatedAt: -1 });
watchProgressSchema.plugin(toJSON);

const WatchProgress = mongoose.model('WatchProgress', watchProgressSchema);
export default WatchProgress;
