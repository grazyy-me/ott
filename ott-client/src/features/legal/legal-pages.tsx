import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { APP_NAME } from '@/lib/config'
import { useDocumentTitle } from '@/lib/use-document-title'
import { BrowseHeader } from '@/features/browse/browse-page'

/*
 * Drafts written from what the app does today; [TO DECIDE] marks the owner's open choices.
 * Have a lawyer review before taking real payments.
 */

const UPDATED = '17 November 2026'

function Draft() {
  return (
    <p
      role='note'
      className='rounded-2xl border border-border p-4 text-sm text-foreground/85'
    >
      <strong className='font-semibold'>Draft.</strong> This page describes how{' '}
      {APP_NAME} works today. It has not been reviewed by a lawyer, and items
      marked <strong>[TO DECIDE]</strong> still need the owner’s decision.
    </p>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='mt-10'>
      <h2 className='font-display text-2xl font-semibold'>{title}</h2>
      <div className='mt-3 space-y-3 text-base leading-relaxed text-foreground/85'>
        {children}
      </div>
    </section>
  )
}

function LegalLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  useDocumentTitle(title)
  return (
    <>
      <BrowseHeader
        eyebrow='Legal'
        title={title}
        description={`Last updated ${UPDATED}.`}
      />
      <article className='shell max-w-3xl pb-24'>
        <Draft />
        {children}
        <p className='mt-12 text-sm text-muted-foreground'>
          Related:{' '}
          <Link
            className='underline underline-offset-4 hover:text-foreground'
            to='/terms'
          >
            Terms of Service
          </Link>
          {' · '}
          <Link
            className='underline underline-offset-4 hover:text-foreground'
            to='/privacy'
          >
            Privacy Policy
          </Link>
          {' · '}
          <Link
            className='underline underline-offset-4 hover:text-foreground'
            to='/refunds'
          >
            Refunds and cancellation
          </Link>
        </p>
      </article>
    </>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title='Terms of Service'>
      <Section title='The service'>
        <p>
          {APP_NAME} streams movies, series and reality shows. A selection of
          titles is free to watch for everyone, including visitors without an
          account. Everything else needs an active Premium subscription.
        </p>
      </Section>
      <Section title='Your account'>
        <p>
          You can sign up with an email address and password, or with Google or
          GitHub. Keep your password private; you are responsible for activity
          on your account.
        </p>
      </Section>
      <Section title='Subscriptions and billing'>
        <p>
          Premium costs ₹199 a month or ₹1,999 a year. Payments are processed by
          Razorpay. A subscription renews automatically at the end of each
          period until you cancel it from your account page.
        </p>
        <p>
          When you cancel, you are not charged again and you keep Premium until
          the end of the period you already paid for. If a renewal payment fails
          and cannot be collected, Premium is paused until you subscribe again.
          See{' '}
          <Link className='underline underline-offset-4' to='/refunds'>
            Refunds and cancellation
          </Link>
          .
        </p>
      </Section>
      <Section title='Titles and information'>
        <p>
          Titles can be added or removed at any time. Title information and
          images come from The Movie Database (TMDB). This product uses the TMDB
          API but is not endorsed or certified by TMDB.
        </p>
      </Section>
      <Section title='Acceptable use'>
        <p>
          [TO DECIDE: what users may not do, for example sharing accounts or
          copying streams.]
        </p>
      </Section>
      <Section title='Liability, governing law and changes'>
        <p>
          [TO DECIDE: limitation of liability, the governing law and courts, and
          how changes to these terms are announced.]
        </p>
      </Section>
      <Section title='Contact'>
        <p>
          [TO DECIDE: a contact email address for questions about these terms.]
        </p>
      </Section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title='Privacy Policy'>
      <Section title='What we store'>
        <ul className='list-disc space-y-2 pl-5'>
          <li>
            Your account: name, email address, and a hashed password (never the
            password itself), or the account id from Google or GitHub if you
            sign in with them.
          </li>
          <li>
            What you watch: where you stopped in each title, which titles you
            watched, and the titles on your My List. This powers Continue
            Watching and recommendations.
          </li>
          <li>
            Your subscription: plan, status, period dates, and payment records
            (amount, date, Razorpay payment id).
          </li>
        </ul>
        <p>
          Card and UPI details are entered on Razorpay’s checkout and handled by
          Razorpay. {APP_NAME} never sees or stores them.
        </p>
      </Section>
      <Section title='Cookies and browser storage'>
        <p>
          One cookie keeps you signed in (an httpOnly sign-in token). The
          browser also stores a few preferences, such as your reduced-motion and
          theme settings. {APP_NAME} itself sets no advertising or tracking
          cookies. When a trailer plays, YouTube may store data under its own
          policy.
        </p>
      </Section>
      <Section title='Services we use'>
        <ul className='list-disc space-y-2 pl-5'>
          <li>Razorpay, for subscriptions and payments.</li>
          <li>Resend, to send account and subscription emails.</li>
          <li>Google and GitHub, only if you choose to sign in with them.</li>
          <li>
            YouTube (privacy-enhanced mode, youtube-nocookie.com), to play
            trailers.
          </li>
          <li>
            The Movie Database (TMDB), whose servers deliver title images.
          </li>
          <li>
            MongoDB Atlas, Render and Vercel, which host the data and the site.
          </li>
        </ul>
      </Section>
      <Section title='How long we keep data, and your choices'>
        <p>
          [TO DECIDE: how long data is kept, and how to ask for a copy or
          deletion of your account and its data.]
        </p>
      </Section>
      <Section title='Contact'>
        <p>[TO DECIDE: a contact email address for privacy questions.]</p>
      </Section>
    </LegalLayout>
  )
}

export function RefundsPage() {
  return (
    <LegalLayout title='Refunds and cancellation'>
      <Section title='Cancelling'>
        <p>
          Cancel any time from your{' '}
          <Link className='underline underline-offset-4' to='/account'>
            account page
          </Link>
          . You won’t be charged again, and Premium stays available until the
          end of the period you already paid for.
        </p>
      </Section>
      <Section title='Failed renewals'>
        <p>
          If a renewal payment fails, Razorpay retries it. While it retries you
          keep Premium. If it still can’t be collected, Premium is paused until
          you subscribe again.
        </p>
      </Section>
      <Section title='Refunds'>
        <p>
          [TO DECIDE: whether payments already made can be refunded, in which
          cases, and how to ask for one.]
        </p>
      </Section>
    </LegalLayout>
  )
}
