/**
 * npm run billing:replay-webhook -- --event=subscription.charged --subscription=sub_XXXX [--port=5000]
 *   [--event-id=evt_X] [--status=active] [--days=30] [--user=<user id> --plan=monthly]
 *
 * Sends a sample Razorpay webhook to your local server, signed with RAZORPAY_WEBHOOK_SECRET exactly as
 * Razorpay signs it, so the webhook can be tested without a tunnel. The subscription must exist (start a
 * checkout first), or pass --user to have the webhook create it for that user, the way Razorpay's notes do (a
 * way to give a local test account a subscription without paying). Re-send with the same --event-id to see a
 * duplicate ignored. Local development only.
 */
import crypto from 'node:crypto';
import config from '../src/config/config.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  })
);
const event = args.event ?? 'subscription.charged';
const subscriptionId = args.subscription;
if (!subscriptionId || !config.razorpay.webhookSecret) {
  console.error('Needs --subscription=sub_... and RAZORPAY_WEBHOOK_SECRET in .env');
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const days = Number(args.days ?? 30);
const status =
  args.status ??
  {
    'subscription.authenticated': 'authenticated',
    'subscription.activated': 'active',
    'subscription.charged': 'active',
    'subscription.pending': 'pending',
    'subscription.halted': 'halted',
    'subscription.cancelled': 'cancelled',
    'subscription.completed': 'completed',
  }[event] ??
  'active';

const payload = {
  subscription: {
    entity: {
      id: subscriptionId,
      entity: 'subscription',
      status,
      current_start: now,
      current_end: now + days * 86400,
      ended_at: status === 'cancelled' || status === 'completed' ? now : null,
      notes: args.user ? { userId: args.user, plan: args.plan ?? 'monthly' } : {},
    },
  },
};
if (event === 'subscription.charged') {
  payload.payment = {
    entity: {
      id: `pay_replay${crypto.randomBytes(6).toString('hex')}`,
      entity: 'payment',
      amount: 19900,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      created_at: now,
    },
  };
}

const body = JSON.stringify({ entity: 'event', event, contains: Object.keys(payload), payload, created_at: now });
const signature = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(body).digest('hex');
const eventId = args['event-id'] ?? `evt_replay${crypto.randomBytes(6).toString('hex')}`;

const res = await fetch(`http://localhost:${args.port ?? config.port}/v1/billing/webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId },
  body,
});
console.log(res.status, await res.text());
