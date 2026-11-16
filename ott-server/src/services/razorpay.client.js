import crypto from 'node:crypto';
import httpStatus from 'http-status';
import config from '../config/config.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

/*
 * A small client for the Razorpay REST API (only the calls we use). Server side only: the key secret never
 * leaves this process. The base URL comes from config so tests can point it at a fake Razorpay.
 */

export const isConfigured = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret);

const request = async (method, path, body) => {
  if (!isConfigured()) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Payments are not set up yet');
  }
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const res = await fetch(`${config.razorpay.apiUrl}${path}`, {
    method,
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Razorpay's own message is logged, not shown: it can mention account details
    logger.error(`Razorpay ${method} ${path} failed: ${res.status} ${data?.error?.description ?? ''}`);
    throw new ApiError(httpStatus.BAD_GATEWAY, 'The payment provider could not complete the request');
  }
  return data;
};

export const createPlan = ({ period, interval = 1, name, amountPaise, currency, notes }) =>
  request('POST', '/plans', { period, interval, item: { name, amount: amountPaise, currency }, notes });

export const createSubscription = ({ planId, totalCount, notes }) =>
  request('POST', '/subscriptions', { plan_id: planId, total_count: totalCount, customer_notify: 1, notes });

export const fetchSubscription = (id) => request('GET', `/subscriptions/${encodeURIComponent(id)}`);

/** Cancels at the end of the current billing cycle (access continues until then) */
export const cancelSubscriptionAtCycleEnd = (id) =>
  request('POST', `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: 1 });

// ---------------------------------------------------------------- signatures

const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

/** Constant-time comparison of two hex signatures (no early exit that would leak how much matched) */
const sameSignature = (expected, received) => {
  if (typeof received !== 'string' || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Checkout success: signature = HMAC-SHA256(key secret, "<payment id>|<subscription id>") */
export const verifyCheckoutSignature = ({ paymentId, subscriptionId, signature }) =>
  isConfigured() && sameSignature(hmacHex(config.razorpay.keySecret, `${paymentId}|${subscriptionId}`), signature);

/** Webhooks: signature = HMAC-SHA256(webhook secret, the exact raw request body) */
export const verifyWebhookSignature = (rawBody, signature) =>
  Boolean(config.razorpay.webhookSecret) && sameSignature(hmacHex(config.razorpay.webhookSecret, rawBody), signature);
