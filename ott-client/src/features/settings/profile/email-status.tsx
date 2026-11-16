import type { User } from '@/types/api'
import { CircleCheck, Loader2, MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { useSendVerificationEmailMutation } from '@/features/auth/auth-api'

export function EmailStatus({ user }: { user: User }) {
  const [sendEmail, { isLoading, isSuccess }] =
    useSendVerificationEmailMutation()

  if (user.isEmailVerified) {
    return (
      <p className='flex items-center gap-2 text-sm'>
        <CircleCheck className='size-4 text-green-600' />
        {user.email} is verified.
      </p>
    )
  }

  async function onResend() {
    try {
      await sendEmail().unwrap()
      toast.success(`Verification email sent to ${user.email}`)
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <section className='grid gap-3 rounded-md border p-4 text-sm'>
      <p className='flex items-start gap-2'>
        <MailWarning className='mt-0.5 size-4 shrink-0 text-amber-600' />
        <span>
          {user.email} isn't verified yet. Open the link we emailed you, or send
          a new one.
        </span>
      </p>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='w-fit'
        disabled={isLoading || isSuccess}
        onClick={onResend}
      >
        {isLoading && <Loader2 className='animate-spin' />}
        {isSuccess ? 'Email sent' : 'Resend verification email'}
      </Button>
    </section>
  )
}
