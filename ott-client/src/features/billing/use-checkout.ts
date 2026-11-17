import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { PlanCode } from '@/types/billing'
import { toast } from 'sonner'
import { useAppSelector } from '@/app/hooks'
import { selectAuthStatus } from '@/features/auth/auth-slice'
import { useSubscribeMutation, useVerifyCheckoutMutation } from './billing-api'

interface RazorpaySuccess {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open(): void
  on(
    event: 'payment.failed',
    handler: (r: { error?: { description?: string } }) => void
  ): void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading: Promise<void> | null = null

/** Razorpay's Checkout script, loaded only when someone presses Subscribe */
const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Razorpay Checkout could not load'))
    }
    document.head.append(script)
  })
  return loading
}

const errorMessage = (error: unknown) => {
  const e = error as { status?: number; data?: { message?: string } }
  if (e?.status === 409) return 'You already have an active subscription.'
  if (e?.status === 503)
    return 'Subscriptions aren’t available yet. Please try again later.'
  return e?.data?.message ?? 'Something went wrong. Please try again.'
}

export type CheckoutState = 'idle' | 'opening' | 'paying' | 'verifying'

/**
 * Starts a subscription: the server creates it (price decided server side), Razorpay Checkout takes the
 * payment, and the signed result goes back to the server to unlock access. Signed out, it sends you to
 * sign in first and back to `returnTo` afterwards.
 */
export function useCheckout() {
  const status = useAppSelector(selectAuthStatus)
  const navigate = useNavigate()
  const location = useLocation()
  const [subscribe] = useSubscribeMutation()
  const [verify] = useVerifyCheckoutMutation()
  const [state, setState] = useState<CheckoutState>('idle')

  const start = useCallback(
    async (
      plan: PlanCode,
      {
        onSuccess,
        returnTo,
      }: { onSuccess?: () => void; returnTo?: string } = {}
    ) => {
      if (status !== 'authenticated') {
        const back = returnTo ?? `${location.pathname}${location.search}`
        navigate(`/sign-in?redirect=${encodeURIComponent(back)}`)
        return
      }
      setState('opening')
      try {
        const [, started] = await Promise.all([
          loadCheckout(),
          subscribe({ plan }).unwrap(),
        ])
        const s = started.data
        if (!window.Razorpay)
          throw new Error('Razorpay Checkout could not load')
        const checkout = new window.Razorpay({
          key: s.keyId,
          subscription_id: s.subscriptionId,
          name: s.appName,
          description: `${s.plan.name} plan`,
          prefill: s.prefill,
          handler: async (response: RazorpaySuccess) => {
            setState('verifying')
            try {
              await verify({
                paymentId: response.razorpay_payment_id,
                subscriptionId: response.razorpay_subscription_id,
                signature: response.razorpay_signature,
              }).unwrap()
              toast.success('You’re subscribed. Enjoy watching!')
              onSuccess?.()
            } catch {
              // the webhook still activates it; this only delays the unlock
              toast.message(
                'Payment received. Your access will be ready in a moment.'
              )
            } finally {
              setState('idle')
            }
          },
          modal: { ondismiss: () => setState('idle') },
        })
        checkout.on('payment.failed', (r) => {
          toast.error(r.error?.description ?? 'The payment didn’t go through.')
        })
        setState('paying')
        checkout.open()
      } catch (error) {
        setState('idle')
        toast.error(errorMessage(error))
      }
    },
    [status, navigate, location, subscribe, verify]
  )

  return { start, state, busy: state !== 'idle' }
}
