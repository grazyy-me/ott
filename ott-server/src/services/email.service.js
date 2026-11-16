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
