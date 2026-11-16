import httpStatus from 'http-status';
import logger from '../config/logger.js';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import * as billingService from '../services/billing.service.js';

export const plans = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await billingService.listPlans()));
});

export const subscribe = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await billingService.subscribe(req.user, req.body.plan)));
});

export const verify = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await billingService.verifyCheckout(req.user, req.body)));
});

export const me = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await billingService.billingSummary(req.user)));
});

export const cancel = catchAsync(async (req, res) => {
  res.json(new ApiResponse(httpStatus.OK, await billingService.cancel(req.user)));
});

/**
 * Razorpay webhook. `req.body` is the raw Buffer (express.raw, mounted before express.json in app.js).
 * A bad signature gets 400; everything else valid gets 200 so Razorpay stops retrying, including duplicates.
 */
export const webhook = catchAsync(async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const result = await billingService.handleWebhook(
    raw,
    req.get('x-razorpay-signature'),
    req.get('x-razorpay-event-id')
  );
  logger.info(`razorpay webhook ${req.get('x-razorpay-event-id') ?? '-'}: ${result.result}`);
  res.json(new ApiResponse(httpStatus.OK, result));
});
