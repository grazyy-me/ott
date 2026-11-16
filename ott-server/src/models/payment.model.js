import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

/** One Razorpay charge on a subscription (from subscription.charged). Unique by Razorpay payment id. */
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    razorpayPaymentId: { type: String, required: true, unique: true },
    invoiceId: { type: String, default: null },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, default: 'captured' },
    method: { type: String, default: null },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, paidAt: -1 });
paymentSchema.plugin(toJSON);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
