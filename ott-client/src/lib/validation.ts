import { z } from 'zod'

/** Same rules as the server (server/src/validations/custom.validation.js) */
export const passwordSchema = z
  .string()
  .min(1, 'Enter a password.')
  .min(8, 'Use at least 8 characters.')
  .regex(/[a-zA-Z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one number.')

export const emailSchema = z.email({
  error: (iss) =>
    iss.input === '' ? 'Enter your email.' : 'Enter a valid email.',
})
