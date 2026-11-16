import { z } from 'zod';
import { TITLE_TYPES } from '../models/title.model.js';
import { PAGES, RAILS } from '../services/rail.service.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');
const page = z.coerce.number().int().min(1).max(1000).default(1);
const limit = z.coerce.number().int().min(1).max(48).default(24);

/** The FilterBar's filters, shared by "Show all" grids and filtered browse pages */
const filterBar = {
  country: z.string().length(2).toUpperCase().optional(),
  language: z.string().length(2).toLowerCase().optional(),
  genre: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'must be a slug')
    .optional(),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  // Latest, Most Watched, Top Rated
  sort: z.enum(['latest', 'popular', 'rating']).optional(),
};

export const listRails = {
  query: z.object({ page: z.enum(Object.keys(PAGES)).default('home') }),
};

export const railTitles = {
  params: z.object({ key: z.enum(Object.keys(RAILS)) }),
  query: z.object({ type: z.enum(TITLE_TYPES).optional(), ...filterBar, page, limit }),
};

export const facets = {
  query: z.object({ type: z.enum(TITLE_TYPES).optional() }),
};

export const continueWatching = {
  query: z.object({ type: z.enum(TITLE_TYPES).optional(), page, limit }),
};

export const saveProgress = {
  body: z.object({
    titleId: objectId,
    episodeId: objectId.nullable().optional(),
    positionSec: z
      .number()
      .min(0)
      .max(60 * 60 * 24),
    durationSec: z
      .number()
      .min(0)
      .max(60 * 60 * 24),
  }),
};

export const removeProgress = {
  params: z.object({ titleId: objectId }),
};
