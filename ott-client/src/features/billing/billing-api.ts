import type { ApiResponse } from '@/types/api'
import type {
  BillingPlan,
  BillingSummary,
  CheckoutStart,
  PlanCode,
} from '@/types/billing'
import { useAppSelector } from '@/app/hooks'
import { baseApi } from '@/services/base-api'
import { selectAuthStatus } from '@/features/auth/auth-slice'

const api = baseApi.enhanceEndpoints({ addTagTypes: ['Billing'] })

export const billingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPlans: build.query<
      ApiResponse<{ plans: BillingPlan[]; yearlySavingPercent: number }>,
      void
    >({
      query: () => '/billing/plans',
      keepUnusedDataFor: 600,
    }),
    getBillingMe: build.query<ApiResponse<BillingSummary>, void>({
      query: () => '/billing/me',
      providesTags: ['Billing'],
    }),
    /** Creates the Razorpay subscription; the browser only names the plan, never a price */
    subscribe: build.mutation<ApiResponse<CheckoutStart>, { plan: PlanCode }>({
      query: (body) => ({ url: '/billing/subscribe', method: 'POST', body }),
    }),
    /** Checkout's signed success response; the server checks the signature and Razorpay's state */
    verifyCheckout: build.mutation<
      ApiResponse<BillingSummary>,
      { paymentId: string; subscriptionId: string; signature: string }
    >({
      query: (body) => ({ url: '/billing/verify', method: 'POST', body }),
      invalidatesTags: ['Billing'],
    }),
    cancelSubscription: build.mutation<ApiResponse<BillingSummary>, void>({
      query: () => ({ url: '/billing/cancel', method: 'POST' }),
      invalidatesTags: ['Billing'],
    }),
  }),
})

export const {
  useGetPlansQuery,
  useGetBillingMeQuery,
  useSubscribeMutation,
  useVerifyCheckoutMutation,
  useCancelSubscriptionMutation,
} = billingApi

/** Whether the signed-in user can watch premium titles (false signed out, and while loading) */
export function useEntitlement() {
  const status = useAppSelector(selectAuthStatus)
  const signedIn = status === 'authenticated'
  const { data, isLoading } = useGetBillingMeQuery(undefined, {
    skip: !signedIn,
  })
  return {
    signedIn,
    entitled: Boolean(data?.data.entitled),
    loading: signedIn && isLoading,
    summary: data?.data,
  }
}
