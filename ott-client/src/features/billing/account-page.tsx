import { Link } from 'react-router'
import { formatRupees, type BillingSummary } from '@/types/billing'
import { ArrowRight, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useAppSelector } from '@/app/hooks'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { selectCurrentUser } from '@/features/auth/auth-slice'
import { BrowseHeader } from '@/features/browse/browse-page'
import {
  useCancelSubscriptionMutation,
  useGetBillingMeQuery,
} from './billing-api'

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not available'

const STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'off' }> = {
  created: { label: 'Awaiting payment', tone: 'warn' },
  authenticated: { label: 'Active', tone: 'ok' },
  active: { label: 'Active', tone: 'ok' },
  pending: { label: 'Payment retrying', tone: 'warn' },
  halted: { label: 'Payment failed', tone: 'off' },
  cancelled: { label: 'Cancelled', tone: 'off' },
  completed: { label: 'Ended', tone: 'off' },
  expired: { label: 'Expired', tone: 'off' },
  paused: { label: 'Paused', tone: 'warn' },
}

function SubscriptionCard({ summary }: { summary: BillingSummary }) {
  const [cancel, { isLoading: cancelling }] = useCancelSubscriptionMutation()
  const sub = summary.subscription
  if (!sub) {
    return (
      <div className='rounded-2xl glass p-6 md:p-8'>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          Plan
        </p>
        <p className='mt-3 font-display text-display-3 font-semibold'>Free</p>
        <p className='mt-2 text-foreground/75'>
          You can watch the free titles. Premium unlocks everything else.
        </p>
        <Link
          to='/pricing'
          className='mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          See plans <ArrowRight className='size-4' />
        </Link>
      </div>
    )
  }

  const status =
    sub.cancelAtPeriodEnd && summary.entitled
      ? { label: 'Cancels at period end', tone: 'warn' as const }
      : (STATUS[sub.status] ?? { label: sub.status, tone: 'warn' as const })
  const canCancel =
    summary.entitled && !sub.cancelAtPeriodEnd && sub.status !== 'cancelled'

  return (
    <div className='rounded-2xl glass p-6 md:p-8'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-eyebrow font-semibold text-muted-foreground uppercase'>
          Plan
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
            status.tone === 'ok' && 'border-foreground/25',
            status.tone === 'warn' && 'border-foreground/25 text-foreground/80',
            status.tone === 'off' && 'border-border text-muted-foreground'
          )}
        >
          {status.tone === 'ok' && (
            <span
              aria-hidden='true'
              className='size-1.5 rounded-full bg-stream-gradient'
            />
          )}
          {status.label}
        </span>
      </div>
      <p className='mt-3 font-display text-display-3 font-semibold'>
        Premium · {sub.planName}
      </p>
      {sub.amountPaise !== null && (
        <p className='mt-1 text-foreground/75'>
          {formatRupees(sub.amountPaise)} /{' '}
          {sub.plan === 'yearly' ? 'year' : 'month'}
        </p>
      )}
      <dl className='mt-6 grid gap-4 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-muted-foreground'>
            {summary.entitled &&
            !sub.cancelAtPeriodEnd &&
            sub.status !== 'cancelled'
              ? 'Renews on'
              : summary.entitled
                ? 'Access until'
                : sub.status === 'halted'
                  ? 'Status'
                  : 'Ended'}
          </dt>
          <dd className='mt-0.5 font-medium'>
            {/* a failed renewal has no end date: the period it was paying for never started */}
            {sub.status === 'halted'
              ? 'Premium paused'
              : dateLabel(
                  summary.entitled
                    ? sub.currentPeriodEnd
                    : (sub.endedAt ?? sub.currentPeriodEnd)
                )}
          </dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>Current period started</dt>
          <dd className='mt-0.5 font-medium'>
            {dateLabel(sub.currentPeriodStart)}
          </dd>
        </div>
      </dl>
      {sub.status === 'halted' && (
        <p className='mt-6 rounded-xl border border-border p-4 text-sm text-foreground/85'>
          Your last renewal payment failed, so Premium is paused. Subscribe
          again to continue watching.
        </p>
      )}
      <div className='mt-6 flex flex-wrap gap-3'>
        {!summary.entitled && (
          <Link
            to='/pricing'
            className='inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            Subscribe again <ArrowRight className='size-4' />
          </Link>
        )}
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type='button'
                disabled={cancelling}
                className='inline-flex h-11 items-center rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'
              >
                Cancel subscription
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  You won’t be charged again. You can keep watching Premium
                  titles until {dateLabel(sub.currentPeriodEnd)}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await cancel().unwrap()
                      toast.success(
                        'Cancelled. You keep access until the end of this period.'
                      )
                    } catch {
                      toast.error('That didn’t work. Please try again.')
                    }
                  }}
                >
                  Cancel subscription
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

function Payments({ payments }: { payments: BillingSummary['payments'] }) {
  return (
    <section
      className='rounded-2xl glass p-6 md:p-8'
      aria-labelledby='payments-heading'
    >
      <h2
        id='payments-heading'
        className='text-eyebrow font-semibold text-muted-foreground uppercase'
      >
        Payments
      </h2>
      {payments.length === 0 ? (
        <p className='mt-4 text-foreground/70'>No payments yet.</p>
      ) : (
        <table className='mt-4 w-full text-sm'>
          <thead className='text-left text-muted-foreground'>
            <tr>
              <th scope='col' className='pb-2 font-normal'>
                Date
              </th>
              <th scope='col' className='pb-2 font-normal'>
                Amount
              </th>
              <th scope='col' className='hidden pb-2 font-normal sm:table-cell'>
                Method
              </th>
              <th scope='col' className='pb-2 text-right font-normal'>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className='border-t border-border'>
                <td className='py-3'>{dateLabel(p.paidAt)}</td>
                <td className='py-3 tabular-nums'>
                  {formatRupees(p.amountPaise)}
                </td>
                <td className='hidden py-3 capitalize sm:table-cell'>
                  {p.method ?? 'Not recorded'}
                </td>
                <td className='py-3 text-right capitalize'>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/** /account (signed in): plan, status, renewal or end date, cancel, payment history, link to profile settings */
export function AccountPage() {
  useDocumentTitle('Your account')
  const user = useAppSelector(selectCurrentUser)
  const { data, isLoading, isError, refetch } = useGetBillingMeQuery()

  return (
    <>
      <BrowseHeader
        eyebrow='Account'
        title={user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Your account'}
      />
      <div className='grid shell gap-6 pb-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'>
        {isLoading ? (
          <>
            <div className='h-72 skeleton rounded-2xl' />
            <div className='h-72 skeleton rounded-2xl' />
          </>
        ) : isError || !data ? (
          <div className='py-12'>
            <p className='text-lg text-foreground/80'>
              Your account didn’t load.
            </p>
            <button
              type='button'
              onClick={() => refetch()}
              className='mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground'
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className='grid content-start gap-6'>
              <SubscriptionCard summary={data.data} />
              <div className='flex flex-wrap items-center justify-between gap-4 rounded-2xl glass p-6'>
                <div>
                  <p className='font-semibold'>{user?.name}</p>
                  <p className='text-sm text-muted-foreground'>{user?.email}</p>
                </div>
                <Link
                  to='/settings'
                  className='inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <Settings className='size-4' /> Profile settings
                </Link>
              </div>
            </div>
            <Payments payments={data.data.payments} />
          </>
        )}
      </div>
    </>
  )
}
