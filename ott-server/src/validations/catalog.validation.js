import { z } from 'zod';
import { TITLE_TYPES } from '../models/title.model.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');
const slug = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'must be a slug');

const page = z.coerce.number().int().min(1).max(1000).default(1);
const limit = (max = 50, fallback = 20) => z.coerce.number().int().min(1).max(max).default(fallback);

// "?free=true" / "?free=false"; anything else is rejected rather than silently ignored
const booleanFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listTitles = {
  query: z.object({
    type: z.enum(TITLE_TYPES).optional(),
    genre: slug.optional(), // genre slug, e.g. "science-fiction"
    country: z.string().length(2).toUpperCase().optional(), // ISO 3166-1, e.g. "IN"
    language: z.string().length(2).toLowerCase().optional(), // ISO 639-1, e.g. "hi"
    year: z.coerce.number().int().min(1888).max(2100).optional(),
    sort: z.enum(['latest', 'popular', 'rating']).default('latest'),
    free: booleanFlag.optional(),
    page,
    limit: limit(),
  }),
};

export const getTitle = {
  params: z.object({ slug }),
};

export const getSimilar = {
  params: z.object({ id: objectId }),
  query: z.object({ limit: limit(24, 12) }),
};

export const getEpisodes = {
  params: z.object({ id: objectId, seasonNumber: z.coerce.number().int().min(0).max(100) }),
};

export const listGenres = {
  query: z.object({ type: z.enum(TITLE_TYPES).optional() }),
};

export const search = {
  query: z.object({
    q: z.string().trim().min(2, 'must be at least 2 characters').max(80),
    type: z.enum(TITLE_TYPES).optional(),
    page,
    limit: limit(50, 20),
  }),
};
