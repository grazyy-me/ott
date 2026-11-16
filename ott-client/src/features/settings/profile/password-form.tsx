import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { User } from '@/types/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { passwordSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { useUpdateMeMutation } from '@/features/user/user-api'

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

type Values = z.infer<typeof schema>

/** Accounts created with Google/GitHub can add a password here to also sign in with email */
export function PasswordForm({ user }: { user: User }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit({ password }: Values) {
    try {
      await updateMe({ password }).unwrap()
      form.reset()
      toast.success(user.hasPassword ? 'Password changed' : 'Password added')
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <section className='grid gap-4'>
      <div>
        <h4 className='font-medium'>
          {user.hasPassword ? 'Change password' : 'Add a password'}
        </h4>
        {!user.hasPassword && (
          <p className='text-sm text-muted-foreground'>
            You signed up with Google or GitHub. Add a password to also sign in
            with your email.
          </p>
        )}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete='new-password' {...field} />
                </FormControl>
                <FormDescription>
                  At least 8 characters, with a letter and a number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='confirmPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete='new-password' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' className='w-fit' disabled={isLoading}>
            {isLoading && <Loader2 className='animate-spin' />}
            {user.hasPassword ? 'Change password' : 'Add password'}
          </Button>
        </form>
      </Form>
    </section>
  )
}
