import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const watchlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true },
  },
  { timestamps: true }
);

watchlistSchema.index({ user: 1, title: 1 }, { unique: true });
watchlistSchema.index({ user: 1, createdAt: -1 });
watchlistSchema.plugin(toJSON);

const Watchlist = mongoose.model('Watchlist', watchlistSchema);
export default Watchlist;
