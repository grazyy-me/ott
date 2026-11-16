import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

// One row per playback start; Title.viewCount is incremented alongside (playback service, phase 4)
const viewEventSchema = new mongoose.Schema(
  {
    title: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

viewEventSchema.index({ title: 1, createdAt: -1 });
viewEventSchema.index({ user: 1, createdAt: -1 });
viewEventSchema.plugin(toJSON);

const ViewEvent = mongoose.model('ViewEvent', viewEventSchema);
export default ViewEvent;
