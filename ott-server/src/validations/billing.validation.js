import { z } from 'zod';
import { PLAN_CODES } from '../config/plans.js';

export const subscribe = {
  body: z.object({ plan: z.enum(PLAN_CODES) }),
};

/** What Razorpay Checkout hands back on success (ids are Razorpay's documented formats) */
export const verify = {
  body: z.object({
    paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/, 'must be a Razorpay payment id'),
    subscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/, 'must be a Razorpay subscription id'),
    signature: z.string().regex(/^[0-9a-f]{64}$/i, 'must be a hex signature'),
  }),
};
