/*
 * Adapted from "Pricing Section with Monthly/Yearly Toggle" (ink-orbit-pricing) by kedhareswer on 21st.dev:
 * https://21st.dev/@kedhareswer/components/ink-orbit-pricing
 * Kept: the billing-period toggle with a sliding pill and a savings chip, prices that count to the new
 * amount when the period changes, the featured plan with corner brackets, the savings line and feature lists.
 * Changes: two cards (Free and Premium) fed by the server's plans instead of three hard-coded tiers and a
 * discount percentage; stream glass tokens and the accent gradient instead of its own palette, hatch and
 * fonts; the count runs on anime.js (written to the DOM, no React state per frame) instead of its own rAF
 * loop; reveal through our Stagger; reduced motion from useMotion(); real links and buttons for the CTAs.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { formatRupees, type BillingPlan, type PlanCode } from '@/types/billing'
import { animate } from 'animejs'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Stagger, useMotion } from '@/components/motion'

/** A price that counts from the old amount to the new one (anime.js), straight into the text node */
function PriceTicker({ paise }: { paise: number }) {
  const el = useRef<HTMLSpanElement>(null)
  const shown = useRef(paise)
  const { reduced } = useMotion()

  useEffect(() => {
    const node = el.current
    if (!node) return
    const counter = { value: shown.current }
    if (reduced || counter.value === paise) {
      shown.current = paise
      node.textContent = formatRupees(paise)
      return
    }
    const run = animate(counter, {
      value: paise,
      duration: 550,
      ease: 'outCubic',
      onUpdate: () => {
        shown.current = counter.value
        node.textContent = formatRupees(Math.round(counter.value / 100) * 100)
      },
    })
    return () => {
      run.cancel()
    }
  }, [paise, reduced])

  // React renders the first value only; every change after that is written by the effect above, so the new
  // price never flashes before the count starts
  const [initial] = useState(() => formatRupees(paise))
  return (
    <span ref={el} className='tabular-nums'>
      {initial}
    </span>
  )
}

function Corners() {
  const corner = 'pointer-events-none absolute size-3 border-foreground/40'
  return (
    <>
      <span
        aria-hidden='true'
        className={cn(corner, '-top-1.5 -left-1.5 border-t border-l')}
      />
      <span
        aria-hidden='true'
        className={cn(corner, '-top-1.5 -right-1.5 border-t border-r')}
      />
      <span
        aria-hidden='true'
        className={cn(corner, '-bottom-1.5 -left-1.5 border-b border-l')}
      />
      <span
        aria-hidden='true'
        className={cn(corner, '-right-1.5 -bottom-1.5 border-r border-b')}
      />
    </>
  )
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className='grid gap-2.5 border-t border-dashed border-border pt-5 text-sm'>
      {items.map((f) => (
        <li key={f} className='flex items-start gap-2.5'>
          <Check
            aria-hidden='true'
            className='mt-0.5 size-4 shrink-0 text-foreground/70'
          />
          {f}
        </li>
      ))}
    </ul>
  )
}

function Card({
  featured,
  children,
}: {
  featured?: boolean
  children: ReactNode
}) {
  return (
    <div className='relative flex'>
      {featured && <Corners />}
      <article
        className={cn(
          'relative flex flex-1 flex-col gap-5 rounded-2xl border p-6 transition-transform duration-500 ease-out-expo hover:-translate-y-1 motion-reduce:transition-none md:p-8',
          featured ? 'border-foreground/15 glass-strong' : 'border-border glass'
        )}
      >
        {children}
      </article>
    </div>
  )
}

/**
 * Free and Premium side by side, with a Monthly / Yearly switch for Premium. The price comes from the server's
 * plan list; choosing a plan calls `onChoose` (the page runs the checkout).
 */
export function PricingPlans({
  plans,
  savingPercent,
  billing,
  onBillingChange,
  onChoose,
  busy,
  entitled,
}: {
  plans: BillingPlan[]
  savingPercent: number
  billing: PlanCode
  onBillingChange: (billing: PlanCode) => void
  onChoose: (plan: PlanCode) => void
  busy: boolean
  entitled: boolean
}) {
  const monthly = plans.find((p) => p.code === 'monthly')
  const yearly = plans.find((p) => p.code === 'yearly')
  const chosen = billing === 'yearly' ? yearly : monthly
  if (!monthly || !yearly || !chosen) return null
  const yearlySaving = monthly.amountPaise * 12 - yearly.amountPaise

  return (
    <div>
      <div className='flex justify-center'>
        <div
          role='radiogroup'
          aria-label='Billing period'
          className='relative inline-grid grid-cols-2 rounded-full glass p-1'
        >
          <span
            aria-hidden='true'
            className='absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-transform duration-500 ease-out-expo motion-reduce:transition-none'
            style={{
              transform: billing === 'yearly' ? 'translateX(100%)' : 'none',
            }}
          />
          {(['monthly', 'yearly'] as const).map((code) => (
            <button
              key={code}
              type='button'
              role='radio'
              aria-checked={billing === code}
              onClick={() => onBillingChange(code)}
              className={cn(
                'relative z-10 flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                billing === code
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {code === 'monthly' ? 'Monthly' : 'Yearly'}
              {code === 'yearly' && savingPercent > 0 && (
                <span className='rounded-full border border-current px-1.5 text-[11px] leading-5'>
                  −{savingPercent}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Stagger
        className='mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2'
        step={90}
        y={24}
      >
        <Card>
          <div>
            <p className='font-semibold'>Free</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              A taste of the catalogue, no card needed.
            </p>
          </div>
          <p className='font-display text-5xl font-semibold tracking-tight'>
            {formatRupees(0)}
          </p>
          <p className='-mt-3 text-sm text-muted-foreground'>Always free</p>
          <Features
            items={[
              'Free movies, series and reality shows',
              'Watch without signing in',
              'Sign in to keep your place',
            ]}
          />
          <Link
            to='/browse/free'
            className='mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full glass px-6 font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
          >
            Browse free titles <ArrowRight className='size-4' />
          </Link>
        </Card>

        <Card featured>
          <div className='flex items-center justify-between gap-3'>
            <p className='font-semibold'>Premium</p>
            <span className='flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs'>
              <span
                aria-hidden='true'
                className='size-1.5 rounded-full bg-stream-gradient'
              />
              Everything
            </span>
          </div>
          <p className='-mt-3 text-sm text-muted-foreground'>
            Every movie, series and reality show.
          </p>
          <p className='flex items-baseline gap-2 font-display text-5xl font-semibold tracking-tight'>
            <PriceTicker paise={chosen.amountPaise} />
            <span className='font-sans text-base font-normal tracking-normal text-muted-foreground'>
              / {billing === 'yearly' ? 'year' : 'month'}
            </span>
          </p>
          <p
            className='-mt-3 min-h-5 text-sm text-muted-foreground'
            aria-live='polite'
          >
            {billing === 'yearly'
              ? `About ${formatRupees(Math.round(yearly.amountPaise / 12 / 100) * 100)} a month · save ${formatRupees(yearlySaving)} a year`
              : 'Billed monthly · cancel anytime'}
          </p>
          <Features items={chosen.features} />
          {entitled ? (
            <Link
              to='/account'
              className='mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            >
              You’re subscribed · Manage <ArrowRight className='size-4' />
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => onChoose(chosen.code)}
              disabled={busy || !chosen.available}
              className='mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-[opacity,transform] outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:opacity-60'
            >
              {busy ? (
                <Loader2 className='size-4 animate-spin motion-reduce:animate-none' />
              ) : null}
              {chosen.available
                ? `Subscribe ${billing === 'yearly' ? 'yearly' : 'monthly'}`
                : 'Coming soon'}
              {!busy && chosen.available && <ArrowRight className='size-4' />}
            </button>
          )}
        </Card>
      </Stagger>
    </div>
  )
}
