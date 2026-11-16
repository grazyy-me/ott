import mongoose from 'mongoose';
import { toJSON, paginate } from './plugins/index.js';

/** Razorpay's subscription states (https://razorpay.com/docs/payments/subscriptions/states/) */
export const SUBSCRIPTION_STATUSES = [
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'cancelled',
  'completed',
  'expired',
  'paused',
];

/**
 * A user's Razorpay subscription. Its status and dates come only from Razorpay (webhooks, or a fetch of the
 * subscription after checkout), never from the browser.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, required: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'created' },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    /** Cancelled by the user: access continues until currentPeriodEnd, then it ends */
    cancelAtPeriodEnd: { type: Boolean, default: false },
    endedAt: { type: Date, default: null },
    /** created_at of the newest Razorpay event applied: older events arriving late are not applied */
    lastEventAt: { type: Date, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, createdAt: -1 });
subscriptionSchema.plugin(toJSON);
subscriptionSchema.plugin(paginate);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
