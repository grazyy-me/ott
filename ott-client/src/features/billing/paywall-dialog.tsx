import { useState } from 'react'
import { Link } from 'react-router'
import {
  formatRupees,
  type PlanCode,
  type SubscriptionRequired,
} from '@/types/billing'
import { Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCheckout } from './use-checkout'

/**
 * "Subscribe to watch": opened by a 402 from the stream endpoint. Signed out, it offers sign in / sign up
 * (coming back here afterwards); signed in, the two plans and checkout right here. `onSubscribed` runs once
 * the payment is verified, so the caller can load the stream.
 */
export function PaywallDialog({
  open,
  required,
  titleName,
  returnTo,
  onClose,
  onSubscribed,
}: {
  open: boolean
  required: SubscriptionRequired
  titleName: string
  returnTo: string
  onClose: () => void
  onSubscribed: () => void
}) {
  const [plan, setPlan] = useState<PlanCode>('yearly')
  const checkout = useCheckout()
  const needsAccount = required.requires === 'account'
  const back = encodeURIComponent(returnTo)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <span className='mx-auto flex size-12 items-center justify-center rounded-full glass'>
            <Lock className='size-5' aria-hidden='true' />
          </span>
          <DialogTitle className='text-center font-display text-2xl'>
            Subscribe to watch
          </DialogTitle>
          <DialogDescription className='text-center'>
            {needsAccount
              ? `${titleName} is a Premium title. Sign in, then pick a plan to watch it and everything else.`
              : `${titleName} is part of Premium. Pick a plan to start watching right away.`}
          </DialogDescription>
        </DialogHeader>

        {needsAccount ? (
          <div className='grid gap-3'>
            <Link
              to={`/sign-in?redirect=${back}`}
              className='inline-flex h-11 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              Sign in
            </Link>
            <Link
              to={`/sign-up?redirect=${back}`}
              className='inline-flex h-11 items-center justify-center rounded-full border border-border font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            >
              Create an account
            </Link>
          </div>
        ) : (
          <>
            <div role='radiogroup' aria-label='Plan' className='grid gap-3'>
              {required.plans.map((p) => (
                <button
                  key={p.code}
                  type='button'
                  role='radio'
                  aria-checked={plan === p.code}
                  onClick={() => setPlan(p.code)}
                  disabled={!p.available}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                    plan === p.code
                      ? 'border-foreground/60 bg-accent'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  <span>
                    <span className='block font-semibold'>{p.name}</span>
                    <span className='text-sm text-muted-foreground'>
                      {p.code === 'yearly' ? 'Best value' : 'Cancel anytime'}
                    </span>
                  </span>
                  <span className='font-semibold tabular-nums'>
                    {formatRupees(p.amountPaise)}
                    <span className='font-normal text-muted-foreground'>
                      /{p.code === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type='button'
              disabled={checkout.busy}
              onClick={() =>
                checkout.start(plan, { returnTo, onSuccess: onSubscribed })
              }
              className='inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'
            >
              {checkout.busy && (
                <Loader2 className='size-4 animate-spin motion-reduce:animate-none' />
              )}
              Continue to payment
            </button>
            <Link
              to='/pricing'
              className='text-center text-sm text-muted-foreground underline-offset-4 hover:underline'
            >
              Compare plans
            </Link>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
