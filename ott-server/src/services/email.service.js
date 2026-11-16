// Flows from hagopj13/node-express-boilerplate (MIT); transport swapped from Nodemailer to Resend.
// Without RESEND_API_KEY (local dev) emails are printed to the console instead of sent.
import { Resend } from 'resend';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { renderEmail } from '../templates/email.js';

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

if (!resend) {
  logger.warn('RESEND_API_KEY not set: emails will be logged to the console instead of sent');
}

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!resend) {
    logger.info(
      `\n----- EMAIL (not sent) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n----------------------------`
    );
    return;
  }
  const { error } = await resend.emails.send({ from: config.email.from, to, subject, text, html });
  if (error) {
    // Resend returns errors instead of throwing
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

export const sendResetPasswordEmail = async (to, token) => {
  const url = `${config.clientUrl}/reset-password?token=${token}`;
  const minutes = config.jwt.resetPasswordExpirationMinutes;
  await sendEmail({
    to,
    subject: 'Reset your password',
    ...renderEmail({
      heading: 'Reset your password',
      body: `Someone asked to reset the password for this account. The link works for ${minutes} minutes.`,
      buttonLabel: 'Reset password',
      url,
      footer: "If you didn't ask for this, you can ignore this email. Your password won't change.",
    }),
  });
};

export const sendVerificationEmail = async (to, token) => {
  const url = `${config.clientUrl}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: 'Verify your email',
    ...renderEmail({
      heading: 'Verify your email',
      body: 'Confirm this address to finish setting up your account.',
      buttonLabel: 'Verify email',
      url,
      footer: "If you didn't create an account, you can ignore this email.",
    }),
  });
};

// ---------------------------------------------------------------- billing

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export const sendSubscriptionStartedEmail = async (user, planName) => {
  const { html, text } = renderEmail({
    heading: `Welcome to ${config.appName}`,
    body: `Hi ${user.name}, your ${planName} subscription is active. Every title is ready to watch.`,
    buttonLabel: 'Start watching',
    url: `${config.clientUrl}/`,
    footer: 'Manage your plan any time from your account page.',
  });
  await sendEmail({ to: user.email, subject: `Your ${config.appName} subscription is active`, text, html });
};

export const sendSubscriptionCancelledEmail = async (user, planName, accessUntil) => {
  const until = formatDate(accessUntil);
  const { html, text } = renderEmail({
    heading: 'Your subscription is cancelled',
    body: `Hi ${user.name}, your ${planName} subscription has been cancelled.${until ? ` You can keep watching until ${until}.` : ''}`,
    buttonLabel: 'See plans',
    url: `${config.clientUrl}/pricing`,
    footer: 'You can subscribe again whenever you like.',
  });
  await sendEmail({ to: user.email, subject: `Your ${config.appName} subscription is cancelled`, text, html });
};

export const sendPaymentFailedEmail = async (user, planName) => {
  const { html, text } = renderEmail({
    heading: 'We couldn’t renew your subscription',
    body: `Hi ${user.name}, the payment for your ${planName} subscription failed after several attempts, so access is paused. Update your payment method to continue.`,
    buttonLabel: 'Go to your account',
    url: `${config.clientUrl}/account`,
    footer: 'If you think this is a mistake, check with your bank or card provider.',
  });
  await sendEmail({ to: user.email, subject: `Payment failed for your ${config.appName} subscription`, text, html });
};
