export type PlanCode = 'monthly' | 'yearly'

export interface BillingPlan {
  code: PlanCode
  name: string
  interval: 'monthly' | 'yearly'
  /** In paise: 19900 = ₹199 */
  amountPaise: number
  currency: string
  features: string[]
  /** False until the plans are set up in Razorpay */
  available: boolean
}

export type SubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'paused'

/** GET /billing/me */
export interface BillingSummary {
  entitled: boolean
  subscription: {
    plan: PlanCode
    planName: string
    amountPaise: number | null
    status: SubscriptionStatus
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    endedAt: string | null
  } | null
  payments: {
    id: string
    razorpayPaymentId: string
    amountPaise: number
    currency: string
    status: string
    method: string | null
    paidAt: string
  }[]
}

/** POST /billing/subscribe */
export interface CheckoutStart {
  subscriptionId: string
  keyId: string
  plan: { code: PlanCode; name: string; amountPaise: number }
  prefill: { name: string; email: string }
  appName: string
}

/** The 402 body from GET /titles/:id/stream */
export interface SubscriptionRequired {
  statusCode: 402
  code: 'SUBSCRIPTION_REQUIRED'
  requires: 'account' | 'subscription'
  message: string
  plans: BillingPlan[]
}

/** ₹1,999 from 199900 paise */
export const formatRupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100)
