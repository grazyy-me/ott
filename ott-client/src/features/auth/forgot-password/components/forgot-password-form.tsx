import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck, Send } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { emailSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForgotPasswordMutation } from '@/features/auth/auth-api'

const formSchema = z.object({ email: emailSchema })

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [forgotPassword, { isLoading, isSuccess, originalArgs }] =
    useForgotPasswordMutation()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      await forgotPassword(data).unwrap()
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  }

  if (isSuccess) {
    return (
      <div role='status' className='flex gap-3 text-sm'>
        <MailCheck className='mt-0.5 size-5 shrink-0 text-muted-foreground' />
        <p>
          If <span className='font-medium'>{originalArgs?.email}</span> has an
          account, a reset link is on its way. The link expires after a few
          minutes. Check your spam folder if it doesn't arrive.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  autoComplete='email'
                  placeholder='name@example.com'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p role='alert' className='text-sm text-destructive'>
            {form.formState.errors.root.message}
          </p>
        )}
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <Send />}
          Send reset link
        </Button>
      </form>
    </Form>
  )
}
