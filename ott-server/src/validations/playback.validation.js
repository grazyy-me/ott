import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

const playbackRequest = {
  params: z.object({ titleId: objectId }),
  // an empty body is fine: series then resume the right episode
  body: z.object({ episodeId: objectId.nullable().optional() }).default({}),
};

export const startPlayback = playbackRequest;
export const logView = playbackRequest;

export const stream = {
  params: z.object({ id: objectId }),
  query: z.object({ episodeId: objectId.optional() }),
};
