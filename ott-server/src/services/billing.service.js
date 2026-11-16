import crypto from 'node:crypto';
import httpStatus from 'http-status';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { PLANS, yearlySavingPercent } from '../config/plans.js';
import { Payment, PaymentEvent, Plan, Subscription, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import * as razorpay from './razorpay.client.js';
import * as emailService from './email.service.js';

// ---------------------------------------------------------------- entitlement

/** States in which the user is paid up (pending = a renewal is being retried; access continues meanwhile) */
const PAID_STATES = ['authenticated', 'active', 'pending'];

/**
 * The one access rule: paid up, or cancelled but still inside the period already paid for.
 * Halted (renewals failed), expired and completed lock access.
 */
export const isEntitled = (sub, now = new Date()) =>
  Boolean(
    sub &&
    (PAID_STATES.includes(sub.status) ||
      (sub.status === 'cancelled' && sub.currentPeriodEnd && sub.currentPeriodEnd > now))
  );

/** The subscription that decides a user's access: an entitled one if any, else the most recent */
export const currentSubscription = async (userId) => {
  const subs = await Subscription.find({ user: userId }).sort({ createdAt: -1 }).limit(10);
  return subs.find((s) => isEntitled(s)) ?? subs.find((s) => s.status !== 'created') ?? null;
};

export const userIsEntitled = async (userId) => isEntitled(await currentSubscription(userId));

// ---------------------------------------------------------------- plans

/** GET /billing/plans: the public plan list (prices from config; "available" once synced to Razorpay) */
export const listPlans = async () => {
  const synced = await Plan.find().lean();
  const byCode = new Map(synced.map((p) => [p.code, p]));
  return {
    plans: Object.values(PLANS).map((p) => ({
      code: p.code,
      name: p.name,
      interval: p.interval,
      amountPaise: p.amountPaise,
      currency: p.currency,
      features: p.features,
      available: Boolean(byCode.get(p.code)?.razorpayPlanId) && razorpay.isConfigured(),
    })),
    yearlySavingPercent: yearlySavingPercent(),
  };
};

/**
 * `npm run billing:sync-plans`: makes sure every plan in config/plans.js exists in Razorpay with that price.
 * Razorpay plans can't be edited, so a price change creates a new plan; existing subscribers stay on theirs.
 */
export const syncPlans = async () => {
  const results = [];
  for (const p of Object.values(PLANS)) {
    const existing = await Plan.findOne({ code: p.code });
    if (existing && existing.amountPaise === p.amountPaise && existing.interval === p.interval) {
      results.push({ code: p.code, razorpayPlanId: existing.razorpayPlanId, created: false });
      continue;
    }
    const created = await razorpay.createPlan({
      period: p.interval,
      name: `${config.appName} ${p.name}`,
      amountPaise: p.amountPaise,
      currency: p.currency,
      notes: { code: p.code },
    });
    await Plan.findOneAndUpdate(
      { code: p.code },
      { code: p.code, razorpayPlanId: created.id, amountPaise: p.amountPaise, interval: p.interval },
      { upsert: true }
    );
    results.push({ code: p.code, razorpayPlanId: created.id, created: true });
  }
  return results;
};

// ---------------------------------------------------------------- applying Razorpay's state

const fromEpoch = (seconds) => (seconds ? new Date(seconds * 1000) : null);

/** Copies a Razorpay subscription entity onto our record (status and dates come only from Razorpay) */
const applyEntity = (sub, entity) => {
  if (entity.status) sub.status = entity.status;
  if (entity.current_start) sub.currentPeriodStart = fromEpoch(entity.current_start);
  if (entity.current_end) sub.currentPeriodEnd = fromEpoch(entity.current_end);
  if (entity.ended_at) sub.endedAt = fromEpoch(entity.ended_at);
  // Razorpay keeps an at-cycle-end cancellation pending as status active + has_scheduled_changes
  if (entity.status === 'cancelled') sub.cancelAtPeriodEnd = true;
};

// ---------------------------------------------------------------- subscribe / verify / cancel

/** How long an unpaid ("created") subscription is reused instead of creating another */
const REUSE_UNPAID_MS = 6 * 60 * 60 * 1000;

/**
 * POST /billing/subscribe: creates the Razorpay subscription for a plan code. Refuses if the user already has
 * access; reuses a recent unpaid one for the same plan instead of piling up new ones.
 */
export const subscribe = async (user, planCode) => {
  const plan = PLANS[planCode];
  if (!plan) throw new ApiError(httpStatus.BAD_REQUEST, 'Unknown plan');
  if (await userIsEntitled(user.id)) throw new ApiError(httpStatus.CONFLICT, 'You already have an active subscription');

  const synced = await Plan.findOne({ code: planCode });
  if (!synced || !razorpay.isConfigured()) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Subscriptions are not available yet');
  }

  let sub = await Subscription.findOne({
    user: user.id,
    plan: planCode,
    status: 'created',
    createdAt: { $gte: new Date(Date.now() - REUSE_UNPAID_MS) },
  }).sort({ createdAt: -1 });

  if (!sub) {
    const created = await razorpay.createSubscription({
      planId: synced.razorpayPlanId,
      totalCount: plan.totalCount,
      // lets the webhook find the user even if our record were missing
      notes: { userId: String(user.id), plan: planCode },
    });
    sub = await Subscription.create({
      user: user.id,
      plan: planCode,
      razorpaySubscriptionId: created.id,
      status: created.status ?? 'created',
    });
  }

  return {
    subscriptionId: sub.razorpaySubscriptionId,
    // the public key id; the secret never leaves the server
    keyId: config.razorpay.keyId,
    plan: { code: plan.code, name: plan.name, amountPaise: plan.amountPaise },
    prefill: { name: user.name, email: user.email },
    appName: config.appName,
  };
};

/**
 * POST /billing/verify: Checkout's success callback. Checks Razorpay's signature, that the subscription is the
 * user's, then reads the subscription from Razorpay and stores that state, so access unlocks at once. The
 * webhook remains the source of truth and corrects anything later.
 */
export const verifyCheckout = async (user, { paymentId, subscriptionId, signature }) => {
  const sub = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId, user: user.id });
  if (!sub) throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  if (!razorpay.verifyCheckoutSignature({ paymentId, subscriptionId, signature })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment verification failed');
  }
  try {
    applyEntity(sub, await razorpay.fetchSubscription(subscriptionId));
  } catch (error) {
    // the signature proves the first payment was authorised; the webhook fills in the rest
    logger.warn(`verify: could not fetch subscription ${subscriptionId}: ${error.message}`);
    if (sub.status === 'created') sub.status = 'authenticated';
  }
  await sub.save();
  return billingSummary(user);
};

/** POST /billing/cancel: cancels at the end of the period already paid for; access continues until then */
export const cancel = async (user) => {
  const sub = await currentSubscription(user.id);
  if (!sub || !isEntitled(sub) || sub.status === 'cancelled') {
    throw new ApiError(httpStatus.NOT_FOUND, 'No active subscription to cancel');
  }
  if (sub.cancelAtPeriodEnd) return billingSummary(user);
  const entity = await razorpay.cancelSubscriptionAtCycleEnd(sub.razorpaySubscriptionId);
  applyEntity(sub, entity);
  sub.cancelAtPeriodEnd = true;
  await sub.save();
  return billingSummary(user);
};

/** GET /billing/me */
export const billingSummary = async (user) => {
  const sub = await currentSubscription(user.id);
  const payments = await Payment.find({ user: user.id }).sort({ paidAt: -1 }).limit(24);
  return {
    entitled: isEntitled(sub),
    subscription: sub
      ? {
          plan: sub.plan,
          planName: PLANS[sub.plan]?.name ?? sub.plan,
          amountPaise: PLANS[sub.plan]?.amountPaise ?? null,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          endedAt: sub.endedAt,
        }
      : null,
    payments: payments.map((p) => p.toJSON()),
  };
};

// ---------------------------------------------------------------- webhooks

const HANDLED = new Set([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.updated',
]);

const safeEmail = async (send) => {
  try {
    await send();
  } catch (error) {
    logger.error(`billing email failed: ${error.message}`);
  }
};

const notify = async (sub, type) => {
  const user = await User.findById(sub.user);
  if (!user) return;
  const plan = PLANS[sub.plan]?.name ?? 'your plan';
  if (type === 'subscription.activated') await safeEmail(() => emailService.sendSubscriptionStartedEmail(user, plan));
  if (type === 'subscription.cancelled')
    await safeEmail(() => emailService.sendSubscriptionCancelledEmail(user, plan, sub.currentPeriodEnd));
  if (type === 'subscription.halted') await safeEmail(() => emailService.sendPaymentFailedEmail(user, plan));
};

/**
 * POST /billing/webhook. The signature is checked over the exact raw body before anything is parsed.
 * Each event id is stored first, so Razorpay's retries are recognised and ignored; if processing fails the
 * record is removed, so the retry can succeed. Events older than the last one applied don't change status.
 * Returns what happened (for logs and tests); the controller always answers 200 to a valid signature.
 */
export const handleWebhook = async (rawBody, signature, eventIdHeader) => {
  if (!razorpay.verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid signature');
  }
  const event = JSON.parse(rawBody.toString('utf8'));
  const eventId = eventIdHeader || crypto.createHash('sha256').update(rawBody).digest('hex');
  const entity = event.payload?.subscription?.entity;

  try {
    await PaymentEvent.create({
      eventId,
      type: event.event,
      razorpaySubscriptionId: entity?.id ?? null,
      payload: event.payload,
    });
  } catch (error) {
    if (error.code === 11000) return { result: 'duplicate' };
    throw error;
  }

  try {
    if (!HANDLED.has(event.event) || !entity) {
      await PaymentEvent.updateOne({ eventId }, { processedAt: new Date() });
      return { result: 'ignored' };
    }

    let sub = await Subscription.findOne({ razorpaySubscriptionId: entity.id });
    if (!sub) {
      // created outside this app (or our record was lost): recover it from the notes
      const userId = entity.notes?.userId;
      if (!userId || !(await User.exists({ _id: userId }))) {
        await PaymentEvent.updateOne({ eventId }, { processedAt: new Date() });
        return { result: 'unknown-subscription' };
      }
      sub = new Subscription({
        user: userId,
        plan: entity.notes?.plan ?? 'monthly',
        razorpaySubscriptionId: entity.id,
      });
    }

    // a payment is recorded whatever the order of events (unique by payment id)
    const payment = event.payload?.payment?.entity;
    if (event.event === 'subscription.charged' && payment?.id) {
      await Payment.updateOne(
        { razorpayPaymentId: payment.id },
        {
          $setOnInsert: {
            user: sub.user,
            subscription: sub._id,
            razorpayPaymentId: payment.id,
            invoiceId: payment.invoice_id ?? null,
            amountPaise: payment.amount,
            currency: payment.currency ?? 'INR',
            status: payment.status ?? 'captured',
            method: payment.method ?? null,
            paidAt: fromEpoch(payment.created_at) ?? new Date(),
          },
        },
        { upsert: true }
      );
    }

    const eventAt = fromEpoch(event.created_at) ?? new Date();
    const stale = sub.lastEventAt && eventAt < sub.lastEventAt;
    const before = sub.status;
    if (!stale) {
      applyEntity(sub, entity);
      sub.lastEventAt = eventAt;
    }
    await sub.save();
    await PaymentEvent.updateOne({ eventId }, { processedAt: new Date() });

    if (!stale && before !== sub.status) await notify(sub, event.event);
    return { result: stale ? 'stale' : 'applied', status: sub.status };
  } catch (error) {
    // let Razorpay's retry process it again
    await PaymentEvent.deleteOne({ eventId });
    throw error;
  }
};
