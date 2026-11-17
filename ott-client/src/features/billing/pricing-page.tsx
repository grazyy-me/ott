import { Link, useNavigate, useSearchParams } from 'react-router'
import type { PlanCode } from '@/types/billing'
import { useDocumentTitle } from '@/lib/use-document-title'
import { PricingPlans } from '@/components/stream/pricing-plans'
import { BrowseHeader } from '@/features/browse/browse-page'
import { useEntitlement, useGetPlansQuery } from './billing-api'
import { useCheckout } from './use-checkout'

/**
 * /pricing[?plan=yearly][&next=/watch/slug]. Free vs Premium with a Monthly / Yearly switch; Subscribe runs the
 * Razorpay checkout (signing in first if needed) and goes on to `next` (or the account page) once paid.
 */
export function PricingPage() {
  useDocumentTitle('Plans')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const billing: PlanCode =
    params.get('plan') === 'yearly' ? 'yearly' : 'monthly'
  const next = params.get('next')
  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'
  const { data, isLoading, isError, refetch } = useGetPlansQuery()
  const { entitled } = useEntitlement()
  const checkout = useCheckout()

  const setBilling = (plan: PlanCode) => {
    const nextParams = new URLSearchParams(params)
    if (plan === 'monthly') nextParams.delete('plan')
    else nextParams.set('plan', plan)
    setParams(nextParams, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      <BrowseHeader
        eyebrow='Plans'
        title='Watch everything'
        description='Free titles are always free. Premium unlocks every movie, series and reality show. Cancel anytime.'
      />
      <section className='shell pb-24'>
        {isLoading ? (
          <div
            className='mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2'
            aria-busy='true'
          >
            <div className='h-[30rem] skeleton rounded-2xl' />
            <div className='h-[30rem] skeleton rounded-2xl' />
          </div>
        ) : isError || !data ? (
          <div className='py-20 text-center'>
            <p className='text-lg text-foreground/80'>Plans didn’t load.</p>
            <button
              type='button'
              onClick={() => refetch()}
              className='mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
            >
              Try again
            </button>
          </div>
        ) : (
          <PricingPlans
            plans={data.data.plans}
            savingPercent={data.data.yearlySavingPercent}
            billing={billing}
            onBillingChange={setBilling}
            entitled={entitled}
            busy={checkout.busy}
            onChoose={(plan) =>
              checkout.start(plan, {
                returnTo: `/pricing?${new URLSearchParams({ ...(plan === 'yearly' ? { plan } : {}), ...(next ? { next } : {}) })}`,
                onSuccess: () => navigate(safeNext),
              })
            }
          />
        )}
        <p className='mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground'>
          Payments are handled by Razorpay. Your plan renews automatically until
          you cancel; after cancelling you keep watching until the end of the
          period you paid for. See the{' '}
          <Link
            to='/terms'
            className='underline underline-offset-4 hover:text-foreground'
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            to='/refunds'
            className='underline underline-offset-4 hover:text-foreground'
          >
            refunds and cancellation
          </Link>
          .
        </p>
      </section>
    </>
  )
}
