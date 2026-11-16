import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

export const listWatchlist = {
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(24),
  }),
};

export const titleParam = {
  params: z.object({ titleId: objectId }),
};
