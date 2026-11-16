import mongoose from 'mongoose';
import { toJSON, paginate } from './plugins/index.js';

export const TITLE_TYPES = ['movie', 'series', 'reality'];

const castSchema = new mongoose.Schema(
  {
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    character: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const crewSchema = new mongoose.Schema(
  {
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    job: { type: String, required: true },
  },
  { _id: false }
);

const titleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TITLE_TYPES, required: true },
    // TMDB ids are only unique per media type (a movie and a tv show can share one)
    tmdbId: { type: Number, required: true },
    tmdbType: { type: String, enum: ['movie', 'tv'], required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    originalTitle: { type: String, default: '', trim: true },
    tagline: { type: String, default: '' },
    overview: { type: String, default: '' },
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genre' }],
    countries: [{ type: String, uppercase: true }], // ISO 3166-1
    languages: [{ type: String, lowercase: true }], // ISO 639-1
    releaseDate: { type: Date, default: null },
    year: { type: Number, default: null },
    runtime: { type: Number, default: null }, // minutes (movies) or typical episode length (series)
    rating: { type: Number, default: 0, min: 0, max: 10 },
    voteCount: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 }, // TMDB popularity, tie-breaker for "popular"
    posterUrl: { type: String, default: '' },
    backdropUrl: { type: String, default: '' },
    trailerKey: { type: String, default: '' }, // YouTube video key
    cast: { type: [castSchema], default: [] },
    crew: { type: [crewSchema], default: [] },
    numberOfSeasons: { type: Number, default: 0 },
    numberOfEpisodes: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    // Never sent in catalog responses: the playback endpoint (phase 4) decides who gets a URL
    videoUrl: { type: String, default: '', private: true },
    hasVideo: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    tmdbSyncedAt: { type: Date },
  },
  { timestamps: true }
);

titleSchema.index({ tmdbType: 1, tmdbId: 1 }, { unique: true });
titleSchema.index({ type: 1 });
titleSchema.index({ genres: 1 });
titleSchema.index({ countries: 1 });
titleSchema.index({ languages: 1 });
titleSchema.index({ releaseDate: -1 });
titleSchema.index({ viewCount: -1 });
// the common list queries: filter by type, then sort
titleSchema.index({ type: 1, isPublished: 1, releaseDate: -1 });
titleSchema.index({ type: 1, isPublished: 1, viewCount: -1, popularity: -1 });
titleSchema.index({ type: 1, isPublished: 1, rating: -1 });
titleSchema.index({ isFree: 1 });

titleSchema.plugin(toJSON);
titleSchema.plugin(paginate);

const Title = mongoose.model('Title', titleSchema);
export default Title;
