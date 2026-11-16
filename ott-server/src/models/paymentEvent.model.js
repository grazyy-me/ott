import mongoose from 'mongoose';

/**
 * Every Razorpay webhook event received, by its x-razorpay-event-id. The unique id makes webhooks idempotent:
 * Razorpay retries deliveries, and a repeat is recognised here and ignored.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    razorpaySubscriptionId: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);
export default PaymentEvent;
