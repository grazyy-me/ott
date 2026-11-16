/**
 * The subscription plans. Prices live here, on the server only: the browser sends a plan code, never an
 * amount. `npm run billing:sync-plans` creates the matching plans in Razorpay and stores their ids (Plan model).
 * Yearly = ₹1,999, about 16% less than 12 × ₹199.
 */
export const PLANS = {
  monthly: {
    code: 'monthly',
    name: 'Monthly',
    interval: 'monthly',
    amountPaise: 19900,
    currency: 'INR',
    // Razorpay needs a number of billing cycles; 10 years of renewals
    totalCount: 120,
    features: ['Every title, ad-free', 'Full HD streaming', 'Watch on 2 screens', 'Cancel anytime'],
  },
  yearly: {
    code: 'yearly',
    name: 'Yearly',
    interval: 'yearly',
    amountPaise: 199900,
    currency: 'INR',
    totalCount: 10,
    features: ['Everything in Monthly', '2 months free', 'Watch on 4 screens', 'Cancel anytime'],
  },
};

export const PLAN_CODES = Object.keys(PLANS);

/** What a yearly plan saves against paying monthly for a year, in percent (rounded) */
export const yearlySavingPercent = () =>
  Math.round((1 - PLANS.yearly.amountPaise / (PLANS.monthly.amountPaise * 12)) * 100);
