import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

/**
 * The Razorpay plan behind each plan code (see config/plans.js), created by `npm run billing:sync-plans`.
 * Amount and interval are copied so a price change is noticed (a Razorpay plan's price can't be edited:
 * a new plan is created and this row points at it).
 */
const planSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    razorpayPlanId: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    interval: { type: String, required: true },
  },
  { timestamps: true }
);

planSchema.plugin(toJSON);

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
